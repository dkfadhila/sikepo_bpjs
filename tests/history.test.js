import test from 'node:test';
import assert from 'node:assert/strict';
import { compactHistorical,expandHistorical,historicalId,createHistoryStore } from '../server/history-store.js';
import { assessClaim } from '../server/claims.js';
import { createApp } from '../server/app.js';
import { sessionHash } from '../server/security.js';

test('historical compact storage preserves source fields and assessment',()=>{
 const c={id:'SYN-2019-00000004',episodeId:'SYN-EP-00000004',date:'2019-06-13',synthetic:true,facilityId:1489,region:7,type:'A',icd:'I63.9',tariff:17155000,amount:14344000,invoiceTotal:14344000,normalLos:9,los:9,serviceCount:23,documentedServiceCount:23,restrictedDrug:true,drugEvidence:false,duplicateCount:1,injectedScenario:'drug_evidence'};
 const r=expandHistorical(compactHistorical(c));
 for(const k of ['id','episodeId','date','amount','tariff','invoiceTotal','los','normalLos','serviceCount','documentedServiceCount','restrictedDrug','drugEvidence','duplicateCount','icd'])assert.equal(r[k],c[k],k);
 assert.deepEqual(r.ml,assessClaim(c).ml);assert.equal(r.status,assessClaim(c).status);assert(!('injectedScenario' in r));
 assert.equal(historicalId('SYN-2026-00000001'),null);assert.equal(historicalId(c.id).id,4);
});
test('historical API rejects out-of-range years and cursors',async()=>{
 const store=createHistoryStore({collection:()=>({})});
 await assert.rejects(store.list({year:2026}),{status:400});await assert.rejects(store.list({year:2020,after:-1}),{status:400});
});
test('historical records require a session and review rights remain enforced',async t=>{
 const token='a'.repeat(64),csrf='b'.repeat(64);let role='AU',reviews=0;
 const db={collection:()=>({findOne:async q=>q.tokenHash===sessionHash(token)?{user:{role,email:'reviewer@example.invalid'},csrf}:null})};
 const historyStore={list:async()=>({year:2019,claims:[]}),get:async id=>({id}),review:async(id,r)=>{reviews++;return {id,status:r.status};}};
 const config={production:false,appOrigin:'http://localhost:7731',dashboardOrigin:'http://localhost:7731'};
 const server=createApp({db,config,claimStore:{},historyStore}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>server.close());
 const base=`http://127.0.0.1:${server.address().port}`,cookie=`sikepo_session=${token}`;
 assert.equal((await fetch(base+'/api/history?year=2019')).status,401);
 assert.equal((await fetch(base+'/api/history?year=2019',{headers:{Cookie:cookie}})).status,200);
 const send=()=>fetch(base+'/api/claims/SYN-2019-00000004/review',{method:'POST',headers:{Origin:config.appOrigin,Cookie:cookie,'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({status:'HOLD',note:'Perlu pemeriksaan bukti.',version:0})});
 assert.equal((await send()).status,403);role='VK';assert.equal((await send()).status,200);assert.equal(reviews,1);
});
