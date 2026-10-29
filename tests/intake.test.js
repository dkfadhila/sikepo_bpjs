import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {intakeSchema,createIntake} from '../server/intake.js';
import {assessClaim} from '../server/claims.js';
import {explainClaim,routeClaim} from '../server/workflow.js';
import {createApp} from '../server/app.js';
import {sessionHash} from '../server/security.js';

const input=()=>({requestId:randomUUID(),dataClass:'SYNTHETIC',date:'2025-12-31',facilityCode:'TEST01',episodeKey:'EP-TEST01',icd:'J18.9',amount:15000000,tariff:6000000,invoiceTotal:15000000,los:8,normalLos:4,restrictedDrug:false,drugEvidence:true,serviceCount:3,documentedServiceCount:3,duplicateCount:1});
test('intake rejects identifiers, real data declarations, invalid dates and unsupported values',()=>{
 const good=input();assert(intakeSchema.safeParse(good).success);
 for(const bad of [{...good,name:'Someone'},{...good,nik:'123456'},{...good,dataClass:'REAL'},{...good,date:'2026-01-01'},{...good,date:'2025-02-30'},{...good,tariff:0},{...good,amount:-1},{...good,facilityCode:'Hospital real name'}])assert.equal(intakeSchema.safeParse(bad).success,false);
});
test('routes preserve review authority and explanation measurements come from claim, not generated text',()=>{
 const normal=assessClaim({...input(),id:'SYN-IN-0123456789abcdef',amount:6000000,invoiceTotal:6000000,los:4});
 assert.equal(routeClaim(normal).code,'READY_FOR_REVIEW');
 const anomaly=assessClaim({...input(),id:'SYN-IN-0123456789abcdef',duplicateCount:2});
 assert.equal(routeClaim(anomaly).code,'INVESTIGATE');
 const r=explainClaim(anomaly,{summary:'Ringkasan hasil model.',checks:[],model:'NALAR-4B'});
 assert.equal(r.measurements.costRatio,2.5);assert.equal(r.ml.rawScore,anomaly.ml.rawScore);assert.equal(r.requiresHumanDecision,true);
 assert(r.findings.every(f=>f.evidence&&f.action));assert.equal(anomaly.status,'HOLD');
});
function memoryDb(){let row,budget=0;return {get row(){return row},get budget(){return budget},collection(name){
 if(name==='ai_budget')return {updateOne:async()=>{},findOneAndUpdate:async q=>budget<q.count.$lt?{count:++budget}:null};
 return {createIndex:async()=>{},findOne:async()=>row,
  async findOneAndUpdate(q,u){
   if(u.$setOnInsert){row||={_id:'one',...structuredClone(u.$setOnInsert)};return structuredClone(row);}
   if(!row)return null;
   const available=['queued','deferred'].includes(row.pipeline.state)&&row.pipeline.nextAt<=new Date()||row.pipeline.state==='processing'&&row.pipeline.leaseUntil<new Date();
   if(!available)return null;
   Object.assign(row.pipeline,{state:u.$set['pipeline.state'],lease:u.$set['pipeline.lease'],leaseUntil:u.$set['pipeline.leaseUntil'],attempts:row.pipeline.attempts+1});return structuredClone(row);
  },async updateOne(q,u){if(row.pipeline.lease!==q['pipeline.lease'])return;for(const [k,v]of Object.entries(u.$set||{}))row.pipeline[k.split('.')[1]]=v;for(const [k,v]of Object.entries(u.$inc||{}))row.pipeline[k.split('.')[1]]+=v;for(const k of Object.keys(u.$unset||{}))delete row.pipeline[k.split('.')[1]];},
 };
 }};}
const settle=async db=>{for(let i=0;i<100&&db.row?.pipeline.state==='processing';i++)await new Promise(r=>setImmediate(r));};
test('new intake is idempotent and durable automated analysis never changes the review decision',async()=>{
 const db=memoryDb();let calls=0;
 const service=createIntake({db,config:{nalarEnabled:true,aiDailyLimit:2},investigate:async c=>{calls++;assert.match(c.id,/^SYN-IN-/);return {summary:'Temuan model perlu diperiksa.',checks:['rincian biaya'],model:'NALAR-4B'};}});
 const body=input(),actor={email:'verifier@example.invalid',role:'VK'};
 const first=await service.submit(body,actor);await settle(db);assert.equal(db.row.pipeline.state,'completed');assert.equal(db.row.status,'HOLD');
 assert.equal(db.row.pipeline.explanation.measurements.costRatio,2.5);assert.equal(db.row.reviewVersion,0);
 assert.equal((await service.submit(body,actor)).id,first.id);await settle(db);assert.equal(calls,1);assert.equal(db.budget,1);
 await assert.rejects(service.submit({...body,amount:100},actor),/Request ID/);service.stop();
});
test('exhausted AI budget defers NALAR while retaining completed rule and ML assessments',async()=>{
 const db=memoryDb();let calls=0;const service=createIntake({db,config:{nalarEnabled:true,aiDailyLimit:0},investigate:async()=>{calls++;}});
 await service.submit(input(),{email:'verifier@example.invalid'});await settle(db);
 assert.equal(db.row.pipeline.state,'deferred');assert.equal(db.row.pipeline.attempts,0);assert.equal(calls,0);assert(db.row.ml);assert(db.row.pipeline.nextAt>new Date());service.stop();
});
test('transient NALAR failures are retried at most three times without approving or rejecting',async()=>{
 const db=memoryDb();let calls=0;const service=createIntake({db,config:{nalarEnabled:true,aiDailyLimit:20},investigate:async()=>{calls++;throw Error('upstream unavailable');}});
 await service.submit(input(),{email:'test@example.invalid'});await settle(db);
 assert.equal(db.row.pipeline.state,'deferred');
 for(let i=0;i<2;i++){db.row.pipeline.nextAt=new Date(0);await service.tick();}
 assert.equal(db.row.pipeline.state,'failed');assert.equal(calls,3);assert.equal(db.row.status,'HOLD');assert.equal(db.row.reviewVersion,0);service.stop();
});
test('intake endpoint enforces session, CSRF, role and schema before persisting',async t=>{
 const token='a'.repeat(64),csrf='b'.repeat(64);let role='AU',calls=0;
 const db={collection:()=>({findOne:async q=>q.tokenHash===sessionHash(token)?{user:{role,email:'test@example.invalid'},csrf}:null})};
 const config={production:false,appOrigin:'http://localhost:7731',dashboardOrigin:'http://localhost:7731'};
 const server=createApp({db,config,claimStore:{},intake:{submit:async()=>{calls++;return {id:'new'};}}}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>server.close());
 const send=(body,header=csrf)=>fetch(`http://127.0.0.1:${server.address().port}/api/claims`,{method:'POST',headers:{Cookie:`sikepo_session=${token}`,Origin:config.appOrigin,'X-CSRF-Token':header,'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await send(input())).status,403);role='VK';assert.equal((await send(input(),'wrong')).status,403);assert.equal((await send({...input(),nik:'123'})).status,400);assert.equal(calls,0);assert.equal((await send(input())).status,202);assert.equal(calls,1);
});
