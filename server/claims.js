import { readFileSync } from 'node:fs';

// These thresholds are application heuristics, not BPJS adjudication rules.
export function assessClaim(c) {
  const ratio = c.amount / c.tariff;
  const signals = [];
  if (ratio > 1.3) signals.push({ code: 'COST_RATIO', weight: 30, text: 'Pengajuan melampaui 1,3 kali tarif acuan skenario.' });
  if (c.los > c.normalLos + 2) signals.push({ code: 'LONG_STAY', weight: 20, text: 'Durasi rawat melebihi acuan skenario lebih dari dua hari.' });
  if (c.restrictedDrug && !c.drugEvidence) signals.push({ code: 'DRUG_EVIDENCE', weight: 25, text: 'Obat restriksi belum disertai bukti pendukung pada skenario.' });
  if (c.serviceCount !== c.documentedServiceCount) signals.push({ code: 'SERVICE_MISMATCH', weight: 35, text: 'Jumlah layanan ditagihkan berbeda dari catatan pendukung.' });
  if (c.invoiceTotal !== c.amount) signals.push({ code: 'BILLING_MISMATCH', weight: 25, text: 'Total rincian tagihan berbeda dari nilai pengajuan.' });
  if (c.duplicateCount > 1) signals.push({ code: 'DUPLICATE', weight: 45, text: 'Ada lebih dari satu pengajuan untuk episode yang sama.' });
  const score = Math.min(99, signals.reduce((n, s) => n + s.weight, 0));
  return { ...c, score, signals, status: signals.length ? 'HOLD' : 'PENDING', assessmentVersion: 'rules-1.0' };
}

export const dataset = JSON.parse(readFileSync(new URL('../data/synthetic/claims.json', import.meta.url), 'utf8'));
export const assessedClaims = dataset.claims.map(assessClaim);
export const dataInfo = { ...dataset.metadata, assessmentVersion: 'rules-1.0', method: 'Indikator berbasis aturan; belum merupakan model ML tervalidasi.', documentation: '/data-methodology.html' };
