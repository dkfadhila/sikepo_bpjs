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
  async summary(scope){
   const years=scope==='all'?[2019,2020,2021,2022,2023,2024,2025]:scope==='30'?[2025]:/^(2019|202[0-5])$/.test(String(scope))?[Number(scope)]:null;
   if(!years)throw Object.assign(new Error('Periode ringkasan tidak valid.'),{status:400});
   const ready=await db.collection('historical_summary_status').find({_id:{$in:years.map(y=>`historical-v3-${y}`)},state:'ready'}).toArray();
   if(ready.length!==years.length)throw Object.assign(new Error('Ringkasan periode ini sedang dihitung. Coba kembali setelah selesai.'),{status:503});
   const start=scope==='30'?'2025-12-02':`${years[0]}-01-01`,end=scope==='30'?'2025-12-31':`${years.at(-1)}-12-31`;
   const daily=await db.collection('historical_daily_summary_v3').find({_id:{$gte:start,$lte:end}}).sort({_id:1}).toArray();
   const rangeStart=Date.parse(start+'T00:00:00Z'),rangeEnd=Date.parse(end+'T00:00:00Z'),days=Math.round((rangeEnd-rangeStart)/86400000)+1,buckets=Array.from({length:7},()=>({all:0,reviewed:0})),groups=[0,0,0];
   let count=0,amount=0,hold=0,high=0,exposure=0;const bucket=date=>Math.min(6,Math.floor(((Date.parse(date+'T00:00:00Z')-rangeStart)/86400000)*7/days));
   for(const d of daily){count+=d.count;amount+=d.amount;hold+=d.hold;high+=d.high;exposure+=d.exposure;d.groups.forEach((n,i)=>groups[i]+=n);buckets[bucket(d._id)].all+=d.count;}
   const reviewsList=await reviews.find({},{projection:{_id:1,status:1}}).toArray();
   if(reviewsList.length){const byId=new Map(reviewsList.map(r=>[r._id,r]));for await(const raw of col.find({_id:{$in:[...byId.keys()]},d:{$gte:start,$lte:end}})){const prior=expandHistorical(raw),status=byId.get(raw._id).status;hold+=Number(status==='HOLD')-Number(prior.status==='HOLD');if(['APPROVED','REJECTED'].includes(status))buckets[bucket(raw.d)].reviewed++;}}
   const labels=Array.from({length:7},(_,i)=>new Date(rangeStart+Math.floor(i*days/7)*86400000).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:scope==='all'?'2-digit':undefined,timeZone:'UTC'}));
   return {count,amount,hold,high,exposure,groups,buckets,labels,rangeLabel:`${start} – ${end}`,metadata:{anchorDate:'2025-12-31'},storage:'MongoDB',scope};
  },
  async review(id,review,actor){const p=historicalId(id);if(!p)return null;const base=await col.findOne({_id:p.id,y:p.year});if(!base)return null;
   await reviews.updateOne({_id:p.id},{$setOnInsert:{status:expandHistorical(base).status,reviewVersion:0}},{upsert:true});
   const before=await reviews.findOne({_id:p.id,reviewVersion:review.version});if(!before)return null;
   const event={actor,at:new Date(),previousStatus:before.status,status:review.status,note:review.note};
   const after=await reviews.findOneAndUpdate({_id:p.id,reviewVersion:review.version},{$set:{status:review.status,lastReview:event},$inc:{reviewVersion:1},$push:{reviewHistory:event}},{returnDocument:'after'});
   if(!after)return null;return {...expandHistorical(base),status:after.status,reviewVersion:after.reviewVersion,lastReview:after.lastReview,reviewHistory:after.reviewHistory};
  }
 };
}
