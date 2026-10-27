import { assessClaim } from './claims.js';
import { readFileSync } from 'node:fs';
const historicalManifest=JSON.parse(readFileSync(new URL('../ml/artifacts/historical-manifest.json',import.meta.url),'utf8'));

// Compact synthetic-only rows leave room for indexes and other cluster data.
export function compactHistorical(c) {
  const id=Number(c.id.split('-').at(-1)), ep=Number(c.episodeId.split('-').at(-1));
  if(!Number.isSafeInteger(id)||id<1||id>5000000||!/^(2019|202[0-5])-\d\d-\d\d$/.test(c.date)||!c.synthetic)throw Error('Invalid historical row');
  return {_id:id,y:Number(c.date.slice(0,4)),d:c.date,f:c.facilityId,r:c.region,t:c.type,i:c.icd,a:c.amount,b:c.tariff,n:c.invoiceTotal,l:c.los,o:c.normalLos,s:c.serviceCount,z:c.documentedServiceCount,x:(c.restrictedDrug?1:0)|(c.drugEvidence?2:0),e:ep,u:c.duplicateCount};
}
export function expandHistorical(c) {
  const id=`SYN-${c.y}-${String(c._id).padStart(8,'0')}`;
  return assessClaim({id,synthetic:true,historical:true,episodeId:`SYN-EP-${String(c.e).padStart(8,'0')}`,date:c.d,facilityId:`SYN-FK-${String(c.f).padStart(4,'0')}`,facility:`Fasilitas Sintetis ${String(c.f).padStart(4,'0')}`,city:`Wilayah sintetis ${String(c.r).padStart(2,'0')}`,type:c.t,icd:c.i,diagnosis:`Diagnosis skenario ${c.i}`,amount:c.a,tariff:c.b,invoiceTotal:c.n,los:c.l,normalLos:c.o,serviceCount:c.s,documentedServiceCount:c.z,restrictedDrug:Boolean(c.x&1),drugEvidence:Boolean(c.x&2),duplicateCount:c.u});
}
export function historicalId(id){const m=/^SYN-(2019|202[0-5])-(\d{8})$/.exec(id);return m?{year:Number(m[1]),id:Number(m[2])}:null;}
export function createHistoryStore(db){
 const col=db.collection('historical_claims_v3'), reviews=db.collection('historical_reviews_v3');
 const attach=async c=>{if(!c)return null;const row=expandHistorical(c),review=await reviews.findOne({_id:c._id});return {...row,status:review?.status||row.status,reviewVersion:review?.reviewVersion||0,lastReview:review?.lastReview||null,reviewHistory:review?.reviewHistory||[]};};
 return {
  async list(query={}){
   const year=Number(query.year),after=Number(query.after||0),limit=Math.min(25,Math.max(1,Math.trunc(Number(query.limit)||10)));
   if(!Number.isInteger(year)||year<2019||year>2025||!Number.isSafeInteger(after)||after<0||after>5000000)throw Object.assign(new Error('Filter tahun atau halaman tidak valid.'),{status:400});
   const docs=await col.find({y:year,_id:{$gt:after}}).sort({_id:1}).limit(limit+1).toArray();
   const hasMore=docs.length>limit,rows=docs.slice(0,limit),progress=await db.collection('historical_imports').findOne({_id:`historical-v3-${year}`});
   return {year,claims:await Promise.all(rows.map(attach)),next:hasMore?rows.at(-1)._id:null,imported:progress?.count||0,complete:progress?.state==='ready',expected:historicalManifest.yearCounts[year]};
  },
  async get(id){const p=historicalId(id);if(!p)return null;return attach(await col.findOne({_id:p.id,y:p.year}));},
  async review(id,review,actor){const p=historicalId(id);if(!p)return null;const base=await col.findOne({_id:p.id,y:p.year});if(!base)return null;
   await reviews.updateOne({_id:p.id},{$setOnInsert:{status:expandHistorical(base).status,reviewVersion:0}},{upsert:true});
   const before=await reviews.findOne({_id:p.id,reviewVersion:review.version});if(!before)return null;
   const event={actor,at:new Date(),previousStatus:before.status,status:review.status,note:review.note};
   const after=await reviews.findOneAndUpdate({_id:p.id,reviewVersion:review.version},{$set:{status:review.status,lastReview:event},$inc:{reviewVersion:1},$push:{reviewHistory:event}},{returnDocument:'after'});
   if(!after)return null;return {...expandHistorical(base),status:after.status,reviewVersion:after.reviewVersion,lastReview:after.lastReview,reviewHistory:after.reviewHistory};
  }
 };
}
