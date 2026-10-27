import { readFileSync } from 'node:fs';
export const model = JSON.parse(readFileSync(new URL('../ml/artifacts/isolation-forest.json',import.meta.url),'utf8'));
export function featureVector(c){return [c.amount/c.tariff,c.los/c.normalLos,Number(c.restrictedDrug&&!c.drugEvidence),Math.abs(c.serviceCount-c.documentedServiceCount)/Math.max(1,c.serviceCount),Math.abs(c.invoiceTotal-c.amount)/Math.max(1,c.amount),c.duplicateCount,Math.log1p(c.tariff)];}
function averagePath(n){return n<=1?0:n===2?1:2*(Math.log(n-1)+0.5772156649015329)-2*(n-1)/n;}
export function anomalyScore(features){
  const x=features.map(Math.fround);let paths=0;
  for(const t of model.trees){let node=0,depth=0;while(t.left[node]!==-1){node=x[t.feature[node]]<=t.threshold[node]?t.left[node]:t.right[node];depth++;}paths+=depth+averagePath(t.samples[node]);}
  return 2**(-paths/(model.trees.length*averagePath(model.maxSamples)));
}
export function predict(c){const rawScore=anomalyScore(featureVector(c));return {version:model.version,rawScore,threshold:model.threshold,isAnomaly:rawScore>model.threshold,priority:Math.round(Math.min(99,Math.max(0,50+(rawScore-model.threshold)*250)))};}
