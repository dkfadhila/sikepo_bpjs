import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';
import { sessionHash } from '../server/security.js';
import { criteria, summarize } from '../server/claim-store.js';

test('review requires authorized human role, CSRF, reason and optimistic version',async t=>{
  const token='a'.repeat(64),csrf='b'.repeat(64);let role='AU',version=0,calls=0;
  const db={collection:()=>({findOne:async q=>q.tokenHash===sessionHash(token)?{user:{email:'reviewer@example.invalid',role},csrf}:null})};
  const claimStore={review:async(id,review,actor)=>{calls++;assert.equal(actor.role,'VK');if(review.version!==version)return null;version++;return {id,status:review.status,reviewVersion:version};}};
  const config={production:false,appOrigin:'http://localhost:7731',dashboardOrigin:'http://localhost:7731'};
  const server=createApp({db,config,claimStore}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>server.close());
  const send=(body,csrfHeader=csrf)=>fetch(`http://127.0.0.1:${server.address().port}/api/claims/SYN-2512-00001/review`,{method:'POST',headers:{Origin:config.appOrigin,Cookie:`sikepo_session=${token}`,'Content-Type':'application/json','X-CSRF-Token':csrfHeader},body:JSON.stringify(body)});
  const body={status:'APPROVED',note:'Bukti sintetis telah ditelaah.',version:0};
  assert.equal((await send(body)).status,403);role='ST';assert.equal((await send(body)).status,403);role='VK';
  assert.equal((await send(body,'wrong')).status,403);
  assert.equal((await send({...body,note:'short'})).status,400);
  assert.equal((await send({...body,automatic:true})).status,400);assert.equal(calls,0);
  assert.equal((await send(body)).status,200);assert.equal(version,1);
  assert.equal((await send(body)).status,409);assert.equal(version,1);
});
test('query filters escape regex input and aggregate actual decisions',()=>{
  assert.equal(criteria({search:'.*'}).$or[0].id.$regex,'\\.\\*');
  assert.equal(criteria({status:'$ne'}).status,undefined);
  const r=summarize([{amount:200,tariff:100,score:80,status:'HOLD',daysAgo:0},{amount:100,tariff:100,score:10,status:'APPROVED',daysAgo:6}],7);
  assert.equal(r.count,2);assert.equal(r.hold,1);assert.equal(r.high,1);assert.equal(r.amount,300);assert.equal(r.buckets.reduce((n,b)=>n+b.reviewed,0),1);
});
