import test from 'node:test';
import assert from 'node:assert/strict';
import {createNalarInvestigator,validateNalarResponse,nalarRevision,withNalarFallback} from '../server/nalar.js';
const claim={id:'SYN-2512-00001',amount:100,tariff:100,los:1,normalLos:1,score:72,signals:['COST_RATIO','DUPLICATE'],mlAnomaly:true,recommendation:'REQUEST_EVIDENCE'};
const answer={summary:'Temuan aturan dan model perlu ditelaah.',checks:['rincian biaya','identitas episode klaim'],model:'NALAR-4B',revision:nalarRevision};
test('NALAR validates evidence and pinned model provenance',()=>{
  assert.equal(validateNalarResponse(answer,claim).model,'NALAR-4B');
  for(const bad of [{...answer,checks:['rincian biaya']},{...answer,checks:[...answer.checks,'catatan layanan']},{...answer,revision:'other'},{...answer,summary:'Klaim ditolak oleh model.'}]) assert.throws(()=>validateNalarResponse(bad,claim));
});
test('NALAR sends only trained indicators and closes its authenticated client',async()=>{
  let closed=false;
  const investigate=createNalarInvestigator('test-token',{connect:async(space,options)=>{
    assert.equal(space,'konigiri/sikepo-nalar');assert.equal(options.hf_token,'test-token');
    return {predict:async(endpoint,{payload})=>{assert.equal(endpoint,'/explain');assert.deepEqual(JSON.parse(payload),{signals:claim.signals,mlAnomaly:true,score:72});return {data:[answer]};},close(){closed=true;}};
  }});
  const result=await investigate(claim);assert.equal(result.model,'NALAR-4B');assert.ok(result.runId);assert.equal(closed,true);
});
test('NALAR errors and timeouts use Gemma without relabeling its result',async()=>{
  let closed=false,fallbacks=0;
  const nalar=createNalarInvestigator('test',{timeoutMs:10,connect:async()=>({predict:()=>new Promise(()=>{}),close(){closed=true;}})});
  const investigate=withNalarFallback(nalar,async()=>({model:'gemma',summary:'Gemma response'}),()=>fallbacks++);
  assert.equal((await investigate(claim)).model,'gemma');assert.equal(closed,true);assert.equal(fallbacks,1);
});
