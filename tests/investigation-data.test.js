import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';
import { assessedClaims } from '../server/claims.js';
import { sessionHash } from '../server/security.js';

test('AI accepts only a dataset ID and resolves the known synthetic record on the server', async t => {
  const token='a'.repeat(64), csrf='b'.repeat(64), received=[];
  const db={collection(name){
    if(name==='sessions')return {findOne:async q=>q.tokenHash===sessionHash(token)?{user:{role:'VK'},csrf}:null};
    if(name==='ai_budget')return {updateOne:async()=>{},findOneAndUpdate:async()=>({count:1})};
    throw new Error('Unexpected collection');
  }};
  const config={production:false,appOrigin:'http://localhost:7731',dashboardOrigin:'http://localhost:7731',googleKey:'configured',aiDailyLimit:20};
  const app=createApp({db,config,claimStore:{get:async id=>assessedClaims.find(c=>c.id===id)},investigate:async c=>{received.push(c);return {summary:'Indikator perlu diverifikasi.',checks:['Cocokkan rincian layanan.']};}});
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>server.close());
  const send=body=>fetch(`http://127.0.0.1:${server.address().port}/api/investigate`,{method:'POST',headers:{Cookie:`sikepo_session=${token}`,Origin:config.appOrigin,'X-CSRF-Token':csrf,'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await send({id:'SYN-2512-00001',patientName:'must not be forwarded'})).status,400);
  assert.equal((await send({id:'SYN-2512-99999'})).status,404);
  assert.equal(received.length,0);
  assert.equal((await send({id:'SYN-2512-00001'})).status,200);
  assert.deepEqual(Object.keys(received[0]).sort(),['id','amount','tariff','los','normalLos','score','signals','mlAnomaly','recommendation'].sort());
  assert(received[0].score>=0);
  assert(['REQUEST_EVIDENCE','READY_FOR_VERIFIER'].includes(received[0].recommendation));
});
