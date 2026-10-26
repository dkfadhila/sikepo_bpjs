import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
test('dashboard proxy keeps sessions private and forwards only to the fixed Render origin',async()=>{
  let handler,seen;
  const context=vm.createContext({URL,Request,Response,Headers,addEventListener:(_type,fn)=>handler=fn,fetch:async(request)=>{seen=request;return new Response('private',{headers:{'Cache-Control':'public, max-age=3600'}});}});
  vm.runInContext(await readFile('cloudflare/dashboard-proxy.js','utf8'),context);
  const invoke=async request=>{let result;handler({request,respondWith:p=>result=p});return result;};
  const result=await invoke(new Request('https://dashboard.sikepo.tech/',{headers:{Cookie:'sikepo_session=test-session','X-Forwarded-Host':'evil.example'}}));
  assert.equal(seen.url,'https://sikepo.onrender.com/dashboard/');
  assert.equal(seen.headers.get('cookie'),'sikepo_session=test-session');
  assert.equal(seen.headers.get('x-forwarded-host'),null);
  assert.equal(result.headers.get('cache-control'),'no-store');
  assert.equal((await invoke(new Request('https://wrong.example/'))).status,404);
  assert.equal((await invoke(new Request('https://dashboard.sikepo.tech/login'))).headers.get('location'),'https://sikepo.tech/login');
});
