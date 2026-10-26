import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';
import { hashPassword, verifyPassword, newToken, sessionHash } from '../server/security.js';

test('password hashes are salted and compare safely', async()=>{
  const a=await hashPassword('examplePassword!'),b=await hashPassword('examplePassword!');
  assert.notEqual(a,b);assert.equal(await verifyPassword('examplePassword!',a),true);
  assert.equal(await verifyPassword('incorrect',a),false);assert.equal(await verifyPassword('x','corrupt'),false);
  assert.notEqual(newToken(),newToken());assert.equal(sessionHash('abc').length,64);
});

test('login, origin protection, private dashboard, session rotation, roles and logout', async t=>{
  const sessions=[],user={email:'auditor@demo.sikepo.tech',name:'Auditor demo',role:'AU',demo:true,passwordHash:await hashPassword('SikepoDemo!2026')};
  const db={collection(name){if(name==='users')return{findOne:async q=>q.email===user.email?user:null};if(name==='sessions')return{
    findOne:async q=>sessions.find(s=>s.tokenHash===q.tokenHash&&s.expiresAt>q.expiresAt.$gt)||null,
    insertOne:async s=>sessions.push(s),deleteOne:async q=>{const i=sessions.findIndex(s=>s.tokenHash===q.tokenHash);if(i>=0)sessions.splice(i,1);}
  };throw new Error('Unexpected database operation');}};
  const config={production:false,appOrigin:'http://localhost:7731',dashboardOrigin:'http://localhost:7731',dummyPasswordHash:await hashPassword('dummy'),aiDailyLimit:20,googleKey:'configured'};
  const app=createApp({db,config,investigate:async()=>{throw new Error('Auditor must not call AI');}});
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>server.close());
  const origin=`http://127.0.0.1:${server.address().port}`;
  const req=(url,init={})=>fetch(origin+url,{redirect:'manual',...init});
  for(const url of ['/dashboard/','/dashboard/index.html','/dashboard/dashboard.js']){const res=await req(url);assert.equal(res.status,302,url);assert.equal(res.headers.get('location'),'http://localhost:7731/login');}
  for(const url of ['/%64ashboard/index.html','/dash%62oard/dashboard.js','/%64ashboard%2findex.html']){const res=await req(url);assert.notEqual(res.status,200,url);}
  assert.equal((await req('/api/auth/me')).status,401);
  assert.equal((await req('/login')).status,200);
  const login=(email,password,originHeader='http://localhost:7731',cookie)=>req('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:originHeader,...(cookie?{Cookie:cookie}:{})},body:JSON.stringify({email,password})});
  assert.equal((await login(user.email,'SikepoDemo!2026','https://evil.example')).status,403);
  assert.equal((await login(user.email,'wrong')).status,401);
  assert.equal((await login('missing@demo.sikepo.tech','SikepoDemo!2026')).status,401);
  const success=await login(user.email,'SikepoDemo!2026');assert.equal(success.status,200);
  const cookie=success.headers.get('set-cookie').split(';')[0];assert.match(success.headers.get('set-cookie'),/HttpOnly/i);
  const body=await success.json();assert.equal(body.user.role,'AU');assert.equal(body.user.passwordHash,undefined);
  assert.equal((await req('/dashboard/',{headers:{Cookie:cookie}})).status,200);
  const identity=await(await req('/api/auth/me',{headers:{Cookie:cookie}})).json();
  const postHeaders={Cookie:cookie,Origin:'http://localhost:7731','X-CSRF-Token':identity.csrf,'Content-Type':'application/json'};
  assert.equal((await req('/api/investigate',{method:'POST',headers:postHeaders,body:'{}'})).status,403);
  assert.equal((await req('/api/auth/logout',{method:'POST',headers:{...postHeaders,'X-CSRF-Token':'wrong'}})).status,403);
  const rotated=await login(user.email,'SikepoDemo!2026',undefined,cookie);assert.equal(rotated.status,200);
  assert.equal((await req('/api/auth/me',{headers:{Cookie:cookie}})).status,401);
  const nextCookie=rotated.headers.get('set-cookie').split(';')[0];
  const nextIdentity=await(await req('/api/auth/me',{headers:{Cookie:nextCookie}})).json();
  assert.equal((await req('/api/auth/logout',{method:'POST',headers:{Cookie:nextCookie,Origin:'http://localhost:7731','X-CSRF-Token':nextIdentity.csrf}})).status,200);
  assert.equal((await req('/api/auth/me',{headers:{Cookie:nextCookie}})).status,401);
  assert.equal(sessions.length,0);
});
