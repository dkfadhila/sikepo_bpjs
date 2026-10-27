import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { seedClaimDatabase } from '../server/claim-store.js';
import { dataInfo } from '../server/claims.js';
if(!process.env.MONGODB_URI)throw new Error('MONGODB_URI is required');
const name=process.env.MONGODB_DATABASE||'sikepo';
if(name!=='sikepo')throw new Error('This import is restricted to the SIKEPO database');
const client=new MongoClient(process.env.MONGODB_URI,{maxPoolSize:5,serverSelectionTimeoutMS:15000});
try{
  await client.connect();const db=client.db(name);await seedClaimDatabase(db);
  console.log(JSON.stringify({database:name,dataset:dataInfo.version,claims:await db.collection('claims').countDocuments({datasetVersion:dataInfo.version}),model:await db.collection('models').countDocuments({_id:dataInfo.model.modelVersion}),artifacts:await db.collection('artifacts.files').countDocuments({'metadata.datasetVersion':dataInfo.version})}));
}finally{await client.close();}
