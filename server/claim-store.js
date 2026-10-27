import { assessedClaims, dataInfo } from './claims.js';
import { GridFSBucket } from 'mongodb';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { finished } from 'node:stream/promises';

const version = dataInfo.version;
const safe = row => { if(!row)return null; const {_id,...value}=row;return value; };
export function criteria(q){
  const filter={datasetVersion:version,daysAgo:{$lt:Number(q.period)===7?7:30}};
  if(['HOLD','PENDING','APPROVED','REJECTED'].includes(q.status))filter.status=q.status;
  if(q.view==='investigations')filter.score={$gte:70};
  if(q.risk==='high')filter.score={$gte:70};
  if(q.risk==='medium')filter.score={$gte:35,$lt:70};
  if(q.risk==='low')filter.score={$lt:35};
  if(q.view==='investigations')filter.score={...filter.score,$gte:70};
  if(q.search){const regex=String(q.search).slice(0,100).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');filter.$or=['id','facility','diagnosis','icd'].map(k=>({[k]:{$regex:regex,$options:'i'}}));}
  return filter;
}
export async function seedClaimDatabase(db){
  const col=db.collection('claims');
  await col.createIndex({datasetVersion:1,id:1},{unique:true});
  await col.createIndex({datasetVersion:1,status:1,score:-1,id:1});
  await col.createIndex({datasetVersion:1,score:-1,id:1});
  await col.createIndex({datasetVersion:1,daysAgo:1});
  const existing=await db.collection('datasets').findOne({_id:version});
  if(existing?.state==='ready' && existing.count===dataInfo.count && await col.countDocuments({datasetVersion:version})===dataInfo.count)return;
  for(let i=0;i<assessedClaims.length;i+=500){await col.bulkWrite(assessedClaims.slice(i,i+500).map(c=>({updateOne:{filter:{datasetVersion:version,id:c.id},update:{$setOnInsert:{...c,datasetVersion:version,reviewVersion:0}},upsert:true}})),{ordered:false});}
  const bucket=new GridFSBucket(db,{bucketName:'artifacts'}), artifacts=[];
  for(const name of ['data/synthetic/claims.json','data/synthetic/claims.csv','data/synthetic/manifest.json','ml/artifacts/isolation-forest.json','ml/artifacts/evaluation.json','ml/artifacts/dataset-audit.json','ml/artifacts/model-case-audit.json','ml/artifacts/historical-manifest.json','ml/artifacts/provenance.json']){
    const bytes=gzipSync(readFileSync(name),{mtime:0}),hash=createHash('sha256').update(bytes).digest('hex');
    let file=await db.collection('artifacts.files').findOne({'metadata.sha256':hash});
    if(!file){const upload=bucket.openUploadStream(`${version}/${name}.gz`,{metadata:{sha256:hash,datasetVersion:version,encoding:'gzip',synthetic:true,source:name}});upload.end(bytes);await finished(upload);file={_id:upload.id};}
    artifacts.push({source:name,fileId:file._id,sha256:hash,bytes:bytes.length});
  }
  await db.collection('models').updateOne({_id:dataInfo.model.modelVersion},{$setOnInsert:{...dataInfo.model,artifacts,createdAt:new Date()}},{upsert:true});
  const count=await col.countDocuments({datasetVersion:version});
  if(count!==dataInfo.count)throw new Error('Dataset count mismatch');
  await db.collection('datasets').updateOne({_id:version},{$set:{...dataInfo,count,state:'ready',artifacts,storage:'MongoDB + private GridFS',updatedAt:new Date()}},{upsert:true});
}
export function createClaimStore(db){
  const col=db.collection('claims');
  return {
    async list(q={}){const filter=criteria(q),total=await col.countDocuments(filter),limit=Math.min(100,Math.max(1,Math.trunc(Number(q.limit))||6)),pages=Math.max(1,Math.ceil(total/limit)),page=Math.min(pages,Math.max(1,Math.trunc(Number(q.page))||1));const rows=await col.find(filter).sort({score:q.sort==='asc'?1:-1,id:1}).skip((page-1)*limit).limit(limit).toArray();return {metadata:dataInfo,claims:rows.map(safe),total,page,pages,limit};},
    async get(id){return safe(await col.findOne({datasetVersion:version,id}));},
    async summary(period){const rows=await col.find(criteria({period}),{projection:{_id:0,amount:1,tariff:1,score:1,status:1,daysAgo:1}}).toArray();return summarize(rows,period);},
    async *export(q){for await(const c of col.find(criteria(q)).sort({score:q.sort==='asc'?1:-1,id:1}))yield safe(c);},
    async review(id,review,actor){const before=await col.findOne({datasetVersion:version,id,reviewVersion:review.version});if(!before)return null;const event={actor,at:new Date(),previousStatus:before.status,status:review.status,note:review.note};const after=await col.findOneAndUpdate({datasetVersion:version,id,reviewVersion:review.version},{$set:{status:review.status,lastReview:event},$inc:{reviewVersion:1},$push:{reviewHistory:event}},{returnDocument:'after'});return safe(after);}
  };
}
export function summarize(rows,period){const buckets=Array.from({length:7},()=>({all:0,reviewed:0}));const groups=[0,0,0];let amount=0,hold=0,high=0,exposure=0;for(const c of rows){amount+=c.amount;if(c.status==='HOLD')hold++;if(c.score>=70){high++;exposure+=Math.max(0,c.amount-c.tariff);}groups[c.score>=70?2:c.score>=35?1:0]++;const b=Number(period)===7?6-c.daysAgo:Math.min(6,Math.floor((29-c.daysAgo)*7/30));if(b>=0&&b<7){buckets[b].all++;if(['APPROVED','REJECTED'].includes(c.status))buckets[b].reviewed++;}}return {count:rows.length,amount,hold,high,exposure,groups,buckets,metadata:dataInfo,storage:'MongoDB'};}
