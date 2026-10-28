import { z } from 'zod';

export const claimSchema = z.object({
  id: z.string().regex(/^SYN-(?:2512-\d{5}|(?:2019|202[0-5])-\d{8})$/), amount: z.number().nonnegative().max(1e9),
  tariff: z.number().positive().max(1e9), los: z.number().int().min(0).max(365),
  normalLos: z.number().int().min(0).max(365), score: z.number().int().min(0).max(99),
  signals: z.array(z.enum(['COST_RATIO','LONG_STAY','DRUG_EVIDENCE','SERVICE_MISMATCH','BILLING_MISMATCH','DUPLICATE'])).max(6),
  mlAnomaly:z.boolean(),recommendation:z.enum(['REQUEST_EVIDENCE','READY_FOR_VERIFIER'])
}).strict();
