import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { anomalyScore, model } from '../server/ml.js';
test('Node inference matches independent scikit-learn exported scores',()=>{
  const fixtures=JSON.parse(readFileSync('ml/artifacts/parity-fixtures.json','utf8'));
  for(const f of fixtures)assert(Math.abs(anomalyScore(f.features)-f.rawScore)<1e-12,f.id);
});
test('training artifacts match the dataset and no episode crosses splits',()=>{
  assert.equal(model.report.datasetSha256,createHash('sha256').update(readFileSync('data/synthetic/claims.json')).digest('hex'));
  const episodes=new Map();for(const row of JSON.parse(readFileSync('ml/artifacts/splits.json','utf8'))){if(episodes.has(row.episodeId))assert.equal(episodes.get(row.episodeId),row.split);episodes.set(row.episodeId,row.split);}
  assert.equal(Object.values(model.report.splitCounts).reduce((a,b)=>a+b,0),10000);
});
