import 'dotenv/config';
import * as Sentry from '@sentry/node';
import { MongoClient } from 'mongodb';
import { createApp } from './app.js';
import { createClaimInvestigator } from './agent.js';
import { demoAccounts, hashPassword } from './security.js';
import { seedClaimDatabase, createClaimStore } from './claim-store.js';

const config = {
  production: process.env.NODE_ENV === 'production',
  appOrigin: process.env.APP_ORIGIN || 'http://localhost:7731',
  dashboardOrigin: process.env.DASHBOARD_ORIGIN || 'http://localhost:7731',
  googleKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
  model: process.env.GEMMA_MODEL || 'gemma-4-26b-a4b-it',
  sentryDsn: process.env.SENTRY_DSN || '',
  aiDailyLimit: Math.max(1, Math.min(100, Number(process.env.AI_DAILY_LIMIT) || 20)),
  dummyPasswordHash: await hashPassword('invalid-account-placeholder')
};
Sentry.init({ dsn: config.sentryDsn || undefined, enabled: Boolean(config.sentryDsn), environment: config.production ? 'production' : 'development', tracesSampleRate: 0.1, sendDefaultPii: false,
  beforeSend(event) { if(event.request) { delete event.request.cookies; delete event.request.data; delete event.request.headers; delete event.request.query_string; } if(event.user) delete event.user; return event; } });
Sentry.setTag('service', 'sikepo');
let db, client;
if (process.env.MONGODB_URI) {
  client = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 10, serverSelectionTimeoutMS: 15000 });
  try {
    await client.connect();
    db = client.db(process.env.MONGODB_DATABASE || 'sikepo');
    await db.command({ ping: 1 });
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('sessions').createIndex({ tokenHash: 1 }, { unique: true });
    await db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await db.collection('ai_budget').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await seedClaimDatabase(db);
    for (const account of demoAccounts) {
      const { password, ...profile } = account;
      await db.collection('users').updateOne({ email: account.email }, { $setOnInsert: { ...profile, demo: true, passwordHash: await hashPassword(password), createdAt: new Date() } }, { upsert: true });
    }
    console.log('SIKEPO database connected; claims and model artifacts ready.');
  } catch (error) {
    console.error('SIKEPO database startup failed. Check credentials and Atlas network access.');
    Sentry.captureException(new Error('SIKEPO database startup failed'));
    await client.close();
    if (config.production) { await Sentry.flush(2000); process.exit(1); }
  }
} else if (config.production) { console.error('MONGODB_URI is required in production.'); process.exit(1); }
const app = createApp({ db, config, claimStore: db ? createClaimStore(db) : null, investigate: createClaimInvestigator(config.googleKey, config.model), captureException: Sentry.captureException });
const server = app.listen(Number(process.env.PORT) || 7731, '0.0.0.0', () => console.log('SIKEPO server listening.'));
async function shutdown() { server.close(async () => { await client?.close(); await Sentry.flush(2000); process.exit(0); }); }
process.on('SIGTERM',shutdown); process.on('SIGINT',shutdown);
