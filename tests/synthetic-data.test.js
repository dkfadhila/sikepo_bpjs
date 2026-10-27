import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { assessClaim, assessedClaims, dataset } from '../server/claims.js';

test('submission dataset has traceable provenance and no participant identifiers', () => {
  const manifest = JSON.parse(readFileSync('data/synthetic/manifest.json','utf8'));
  assert.equal(createHash('sha256').update(readFileSync('data/synthetic/claims.json')).digest('hex'), manifest.sha256);
  assert.equal(dataset.claims.length,10000);
  assert.equal(new Set(dataset.claims.map(c=>c.id)).size,10000);
  for(const c of dataset.claims){
    assert.match(c.id,/^SYN-2610-\d{5}$/);
    assert.match(c.facility,/^Fasilitas Sintetis \d{2}$/);
    assert.equal(c.synthetic,true);
    assert(c.amount>0 && c.tariff>0 && c.los>=0);
    assert(c.documentedServiceCount<=c.serviceCount);
    const days=(Date.parse(dataset.metadata.anchorDate)-Date.parse(c.date))/86400000;
    assert.equal(days,c.daysAgo);assert(days>=0&&days<30);
    for(const key of Object.keys(c))assert(!/^(nik|name|patientName|email|phone|address|birthDate|participantId)$/i.test(key));
    if(c.duplicateCount>1)assert.equal(dataset.claims.filter(other=>other.episodeId===c.episodeId).length,c.duplicateCount);
  }
  assert(assessedClaims.every(c=>['PENDING','HOLD'].includes(c.status)));
});

test('priority changes with observed indicators and never makes a payment decision', () => {
  const baseline={amount:100,tariff:100,los:3,normalLos:3,restrictedDrug:false,drugEvidence:true,serviceCount:2,documentedServiceCount:2,invoiceTotal:100,duplicateCount:1};
  assert.equal(assessClaim(baseline).ruleScore,0);
  assert.notEqual(assessClaim(baseline).status,'APPROVED');
  const financial=assessClaim({...baseline,amount:150,invoiceTotal:150});
  assert.equal(financial.ruleScore,30);assert.equal(financial.status,'HOLD');
  const mixed=assessClaim({...baseline,amount:150,los:6,restrictedDrug:true,drugEvidence:false,documentedServiceCount:1,duplicateCount:2});
  assert.equal(mixed.score,99);assert.equal(mixed.signals.length,6);assert.equal(mixed.status,'HOLD');
});
