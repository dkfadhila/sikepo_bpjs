import { Agent } from '@mastra/core/agent';
import { Mastra } from '@mastra/core';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';

export const claimSchema = z.object({
  id: z.string().regex(/^SYN-2512-\d{5}$/), amount: z.number().nonnegative().max(1e9),
  tariff: z.number().positive().max(1e9), los: z.number().int().min(0).max(365),
  normalLos: z.number().int().min(0).max(365), score: z.number().int().min(0).max(99),
  signals: z.array(z.enum(['COST_RATIO','LONG_STAY','DRUG_EVIDENCE','SERVICE_MISMATCH','BILLING_MISMATCH','DUPLICATE'])).max(6),
  mlAnomaly:z.boolean(),recommendation:z.enum(['REQUEST_EVIDENCE','READY_FOR_VERIFIER'])
}).strict();
const resultSchema = z.object({ summary: z.string().min(10).max(3000), checks: z.array(z.string().min(3).max(500)).min(1).max(5) }).strict();

export function createClaimInvestigator(key, model) {
  if (!/^gemma[-a-zA-Z0-9.:]+$/.test(model)) throw new Error('GEMMA_MODEL must name a Gemma model');
  const google = createGoogleGenerativeAI({ apiKey: key || 'not-configured' });
  const agent = new Agent({ id: 'sikepo-investigator', name: 'SIKEPO investigator',
    model: google(model), instructions: 'Anda adalah asisten penelaahan pra-approval SiKePO untuk klaim SINTETIS. Jelaskan indikator aturan dan Isolation Forest, kebutuhan bukti, serta rekomendasi REQUEST_EVIDENCE atau READY_FOR_VERIFIER yang diberikan server. Jangan mengubah rekomendasi server. Jangan menyetujui, menolak, memutus pembayaran atau menyimpulkan fraud. Jangan mengarang diagnosis, bukti, atau regulasi. Semua keluaran dalam bahasa Indonesia.' });
  const analyse = createStep({ id: 'explain-signals', inputSchema: claimSchema, outputSchema: z.object({ text: z.string() }),
    execute: async ({ inputData }) => {
      const response = await agent.generate(`Tinjau klaim sintetis ini: ${JSON.stringify(inputData)}. Skor prioritas memadukan aturan dan Isolation Forest yang baru dievaluasi pada dataset sintetis, bukan probabilitas fraud atau validasi BPJS. Tarif dan durasi acuan adalah nilai skenario. Jelaskan mengapa rekomendasi server perlu ditindaklanjuti verifikator dan bukti yang diperlukan. Return ONLY JSON: {"summary":"penjelasan singkat", "checks":["dokumen atau data yang perlu dicocokkan"]}. Jangan sertakan markdown.`,
        { maxSteps: 1, abortSignal: AbortSignal.timeout(55000), modelSettings: { temperature: 0.2, maxOutputTokens: 1200 } });
      return { text: response.text };
    }
  });
  const validate = createStep({ id: 'validate-explanation', inputSchema: z.object({ text: z.string() }), outputSchema: resultSchema,
    execute: async ({ inputData }) => resultSchema.parse(JSON.parse(inputData.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim())) });
  const workflow = createWorkflow({ id: 'claim-explanation', inputSchema: claimSchema, outputSchema: resultSchema }).then(analyse).then(validate).commit();
  const mastra = new Mastra({ agents: { investigator: agent }, workflows: { investigation: workflow }, logger: false });
  return async claim => {
    if (!key) throw Object.assign(new Error('Integrasi Gemma belum dikonfigurasi.'), { status: 503 });
    const run = await mastra.getWorkflow('investigation').createRun();
    const result = await run.start({ inputData: claimSchema.parse(claim) });
    if (result.status !== 'success') throw Object.assign(new Error('Gemma belum menghasilkan penjelasan valid. Coba lagi nanti.'), { status: 502 });
    return { ...result.result, model, runId: run.runId, synthetic: true };
  };
}
