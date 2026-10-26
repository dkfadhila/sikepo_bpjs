import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export const sessionHash = value => createHash('sha256').update(value).digest('hex');
export const newToken = () => randomBytes(32).toString('hex');
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64);
  return `${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  if (typeof stored !== 'string' || !/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(stored)) return false;
  const [salt, digest] = stored.split(':');
  const key = await scrypt(password, salt, 64);
  return timingSafeEqual(key, Buffer.from(digest, 'hex'));
}
export function allowedOrigin(origin, origins) { return typeof origin === 'string' && origins.includes(origin); }
export function publicUser(user) { return { email: user.email, name: user.name, role: user.role, demo: true }; }
export const demoAccounts = [
  { email: 'admin@demo.sikepo.tech', name: 'Admin demo', role: 'SA', password: 'SikepoDemo!2026' },
  { email: 'verifikator@demo.sikepo.tech', name: 'Verifikator demo', role: 'VK', password: 'SikepoDemo!2026' },
  { email: 'satgas@demo.sikepo.tech', name: 'Satgas demo', role: 'ST', password: 'SikepoDemo!2026' },
  { email: 'auditor@demo.sikepo.tech', name: 'Auditor demo', role: 'AU', password: 'SikepoDemo!2026' }
];
