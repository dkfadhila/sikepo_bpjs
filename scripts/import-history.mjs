import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { createReadStream,readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';
import { compactHistorical } from '../server/history-store.js';

const root='artifacts/hf-audit/dataset', manifest=JSON.parse(readFileSync('ml/artifacts/historical-manifest.json','utf8'));
const audit=JSON.parse(readFileSync('ml/artifacts/dataset-audit.json','utf8'));
if(!audit.passed||!audit.allFileChecksumsVerified||audit.rowsChecked!==5000000)throw Error('Historical audit must pass first');
if((process.env.MONGODB_DATABASE||'sikepo')!=='sikepo')throw Error('Import restricted to SIKEPO database');
const client=new MongoClient(process.env.MONGODB_URI,{maxPoolSize:5,serverSelectionTimeoutMS:15000});
await client.connect();
try {
 const db=client.db('sikepo'),col=db.collection('historical_claims_v3'),progress=db.collection('historical_imports');
 await col.createIndex({y:1,_id:1});
 for(const file of manifest.files){
  const year=Number(file.path.match(/\d{4}/)[0]),path=`${root}/${file.path}`,hash=createHash('sha256');
  for await(const part of createReadStream(path))hash.update(part);
  if(hash.digest('hex')!==file.sha256)throw Error(`Checksum mismatch for ${year}`);
  const key=`historical-v3-${year}`,prev=await progress.findOne({_id:key});
  if(prev?.state==='ready'){console.log(`${year} already verified: ${prev.count}`);continue;}
  let seen=0,last=0,batch=[];
  const flush=async()=>{if(!batch.length)return;const operations=batch.map(c=>({updateOne:{filter:{_id:c._id},update:{$setOnInsert:c},upsert:true}}));await col.bulkWrite(operations,{ordered:false});batch=[];last=seen;await progress.updateOne({_id:key},{$set:{state:'importing',count:last,expected:manifest.yearCounts[year],updatedAt:new Date(),datasetRevision:audit.datasetRevision}},{upsert:true});};
  const lines=createInterface({input:createReadStream(path).pipe(createGunzip()),crlfDelay:Infinity});
  for await(const line of lines){seen++;if(seen<=(prev?.count||0))continue;const c=compactHistorical(JSON.parse(line));if(c.y!==year)throw Error('Incorrect year');batch.push(c);if(batch.length>=1000){await flush();if(last%25000===0)console.log(JSON.stringify({year,processed:last,expected:manifest.yearCounts[year]}));}}
  await flush();if(seen!==manifest.yearCounts[year])throw Error(`Wrong source count for ${year}`);
  const actual=await col.countDocuments({y:year});if(actual!==seen)throw Error(`Stored count mismatch for ${year}: ${actual}/${seen}`);
  await progress.updateOne({_id:key},{$set:{state:'ready',count:actual,expected:seen,updatedAt:new Date()}},{upsert:true});console.log(JSON.stringify({year,state:'ready',count:actual}));
 }
 console.log('All historical years imported and verified.');
}finally{await client.close();}
