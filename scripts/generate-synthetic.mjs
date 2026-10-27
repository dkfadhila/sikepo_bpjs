import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Fixed seed and anchor: regeneration is byte-for-byte reproducible.
let state = 2702026;
const random = () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296; };
const integer = (min, max) => min + Math.floor(random() * (max - min + 1));
const anchor = '2026-10-26';
const diagnoses = [['Pneumonia','J18.9',6200000,6],['Demam tifoid','A01.0',3800000,4],['Diabetes melitus tipe 2','E11.9',5100000,5],['Gagal jantung kongestif','I50.0',8300000,6],['Gastroenteritis','A09',2950000,3],['Persalinan sesar','O82',7400000,4],['Dengue tanpa komplikasi','A90',4600000,5],['Penyakit ginjal kronis','N18.9',9800000,7]];
const scenarios = ['baseline','cost_and_stay','drug_evidence','service_mismatch','billing_mismatch','duplicate'];
const claims = [], labels = [];
for (let i = 0; i < 240; i++) {
  const scenario = scenarios[i % scenarios.length], d = diagnoses[integer(0,7)], facilityIndex = integer(1,6);
  const daysAgo = integer(0,29), date = new Date(anchor + 'T12:00:00Z'); date.setUTCDate(date.getUTCDate() - daysAgo);
  const tariff = d[2], amount = Math.round(tariff * (scenario === 'cost_and_stay' ? 1.45 + random() * .6 : .9 + random() * .25) / 1000) * 1000;
  const serviceCount = integer(2,8), restrictedDrug = scenario === 'drug_evidence' || random() < .15;
  const c = { id: `SYN-2610-${String(i+1).padStart(4,'0')}`, synthetic: true,
    episodeId: `SYN-EP-${String(i+1).padStart(4,'0')}`, facilityId: `SYN-FK-${facilityIndex}`,
    facility: `Fasilitas Sintetis ${String(facilityIndex).padStart(2,'0')}`, city: 'Wilayah sintetis', type: facilityIndex % 2 ? 'B' : 'C',
    diagnosis: d[0], icd: d[1], tariff, amount, invoiceTotal: scenario === 'billing_mismatch' ? Math.round(amount * .72 / 1000)*1000 : amount,
    los: d[3] + (scenario === 'cost_and_stay' ? integer(3,8) : integer(-1,1)), normalLos: d[3], date: date.toISOString().slice(0,10), daysAgo,
    serviceCount, documentedServiceCount: scenario === 'service_mismatch' ? serviceCount-1 : serviceCount,
    restrictedDrug, drugEvidence: scenario !== 'drug_evidence', duplicateCount: scenario === 'duplicate' ? 2 : 1 };
  if (scenario === 'duplicate') { c.episodeId = claims[i-1].episodeId; c.facilityId = claims[i-1].facilityId; c.facility = claims[i-1].facility; c.type = claims[i-1].type; c.date = claims[i-1].date; c.daysAgo = claims[i-1].daysAgo; claims[i-1].duplicateCount = 2; }
  claims.push(c); labels.push({ id: c.id, injectedScenario: scenario });
}
const metadata = { version: 'sikepo-synthetic-1.0', seed: 2702026, generator: 'scripts/generate-synthetic.mjs', anchorDate: anchor, count: claims.length,
  provenance: 'Fully synthetic: generated from authored ranges and scenarios; no participant records, BPJS extracts, or learned patient distributions used.',
  tariffSource: 'Authored scenario values; not official INA-CBG tariffs.', scenarioCounts: Object.fromEntries(scenarios.map(s=>[s,labels.filter(l=>l.injectedScenario===s).length])) };
mkdirSync('data/synthetic', {recursive:true});
const json = JSON.stringify({metadata, claims}, null, 2) + '\n';
writeFileSync('data/synthetic/claims.json', json);
writeFileSync('data/synthetic/scenario-labels.json', JSON.stringify(labels,null,2)+'\n');
const fields = Object.keys(claims[0]);
const csv = [fields.join(','), ...claims.map(c=>fields.map(f=>JSON.stringify(c[f])).join(','))].join('\n')+'\n';
writeFileSync('data/synthetic/claims.csv', csv);
writeFileSync('data/synthetic/manifest.json', JSON.stringify({...metadata, sha256: createHash('sha256').update(json).digest('hex'), fields},null,2)+'\n');
console.log(`Generated ${claims.length} fully synthetic claims; seed ${metadata.seed}.`);
