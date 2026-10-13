const assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm'),ts=require('typescript');
const c='12345678-1234-1234-1234-123456789abc', g='87654321-4321-4321-4321-cba987654321';
let adminRole='admin',profileRole='coach',banned=false,change=true,fileExists=true,storageError=false;
let proof={coach_id:c,cert_name:'CPR',file_path:c+'/proof.jpg',status:'pending'};
let calls=[],payloads=[];
function chain(table){let op='select',payload,filters=[];const q=new Proxy({}, {get(_,key){if(key==='then')return(yes,no)=>Promise.resolve().then(()=>{
 calls.push({table,op,filters,payload});
 if(table==='admin_users')return {data:{role:adminRole},error:null};
 if(table==='profiles')return {data:{role:profileRole,is_banned:banned},error:null};
 if(table==='cert_verifications'){
  if(op==='select')return {data:{...proof},error:null};
  const owns=filters.every(([k,v])=>k==='id'||proof[k]===v);
  return owns&&change?{data:{coach_id:c,cert_name:'CPR'},error:null}:{data:null,error:{message:'Submission changed'}};
 }
 if(op==='upsert')payloads.push(payload);
 return {data:op==='update'?(change?[{user_id:c}]:[]):null,error:null};
}).then(yes,no);return(...args)=>{if(['select','upsert','update','insert'].includes(key)){if(key!=='select')op=key;payload=args[0];}else if(key==='eq')filters.push(args);return q;};}});return q;}
const service={from:chain,rpc:async name=>{calls.push({rpc:name});return {error:null};},storage:{from:()=>({list:async()=>({data:fileExists?[{id:'object',name:'proof.jpg'}]:[],error:storageError?{message:'storage failure'}:null})})}};
function load(file,mocks){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,process,Date,Error,console,require:name=>mocks[name]??{}},{filename:file});return exports;}
const cert=load('lib/certificate-proof.ts',{});
const actions=load('lib/actions.ts',{'@/lib/certificate-proof':cert,'next/headers':{cookies:async()=>({getAll:()=>[]})},'@supabase/ssr':{createServerClient:()=>({auth:{getUser:async()=>({data:{user:{id:g}}})}})},'@/lib/supabase-server':{createServiceClient:()=>service},'next/cache':{revalidatePath(){}},'@/lib/account-media':{removeUserMedia:async()=>{calls.push({media:true});}}});
(async()=>{
 for(const role of ['coach','client']){profileRole=role;calls=[];assert.equal((await actions.giftPro(c,30)).error,null);assert.equal(new Date(payloads.at(-1).expires_at)-new Date(payloads.at(-1).granted_at),30*86400000);assert(!calls.some(x=>x.table==='subscriptions'));}
 for(const value of [0,-1,366,1.5,NaN]){calls=[];assert((await actions.giftPro(c,value)).error);assert(!calls.some(x=>x.table==='admin_access'));}
 banned=true;assert((await actions.giftPro(c,7)).error);banned=false;
 calls=[];assert.equal((await actions.revokePro(c)).error,null);assert(!calls.some(x=>x.table==='subscriptions'));
 change=false;calls=[];assert((await actions.revokePro(c)).error);assert(!calls.some(x=>x.table==='admin_audit_log'));change=true;
 adminRole='support';await assert.rejects(actions.giftPro(c,7),/Not authorized/);await assert.rejects(actions.revokePro(c),/Not authorized/);await assert.rejects(actions.reviewCert('cert','approved'),/Not authorized/);adminRole='moderator';
 assert.equal((await actions.reviewCert('cert','approved')).error,null);
 proof.file_path=g+'/proof.jpg';calls=[];assert((await actions.reviewCert('cert','approved')).error);assert(!calls.some(x=>x.table==='cert_verifications'&&x.op==='update'));
 assert.equal((await actions.reviewCert('cert','rejected','Upload your own proof')).error,null);
 proof.file_path=c+'/proof.jpg';fileExists=false;assert((await actions.reviewCert('cert','approved')).error);fileExists=true;storageError=true;assert((await actions.reviewCert('cert','approved')).error);storageError=false;
 change=false;assert((await actions.reviewCert('cert','approved')).error);change=true;
 proof.status='approved';assert((await actions.reviewCert('cert','approved')).error);
 for(const path of [g+'/proof.jpg',c+'/../file.jpg',c+'/proof%2F.jpg',c+'/nested/file.jpg',c+'//file.jpg'])assert(!cert.validCertificatePath(path,c));
 assert(cert.validCertificatePath(c+'/proof.jpg',c));
 console.log('PASS: independent gifts for both roles, durations, admin permissions, row confirmation, owned/existing proof, invalid legacy proof rejection and concurrent-review guards');
})().catch(e=>{console.error(e);process.exitCode=1});
