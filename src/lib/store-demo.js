// In-browser demo backend: same interface as the Firebase backend, data kept in memory
// (and in localStorage when available) so the whole platform can be demonstrated without any server.
import { seedDemo } from './demo-seed.js';

const KEY = 'cu-logbook-demo-v3';
let db = null;
const listeners = new Set();

function load() {
  if (db) return db;
  try { const raw = localStorage.getItem(KEY); if (raw) db = JSON.parse(raw); } catch (e) { /* storage unavailable */ }
  if (!db) { db = seedDemo(); persist(); }
  return db;
}
let saveTimer = null;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* quota or private mode */ } }, 150);
}
function emit(col) { for (const l of listeners) if (l.col === col) l.run(); }
const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function match(doc, filters) {
  for (const [f, op, v] of filters || []) {
    const x = doc[f];
    if (op === '==' && x !== v) return false;
    if (op === '!=' && x === v) return false;
    if (op === 'in' && !v.includes(x)) return false;
    if (op === 'array-contains' && !(Array.isArray(x) && x.includes(v))) return false;
    if (op === 'array-contains-any' && !(Array.isArray(x) && x.some((y) => v.includes(y)))) return false;
    if (op === '>=' && !(x >= v)) return false;
    if (op === '<=' && !(x <= v)) return false;
    if (op === '>' && !(x > v)) return false;
    if (op === '<' && !(x < v)) return false;
  }
  return true;
}
function runQuery(col, filters, opts = {}) {
  const c = load()[col] || {};
  let rows = Object.entries(c).map(([id, d]) => ({ id, ...d })).filter((d) => match(d, filters));
  if (opts.orderBy) {
    const k = opts.orderBy, dir = opts.desc ? -1 : 1;
    rows.sort((a, b) => (a[k] > b[k] ? dir : a[k] < b[k] ? -dir : 0));
  }
  if (opts.limit) rows = rows.slice(0, opts.limit);
  return clone(rows);
}

export const demoStore = {
  mode: 'demo',
  now: () => Date.now(),
  async get(col, id) { const d = (load()[col] || {})[id]; return d ? { id, ...clone(d) } : null; },
  async set(col, id, data, opts = {}) {
    const all = load(); all[col] = all[col] || {};
    all[col][id] = opts.merge ? { ...(all[col][id] || {}), ...clone(data) } : clone(data);
    persist(); emit(col); return id;
  },
  async create(col, id, data) {
    const all = load(); all[col] = all[col] || {};
    if (all[col][id]) { const e = new Error('Already exists'); e.code = 'already-exists'; throw e; }
    all[col][id] = clone(data); persist(); emit(col); return id;
  },
  async add(col, data) { const id = rid(); await this.set(col, id, data); return id; },
  async update(col, id, patch) {
    const all = load(); if (!all[col] || !all[col][id]) throw new Error('Not found');
    all[col][id] = { ...all[col][id], ...clone(patch) }; persist(); emit(col);
  },
  async del(col, id) { const all = load(); if (all[col]) delete all[col][id]; persist(); emit(col); },
  async query(col, filters, opts) { return runQuery(col, filters, opts); },
  watch(col, filters, opts, cb) {
    const l = { col, run: () => cb(runQuery(col, filters, opts), { pending: false }) };
    listeners.add(l); setTimeout(l.run, 0);
    return () => listeners.delete(l);
  },
  watchDoc(col, id, cb) {
    const l = { col, run: async () => cb(await demoStore.get(col, id)) };
    listeners.add(l); setTimeout(l.run, 0);
    return () => listeners.delete(l);
  },
  async putFile(path, blob) {
    // Demo: keep the (already compressed) photo as a data URL.
    const url = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
    const all = load(); all._files = all._files || {}; all._files[path] = url; persist();
    return url;
  },
  async fileUrl(path) { return (load()._files || {})[path] || null; },
  reset() { db = seedDemo(); persist(); for (const l of listeners) l.run(); },
};
