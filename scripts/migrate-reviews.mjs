import 'dotenv/config';
import {MongoClient} from 'mongodb';
import {historicalId} from '../server/history-store.js';
if((process.env.MONGODB_DATABASE||'sikepo')!=='sikepo')throw Error('Unexpected database');
const client=new MongoClient(process.env.MONGODB_URI);await client.connect();
try{
 const db=client.db('sikepo'),old=db.collection('claims'),canonical=db.collection('historical_reviews_v3');
 const rows=await old.find({datasetVersion:'sikepo-operational-3.0',reviewVersion:{$gt:0}}).toArray(), pending=[];
 for(const c of rows){const key=historicalId(c.sourceId||'')?.id;if(!key)throw Error('Reviewed claim missing source identity');const prior=await canonical.findOne({_id:key});
  if(prior){if(JSON.stringify(prior.reviewHistory)!==JSON.stringify(c.reviewHistory))throw Error(`Conflicting histories for ${c.sourceId}; no migration performed`);continue;}
  pending.push({_id:key,status:c.status,reviewVersion:c.reviewVersion,lastReview:c.lastReview,reviewHistory:c.reviewHistory||[],migratedFrom:c.id});}
 for(const r of pending)await canonical.updateOne({_id:r._id},{$setOnInsert:r},{upsert:true});
 console.log(JSON.stringify({examined:rows.length,migrated:pending.length,conflicts:0}));
}finally{await client.close();}
