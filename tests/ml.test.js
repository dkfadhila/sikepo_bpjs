import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { anomalyScore, model } from '../server/ml.js';
test('Node inference matches independent scikit-learn exported scores',()=>{
  const fixtures=JSON.parse(readFileSync('ml/artifacts/parity-fixtures.json','utf8'));
  for(const f of fixtures)assert(Math.abs(anomalyScore(f.features)-f.rawScore)<1e-12,f.id);
});
test('promoted model has matching provenance and independently audited historical test',()=>{
  const read=p=>JSON.parse(readFileSync(p,'utf8'));
  const provenance=read('ml/artifacts/provenance.json');
  assert.equal(provenance.operationalDatasetSha256,createHash('sha256').update(readFileSync('data/synthetic/claims.json')).digest('hex'));
  assert.equal(provenance.modelSha256,createHash('sha256').update(readFileSync('ml/artifacts/isolation-forest.json')).digest('hex'));
  const audit=read('ml/artifacts/dataset-audit.json');
  assert.equal(audit.passed,true);assert.equal(audit.rowsChecked,5000000);
  assert.equal(audit.noEpisodeDateLeakage,true);assert.equal(audit.heldOutRowsIndependentlyScored,981620);
  assert.deepEqual(audit.recomputedConfusionMatrix,model.report.test.confusionMatrixTN_FP_FN_TP);
  assert.equal(Object.values(model.report.splitCounts).reduce((a,b)=>a+b,0),5000000);
  assert.equal(read('ml/artifacts/model-case-audit.json').passed,true);
});
