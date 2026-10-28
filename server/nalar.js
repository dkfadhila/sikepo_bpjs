import { Client } from '@gradio/client';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { claimSchema } from './agent.js';

export const nalarRevision = 'f93d42c68503f6b9f8d18dd2d018cb5bff91edd8';
const evidence = { COST_RATIO:'rincian biaya', LONG_STAY:'catatan durasi rawat', DRUG_EVIDENCE:'bukti penggunaan obat', SERVICE_MISMATCH:'catatan layanan', BILLING_MISMATCH:'rincian tagihan', DUPLICATE:'identitas episode klaim' };
const responseSchema = z.object({summary:z.string().min(10).max(3000),checks:z.array(z.string().min(3).max(500)).min(1).max(6),model:z.literal('NALAR-4B'),revision:z.literal(nalarRevision)}).strict();

export function validateNalarResponse(response, claim) {
  const result = responseSchema.parse(response);
  const expected = claim.signals.length ? claim.signals.map(s=>evidence[s]).sort() : ['dokumen pendukung klaim'];
  if (JSON.stringify([...result.checks].sort()) !== JSON.stringify(expected) || /pasti fraud|klaim ditolak|klaim disetujui/i.test(result.summary)) throw new Error('NALAR evidence validation failed');
  if (claim.mlAnomaly && !/model/i.test(result.summary)) throw new Error('NALAR omitted ML context');
  if (!claim.mlAnomaly && /model menandai/i.test(result.summary)) throw new Error('NALAR invented ML context');
  return result;
}

export function createNalarInvestigator(token, {connect=(...args)=>Client.connect(...args),timeoutMs=45000}={}) {
  return async input => {
    const claim = claimSchema.parse(input);
    if (!token) throw Object.assign(new Error('NALAR belum dikonfigurasi.'),{status:503});
    let client, timer, expired=false;
    const task = (async()=>{
      client = await connect('konigiri/sikepo-nalar',{token:token});
      if(expired) {client.close(); throw new Error('NALAR timed out');}
      // Only trained indicators leave the server; no IDs or claim documents.
      const payload = JSON.stringify({signals:claim.signals,mlAnomaly:claim.mlAnomaly,score:claim.score});
      const response = await client.predict('/explain',{payload});
      return {...validateNalarResponse(response.data[0],claim),runId:randomUUID(),synthetic:true};
    })();
    try {
      return await Promise.race([task,new Promise((_,reject)=>{timer=setTimeout(()=>{expired=true;reject(Object.assign(new Error('NALAR tidak merespons tepat waktu.'),{status:504}));},timeoutMs);})]);
    } finally {clearTimeout(timer);client?.close();}
  };
}

export function withNalarFallback(nalar, gemma, onFallback=()=>{}) {
  return async claim => {
    try {return await nalar(claim);}
    catch {onFallback();return gemma(claim);}
  };
}
