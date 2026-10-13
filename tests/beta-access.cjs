const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
let role='admin', targetRole='coach', banned=false, failure=null, profileFailure=null, changed=true;
let calls=[], grants=[];
const service={from(table){
  calls.push(table);
  if(table==='admin_users')return {select(){return this},eq(){return this},async maybeSingle(){return {data:{role}}}};
  if(table==='profiles')return {select(){return this},eq(){return this},async single(){return {data:{role:targetRole,is_banned:banned},error:profileFailure}}};
  if(table==='beta_access')return {
    async upsert(payload,options){grants.push(payload);assert.equal(options.onConflict,'user_id');return {error:failure}},
    update(payload){assert(payload.revoked_at);return this},eq(key,value){assert.equal(key,'user_id');assert.equal(value,'tester');return this},is(key,value){assert.equal(key,'revoked_at');assert.equal(value,null);return this},async select(){return {data:changed?[{user_id:'tester'}]:[],error:failure}},
  };
  if(table==='admin_audit_log')return {async insert(){return {error:null}}};
  throw Error('Unexpected table '+table);
}};
const context={exports:{},process:{env:{}},Error,require:name=>({
  'next/headers':{cookies:async()=>({getAll:()=>[]})},
  '@supabase/ssr':{createServerClient:()=>({auth:{getUser:async()=>({data:{user:{id:'admin-id'}}})}})},
  '@/lib/supabase-server':{createServiceClient:()=>service},
  'next/cache':{revalidatePath:path=>calls.push(path)},
}[name]??{})};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
const {grantBetaAccess,revokeBetaAccess}=context.exports;
(async()=>{
  for(const value of ['coach','client']){
    targetRole=value;calls=[];const r=await grantBetaAccess('tester');assert.equal(r.error,null);
    const grant=grants.at(-1);assert.equal(grant.user_id,'tester');assert.equal(grant.granted_by,'admin-id');assert.equal(grant.revoked_at,null);
    assert.equal(new Date(grant.expires_at)-new Date(grant.granted_at),7*86400000);
    assert(calls.includes('admin_audit_log'));assert(!calls.includes('subscriptions'));
  }
  for(const value of ['support','moderator']){role=value;calls=[];await assert.rejects(grantBetaAccess('tester'),/Not authorized/);await assert.rejects(revokeBetaAccess('tester'),/Not authorized/);assert(!calls.includes('beta_access'))}
  role='admin';banned=true;calls=[];assert((await grantBetaAccess('tester')).error);assert(!calls.includes('beta_access'));banned=false;
  targetRole='unexpected';calls=[];assert((await grantBetaAccess('tester')).error);assert(!calls.includes('beta_access'));targetRole='coach';
  profileFailure={message:'Profile unavailable'};calls=[];assert.equal((await grantBetaAccess('tester')).error,'Profile unavailable');assert(!calls.includes('beta_access'));profileFailure=null;
  failure={message:'Database failure'};calls=[];assert.equal((await grantBetaAccess('tester')).error,'Database failure');assert(!calls.includes('admin_audit_log'));failure=null;
  calls=[];assert.equal((await revokeBetaAccess('tester')).error,null);assert(calls.includes('admin_audit_log'));assert(!calls.includes('subscriptions'));
  changed=false;calls=[];assert.match((await revokeBetaAccess('tester')).error,/no beta grant/);assert(!calls.includes('admin_audit_log'));
  console.log('PASS: approval-only 7-day grants, both roles, admin authorization, ban/profile failures, independent revocation and no billing writes');
})().catch(e=>{console.error(e);process.exitCode=1});
