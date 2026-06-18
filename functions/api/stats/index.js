// index.js — /api/stats 根路径 → 委托给 summary
import { getSummary, getClientIp, hashIp, errJson } from './core.js';
const RL = new Map();
export async function onRequest({ request, env }) {
  if (request.method !== 'GET') return errJson(405, 'method not allowed');
  const ip = hashIp(getClientIp(request));
  const now = Date.now();
  const arr = RL.get(ip) || [];
  const fresh = arr.filter(t => now - t < 60000);
  if (fresh.length >= 60) return errJson(429, 'rate limited');
  fresh.push(now); RL.set(ip, fresh);
  try { return await getSummary(env); } catch (e) { return errJson(500, e.message); }
}