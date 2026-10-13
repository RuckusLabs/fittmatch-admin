const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function compile(source, requireMock = () => ({})) {
  const context = { exports: {}, require: requireMock, console, Error };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return context.exports;
}
const { removeUserMedia } = compile(fs.readFileSync('lib/account-media.ts', 'utf8'));
async function main() {
  const objects = new Map([
    ['profile-photos', new Set(Array.from({length:1005},(_,i)=>`coach/person/photo-${i}`).concat(['coach/person/nested/image','client/person/logo','coach/other/keep']))],
    ['cert-docs', new Set(['person/license','other/keep'])],
    ['coach-videos', new Set(['person/video','other/keep'])],
    ['chat-media', new Set(['match1/person/image','match1/peer/image','match1001/peer/image','unrelated/keep'])],
  ]);
  const matchPages = [], removes = [];
  const client = {
    storage: { from: bucket => ({
      list: async (prefix,{limit}) => {
        const entries = new Map();
        for (const path of objects.get(bucket)) if (path.startsWith(prefix+'/')) {
          const parts=path.slice(prefix.length+1).split('/');
          entries.set(parts[0], { name:parts[0], id:parts.length===1?'file':null });
        }
        return {data:[...entries.values()].sort((a,b)=>a.name.localeCompare(b.name)).slice(0,limit),error:null};
      },
      remove: async paths => { removes.push(paths.length); paths.forEach(p=>objects.get(bucket).delete(p)); return {error:null}; },
    }) },
    from: table => { assert.equal(table,'matches'); return {
      select() {return this}, or(value) {assert.equal(value,'coach_id.eq.person,client_id.eq.person');return this}, order() {return this},
      async range(start,end) {matchPages.push([start,end]);return {data:Array.from({length:1001},(_,i)=>({id:`match${i+1}`})).slice(start,end+1),error:null};},
    } },
  };
  await removeUserMedia(client,'person');
  assert.deepEqual(matchPages,[[0,999],[1000,1999]]);
  assert(removes.every(n=>n<=1000));
  for (const [bucket, paths] of objects) assert.deepEqual([...paths], [bucket==='profile-photos'?'coach/other/keep':bucket==='chat-media'?'unrelated/keep':'other/keep']);

  // Execute the real server action with authorization/storage/auth boundaries mocked.
  const calls=[];let storageFailure=false,authorized=true,deleteFailure=false;
  const service = {
    rpc: async name => {assert.equal(name,'begin_account_deletion');calls.push('retire');return {error:null}},
    from: table => table==='admin_users'?{select(){return this},eq(){return this},maybeSingle:async()=>({data:{role:authorized?'admin':'support'}})}:
      { insert:async()=>{calls.push('audit');return {error:null}} },
    auth:{admin:{deleteUser:async()=>{calls.push('delete');return {error:deleteFailure?{message:'Auth failed'}:null}}}},
  };
  // Environment access happens inside requireAdmin.
  // Add process via global in source rather than exposing real credentials.
  const src = 'const process = {env:{}};\n'+fs.readFileSync('lib/actions.ts','utf8');
  const tested = compile(src, name => ({
    'next/headers':{cookies:async()=>({getAll:()=>[]})},
    '@supabase/ssr':{createServerClient:()=>({auth:{getUser:async()=>({data:{user:{id:'admin'}}})}})},
    'next/cache':{revalidatePath:()=>calls.push('refresh')},
    '@/lib/supabase-server':{createServiceClient:()=>service},
    '@/lib/account-media':{removeUserMedia:async()=>{calls.push('cleanup');if(storageFailure)throw new Error('Storage failed')}},
  }[name]??{}));
  let result=await tested.deleteUser('person','qa@example.invalid');assert.equal(result.error,null);assert.deepEqual(calls,['retire','cleanup','delete','audit','refresh']);
  calls.length=0;storageFailure=true;result=await tested.deleteUser('person','qa@example.invalid');assert.match(result.error,/Storage failed/);assert.deepEqual(calls,['retire','cleanup']);
  calls.length=0;storageFailure=false;deleteFailure=true;result=await tested.deleteUser('person','qa@example.invalid');assert.equal(result.error,'Auth failed');assert.deepEqual(calls,['retire','cleanup','delete']);
  calls.length=0;authorized=false;await assert.rejects(tested.deleteUser('person','qa@example.invalid'),/Not authorized/);assert.deepEqual(calls,[]);
  console.log('PASS: recursive/batched account media cleanup, match pagination, unrelated media preserved, admin authorization and failure ordering');
}
main().catch(e=>{console.error(e);process.exitCode=1});
