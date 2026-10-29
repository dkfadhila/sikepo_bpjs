import { z } from 'zod';
import { createHash, randomUUID } from 'node:crypto';
import { assessClaim, dataInfo } from './claims.js';
import { explainClaim, nalarInput, reserveAiBudget } from './workflow.js';

const money = z.number().finite().nonnegative().max(1e9);
export const intakeSchema = z.object({
  requestId: z.string().uuid(), dataClass: z.literal('SYNTHETIC'),
  date: z.string().regex(/^20(?:19|2[0-5])-\d{2}-\d{2}$/).refine(v => { const d = new Date(v); return Number.isFinite(+d) && d.toISOString().slice(0,10) === v; }),
  facilityCode: z.string().regex(/^[A-Z0-9-]{2,12}$/), episodeKey: z.string().regex(/^[A-Z0-9-]{4,40}$/),
  icd: z.string().regex(/^[A-Z][0-9]{2}(?:\.[0-9A-Z]{1,3})?$/),
  amount: money, tariff: money.positive(), invoiceTotal: money,
  los: z.number().int().min(0).max(365), normalLos: z.number().int().min(1).max(365),
  restrictedDrug: z.boolean(), drugEvidence: z.boolean(),
  serviceCount: z.number().int().min(0).max(10000), documentedServiceCount: z.number().int().min(0).max(10000),
  duplicateCount: z.number().int().min(1).max(100),
}).strict();

export function createIntake({ db, investigate, config, captureException = () => {} }) {
  const col = db.collection('claims');
  let timer, running = false, stopped = false;
  async function init() {
    await col.createIndex({datasetVersion:1,'intake.key':1},{unique:true,partialFilterExpression:{'intake.key':{$exists:true}}});
    await col.createIndex({'pipeline.state':1,'pipeline.nextAt':1});
  }
  async function submit(raw, actor) {
    const input = intakeSchema.parse(raw);
    const { requestId, dataClass, facilityCode, episodeKey, ...values } = input;
    const key = createHash('sha256').update(actor.email + ':' + requestId).digest('hex');
    const digest = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    const now = new Date();
    const claim = assessClaim({...values,id:'SYN-IN-'+key.slice(0,16),facility:'Fasilitas Sintetis '+facilityCode,
      diagnosis:'Diagnosis skenario '+input.icd,episodeId:'SYN-EP-'+episodeKey,daysAgo:0,synthetic:true});
    const doc = {...claim,datasetVersion:dataInfo.version,reviewVersion:0,
      intake:{key,digest,source:'structured-intake',dataClass,receivedAt:now,submittedBy:actor.email},
      pipeline:{state:'queued',nextAt:now,attempts:0,rulesCompletedAt:now,mlCompletedAt:now},createdAt:now};
    let saved;
    try { saved = await col.findOneAndUpdate({datasetVersion:dataInfo.version,'intake.key':key},{$setOnInsert:doc},{upsert:true,returnDocument:'after'}); }
    catch(error) { if(error.code !== 11000) throw error; saved = await col.findOne({datasetVersion:dataInfo.version,'intake.key':key}); }
    if(saved.intake.digest !== digest) throw Object.assign(new Error('Request ID sudah digunakan untuk pengajuan berbeda.'),{status:409});
    void tick();
    return {id:saved.id,pipeline:saved.pipeline,recommendation:saved.recommendation,requiresHumanDecision:true};
  }
  async function tick() {
    if(running || stopped || !config.nalarEnabled) return;
    running = true;
    let claim;
    try {
      const now = new Date(), lease = randomUUID();
      claim = await col.findOneAndUpdate({datasetVersion:dataInfo.version,'intake.key':{$exists:true},$or:[
        {'pipeline.state':{$in:['queued','deferred']},'pipeline.nextAt':{$lte:now}},
        {'pipeline.state':'processing','pipeline.leaseUntil':{$lt:now}},
      ]},{$set:{'pipeline.state':'processing','pipeline.lease':lease,'pipeline.leaseUntil':new Date(+now+180000)},$inc:{'pipeline.attempts':1}},{sort:{createdAt:1},returnDocument:'after'});
      if(!claim) return;
      const filter={_id:claim._id,'pipeline.lease':lease};
      if(claim.pipeline.attempts>3){await col.updateOne(filter,{$set:{'pipeline.state':'failed','pipeline.message':'Batas percobaan NALAR tercapai. Hasil aturan dan ML tetap tersedia.'},$unset:{'pipeline.lease':'','pipeline.leaseUntil':''}});return;}
      if(!await reserveAiBudget(db,config.aiDailyLimit)) {
        const next = new Date(); next.setUTCHours(24,0,0,0);
        await col.updateOne(filter,{$set:{'pipeline.state':'deferred','pipeline.nextAt':next,'pipeline.message':'Menunggu kuota NALAR berikutnya.'},$inc:{'pipeline.attempts':-1},$unset:{'pipeline.lease':'','pipeline.leaseUntil':''}});
        return;
      }
      try {
        const result = explainClaim(claim,await investigate(nalarInput(claim)));
        await col.updateOne(filter,{$set:{'pipeline.state':'completed','pipeline.completedAt':new Date(),'pipeline.explanation':result},$unset:{'pipeline.lease':'','pipeline.leaseUntil':'','pipeline.message':''}});
      } catch(error) {
        captureException(error);
        await col.updateOne(filter,{$set:{'pipeline.state':claim.pipeline.attempts>=3?'failed':'deferred','pipeline.nextAt':new Date(Date.now()+60000*claim.pipeline.attempts),'pipeline.message':'NALAR belum berhasil. Hasil aturan dan ML tetap tersedia.'},$unset:{'pipeline.lease':'','pipeline.leaseUntil':''}});
      }
    } catch(error) { captureException(error); }
    finally { running = false; }
  }
  return { init, submit, tick,
    start(){timer=setInterval(()=>void tick(),5000);timer.unref();void tick();},
    stop(){stopped=true;clearInterval(timer);},
  };
}
