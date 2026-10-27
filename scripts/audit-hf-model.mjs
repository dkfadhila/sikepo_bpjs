import { readFileSync, writeFileSync } from 'node:fs';
const model=JSON.parse(readFileSync('artifacts/hf-audit/model/isolation-forest.json','utf8'));
const fixtures=JSON.parse(readFileSync('artifacts/hf-audit/model/parity-fixtures.json','utf8'));
const avg=n=>n<=1?0:n===2?1:2*(Math.log(n-1)+0.5772156649015329)-2*(n-1)/n;
function score(features){let total=0;const x=features.map(Math.fround);for(const t of model.trees){let node=0,depth=0;while(t.left[node]!==-1){node=x[t.feature[node]]<=t.threshold[node]?t.left[node]:t.right[node];depth++;}total+=depth+avg(t.samples[node]);}return 2**(-total/(model.trees.length*avg(model.maxSamples)));}
const parity=fixtures.map(f=>Math.abs(score(f.features)-f.rawScore));
const baseline=[1,1,0,0,0,1,Math.log1p(6200000)];
const cases=[
 {name:'Klaim normal dengan tagihan sesuai acuan',features:baseline,expectedAnomaly:false},
 {name:'Biaya 2,5 kali acuan dan rawat 2 kali acuan',features:[2.5,2,0,0,0,1,baseline[6]],expectedAnomaly:true},
 {name:'Dua pengajuan untuk episode yang sama',features:[1,1,0,0,0,2,baseline[6]],expectedAnomaly:true},
 {name:'Jumlah layanan tidak cocok dan rincian tagihan berbeda',features:[1.1,1,0,.4,.3,1,baseline[6]],expectedAnomaly:true},
 {name:'Obat restriksi tanpa bukti',features:[1,1,1,0,0,1,baseline[6]],expectedAnomaly:true},
 {name:'Kasus batas rasio biaya 1,3 dan durasi +2 hari',features:[1.3,8/6,0,0,0,1,baseline[6]],expectedAnomaly:null}
].map(c=>({...c,rawScore:score(c.features),threshold:model.threshold,isAnomaly:score(c.features)>model.threshold}));
for(const c of cases)c.pass=c.expectedAnomaly===null||c.isAnomaly===c.expectedAnomaly;
const report={modelVersion:model.version,parityFixtures:fixtures.length,maxAbsoluteError:Math.max(...parity),parityPassed:Math.max(...parity)<1e-12,cases,
 metricsGate:model.report.test.precision>=.85&&model.report.test.recall>=.85&&model.report.test.f1>=.85,
 limitations:'Case checks and thresholds are synthetic development acceptance gates, not proof of clinical or BPJS accuracy.'};
report.passed=report.parityPassed&&report.metricsGate&&cases.every(c=>c.pass);
writeFileSync('artifacts/hf-audit/model-case-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
