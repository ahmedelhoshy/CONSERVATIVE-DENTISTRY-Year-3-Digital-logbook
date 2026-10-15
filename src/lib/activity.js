// Light-weight student activity log for the student KPI board.
// One document per student per day: activity/{uid}_{YYYY-MM-DD} with the pages visited and the resources opened.
// Each item is written at most once per day per device, so the cost is a handful of writes per student per day.
import { me, store, isDemo } from './logic.js';

const sent = new Set();
const cairoDay = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); };

export function track(kind, key = '') {
  try {
    const u = me();
    if (!u || u.role !== 'student' || isDemo() || !kind) return;
    const d = cairoDay(), k = `${d}|${kind}|${key}`;
    if (sent.has(k)) return;
    sent.add(k);
    const data = { uid: String(u.uid), section: u.section || null, day: d, at: Date.now() };
    if (kind === 'page') data.pages = { [String(key).replace(/[^\w-]/g, '')]: true };
    else data.opens = { [kind]: { [hash(String(key))]: true } };
    store().set('activity', `${u.uid}_${d}`, data, { merge: true }).catch(() => {});
  } catch (e) { /* never block the app */ }
}

// Any link a student opens: the nearest [data-k] says which resource it belongs to.
let installed = false;
export function installLinkTracking() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener('click', (e) => {
    const a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    const href = a.href || '';
    const tagged = a.closest('[data-k]');
    const kind = tagged ? tagged.dataset.k : /\/guides\/(Game_|GV_)/.test(href) ? 'game' : href.startsWith(location.origin) ? null : 'link';
    if (kind) track(kind, href);
  }, true);
}
