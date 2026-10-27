import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import path from 'node:path';
import { z } from 'zod';
import { newToken, sessionHash, verifyPassword, publicUser, allowedOrigin } from './security.js';
import { claimSchema } from './agent.js';
import { assessedClaims, dataInfo } from './claims.js';

const publicRoot = path.resolve('spartanai-recreation/dist');
const loginSchema = z.object({ email: z.string().email().max(120), password: z.string().min(1).max(128) }).strict();
export function createApp({ db, investigate, config, captureException = () => {} }) {
  const app = express(), production = config.production;
  const origins = [config.appOrigin, config.dashboardOrigin];
  const cookie = { httpOnly: true, secure: production, sameSite: 'lax', path: '/', ...(production ? { domain: '.sikepo.tech' } : {}) };
  app.disable('x-powered-by');
  // Render provides exactly one trusted reverse proxy. Never trust arbitrary X-Forwarded-For.
  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use(cookieParser());
  app.use(express.json({ limit: '8kb' }));
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use('/api', (req, res, next) => {
    if (!['GET','HEAD','OPTIONS'].includes(req.method) && !allowedOrigin(req.get('origin'), origins)) return res.status(403).json({ error: 'Origin tidak diizinkan.' });
    next();
  });
  app.get('/api/health', (_req,res) => res.json({ status: db ? 'ok' : 'not-ready', service: 'sikepo', database: Boolean(db), gemma: Boolean(config.googleKey), monitoring: Boolean(config.sentryDsn), dataset: dataInfo.version }));
  const dbRequired = (_req,res,next) => db ? next() : res.status(503).json({ error: 'Database belum tersambung. Login belum tersedia.' });
  async function session(req) {
    const token = req.cookies.sikepo_session;
    if (!db || typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return null;
    return db.collection('sessions').findOne({ tokenHash: sessionHash(token), expiresAt: { $gt: new Date() } });
  }
  const auth = async (req,res,next) => {
    const current = await session(req);
    if (!current) return res.status(401).json({ error: 'Silakan masuk terlebih dahulu.' });
    req.auth = current; next();
  };
  const loginLimiter = rateLimit({ windowMs: 15 * 60000, limit: 15, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' } });
  app.post('/api/auth/login', loginLimiter, dbRequired, async (req,res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Email atau kata sandi tidak valid.' });
    const email = parsed.data.email.toLowerCase();
    const user = await db.collection('users').findOne({ email, demo: true });
    const valid = await verifyPassword(parsed.data.password, user?.passwordHash || config.dummyPasswordHash);
    if (!user || !valid) return res.status(401).json({ error: 'Email atau kata sandi tidak cocok.' });
    const old = req.cookies.sikepo_session;
    if (typeof old === 'string') await db.collection('sessions').deleteOne({ tokenHash: sessionHash(old) });
    const token = newToken(), csrf = newToken();
    await db.collection('sessions').insertOne({ tokenHash: sessionHash(token), csrf, user: publicUser(user), createdAt: new Date(), expiresAt: new Date(Date.now() + 8*3600000) });
    res.cookie('sikepo_session', token, { ...cookie, maxAge: 8*3600000 });
    res.json({ user: publicUser(user), redirect: production ? config.dashboardOrigin + '/dashboard/' : '/dashboard/' });
  });
  app.get('/api/auth/me', auth, (req,res) => res.json({ user: publicUser(req.auth.user), csrf: req.auth.csrf }));
  app.get('/api/claims', auth, (_req,res) => res.json({ metadata: dataInfo, claims: assessedClaims }));
  app.post('/api/auth/logout', auth, async (req,res) => {
    if (req.get('x-csrf-token') !== req.auth.csrf) return res.status(403).json({ error: 'Sesi tidak valid.' });
    await db.collection('sessions').deleteOne({ tokenHash: req.auth.tokenHash });
    res.clearCookie('sikepo_session', cookie); res.json({ redirect: config.appOrigin + '/login' });
  });
  app.post('/api/investigate', auth, async (req,res) => {
    if (req.get('x-csrf-token') !== req.auth.csrf) return res.status(403).json({ error: 'Sesi tidak valid.' });
    if (!['SA','VK','ST'].includes(req.auth.user.role)) return res.status(403).json({ error: 'Akun auditor memiliki akses baca.' });
    const request = z.object({ id: z.string().max(32) }).strict().safeParse(req.body);
    if (!request.success) return res.status(400).json({ error: 'Pilih klaim dari dataset workspace.' });
    const claim = assessedClaims.find(c => c.id === request.data.id);
    if (!claim) return res.status(404).json({ error: 'Klaim tidak ditemukan.' });
    const { id, amount, tariff, los, normalLos, score } = claim;
    const parsed = claimSchema.safeParse({ id, amount, tariff, los, normalLos, score, signals: claim.signals.map(s => s.code) });
    if (!parsed.success) return res.status(500).json({ error: 'Dataset belum dapat diproses.' });
    if (!config.googleKey) return res.status(503).json({ error: 'Integrasi Gemma belum dikonfigurasi.' });
    // Global demo budget persists across restarts and is updated atomically.
    const day = new Date().toISOString().slice(0,10), budget = db.collection('ai_budget');
    await budget.updateOne({ _id: day }, { $setOnInsert: { count: 0, expiresAt: new Date(Date.now()+3*86400000) } }, { upsert: true });
    const usage = await budget.findOneAndUpdate({ _id: day, count: { $lt: config.aiDailyLimit } }, { $inc: { count: 1 } }, { returnDocument: 'after' });
    if (!usage) return res.status(429).json({ error: 'Kuota Gemma hari ini sudah terpakai.' });
    res.json(await investigate(parsed.data));
  });
  app.get(['/login','/login/'], (_req,res) => res.sendFile(path.join(publicRoot,'login/index.html')));
  app.use('/login', express.static(path.join(publicRoot, 'login'), { index: false, dotfiles: 'deny' }));
  app.use('/dashboard', async (req,res,next) => {
    res.set('Cache-Control','no-store');
    if (!await session(req)) return res.redirect(302, config.appOrigin + '/login');
    if (production && req.hostname === new URL(config.appOrigin).hostname) return res.redirect(302, config.dashboardOrigin + '/dashboard/' + (req.path === '/' ? '' : req.path.replace(/^\//,'')));
    next();
  }, express.static(path.join(publicRoot, 'dashboard'), { dotfiles: 'deny', maxAge: 0 }));
  app.get('/', (req,res,next) => {
    if (production && req.hostname === new URL(config.dashboardOrigin).hostname) return res.redirect('/dashboard/');
    next();
  });
  // All dashboard files are intercepted above before the general static handler.
  app.use('/dashboard', (_req,res) => res.sendStatus(404));
  app.use((req,res,next) => {
    let normalized;
    try { normalized = path.posix.normalize(decodeURIComponent(req.path).replaceAll('\\','/')).toLowerCase(); }
    catch { return res.sendStatus(400); }
    if (normalized === '/dashboard' || normalized.startsWith('/dashboard/')) return res.sendStatus(404);
    next();
  }, express.static(publicRoot, { dotfiles: 'deny', index: 'index.html', maxAge: '1h', setHeaders: (res,file) => { if (file.endsWith('.html')) res.set('Cache-Control','no-cache'); } }));
  app.use((_req,res) => res.status(404).send('Halaman tidak ditemukan.'));
  app.use((err,_req,res,_next) => {
    if (err.status >= 400 && err.status < 500) return res.status(err.status).json({ error: 'Permintaan tidak valid.' });
    captureException(err);
    res.status(err.status === 503 ? 503 : err.status === 502 ? 502 : 500).json({ error: err.status === 503 || err.status === 502 ? err.message : 'Layanan sedang mengalami kendala. Silakan coba lagi.' });
  });
  return app;
}
