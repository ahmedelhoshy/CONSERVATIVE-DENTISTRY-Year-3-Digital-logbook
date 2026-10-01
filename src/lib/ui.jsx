import { useEffect, useState, useRef } from 'preact/hooks';
import { render } from 'preact';
import { store, labNo } from './logic.js';

// ---------- language ----------
let LANG = 'en';
try { LANG = localStorage.getItem('lang') || 'en'; } catch (e) { /* ignore */ }
const langSubs = new Set();
export const lang = () => LANG;
export function setLang(l) {
  LANG = l; try { localStorage.setItem('lang', l); } catch (e) { /* ignore */ }
  document.documentElement.lang = l; document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
  langSubs.forEach((f) => f(l));
}
export function useLang() { const [l, s] = useState(LANG); useEffect(() => { langSubs.add(s); return () => langSubs.delete(s); }, []); return l; }
export const L = (en, ar) => (LANG === 'ar' && ar ? ar : en);

// ---------- data hooks ----------
const key = (x) => JSON.stringify(x);
export function useQuery(col, filters, opts = {}, deps = []) {
  const [state, setState] = useState({ rows: null, pending: false, error: null });
  useEffect(() => {
    if (!col || filters === null) { setState({ rows: [], pending: false }); return; }
    const off = store().watch(col, filters, opts, (rows, meta) => setState({ rows, pending: meta.pending, error: null }), (e) => setState({ rows: [], pending: false, error: e }));
    return off;
  }, [col, key(filters), key(opts), ...deps]);
  return state;
}
export function useDoc(col, id) {
  const [d, setD] = useState(undefined);
  useEffect(() => { if (!id) { setD(null); return; } return store().watchDoc(col, id, setD); }, [col, id]);
  return d;
}
export function useNow(ms = 1000) {
  const [n, setN] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setN(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return n;
}

// ---------- toast ----------
let toastHost = null;
export function toast(msg, ms = 2600) {
  if (!toastHost) { toastHost = document.createElement('div'); document.body.appendChild(toastHost); }
  render(<div class="toast" role="status">{msg}</div>, toastHost);
  clearTimeout(toast._t); toast._t = setTimeout(() => render(null, toastHost), ms);
}

// ---------- small components ----------
export const Band = ({ k, title }) => <span class={'band ' + (k || 'N')} title={title}>{k || '–'}</span>;
export const Pill = ({ kind, children }) => <span class={'pill ' + (kind || '')}>{children}</span>;
export function Kpi({ label, value, sub, kind }) {
  return <div class={'kpi ' + (kind || '')}><div class="l">{label}</div><div class="v">{value ?? '–'}</div>{sub && <div class="s">{sub}</div>}</div>;
}
export function Bar({ value, kind }) { return <div class={'bar ' + (kind || '')}><i style={{ width: Math.max(0, Math.min(100, value || 0)) + '%' }} /></div>; }
export function Sheet({ onClose, children, label }) {
  useEffect(() => { const f = (e) => e.key === 'Escape' && onClose(); addEventListener('keydown', f); return () => removeEventListener('keydown', f); }, []);
  return <div class="sheet" onClick={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-label={label}><div class="panel">{children}</div></div>;
}
export function Confirm({ text, onYes, onNo, yes = 'Confirm', needReason }) {
  const [reason, setReason] = useState('');
  return <Sheet onClose={onNo} label="Confirm"><h3>{text}</h3>{needReason && <label class="fld">Reason (saved in the audit log)<textarea id="confirm-reason" value={reason} onInput={(e) => setReason(e.target.value)} /></label>}<div class="row"><button class="btn primary" disabled={needReason && !reason.trim()} onClick={() => onYes(reason)}>{yes}</button><button class="btn" onClick={onNo}>Cancel</button></div></Sheet>;
}
export function Empty({ children }) { return <div class="empty">{children}</div>; }

export function fmtDate(iso, opts = { weekday: 'short', day: 'numeric', month: 'short' }) {
  if (!iso) return '';
  const d = typeof iso === 'number' ? new Date(iso) : new Date(iso + 'T12:00:00');
  return d.toLocaleDateString(LANG === 'ar' ? 'ar-EG' : 'en-GB', opts);
}
export function fmtTime(ms) { return ms ? new Date(ms).toLocaleTimeString(LANG === 'ar' ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit' }) : ''; }
export function fmtDT(ms) { return ms ? `${fmtDate(ms, { day: 'numeric', month: 'short' })} ${fmtTime(ms)}` : ''; }
export function ago(ms) {
  const m = Math.round((Date.now() - ms) / 60e3);
  if (m < 1) return L('just now', 'الآن'); if (m < 60) return L(`${m} min ago`, `منذ ${m} دقيقة`);
  const hr = Math.round(m / 60); if (hr < 48) return L(`${hr} h ago`, `منذ ${hr} ساعة`);
  return fmtDate(ms, { day: 'numeric', month: 'short' });
}

// ---------- icons (inline, stroke) ----------
const P = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2M14 18h2v2M18 18h2v2',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5',
  tooth: 'M7 3c-2.5 0-4 2-4 4.5 0 3 1.5 4 2 7 .4 2.6.8 6.5 2.5 6.5s1.6-4 2.5-5.5c.5-.8 1.5-.8 2 0 .9 1.5.8 5.5 2.5 5.5s2.1-3.9 2.5-6.5c.5-3 2-4 2-7C21 5 19.5 3 17 3c-2 0-3 1-5 1S9 3 7 3z',
  chat: 'M4 5h16v11H9l-5 4z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
};
export const Icon = ({ n }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={P[n]} /></svg>;

// Simple SVG line/bar chart drawn to scale.
export function MiniChart({ data, xKey, yKey, max = 100, unit = '%', kind = 'line', height = 150 }) {
  const w = 560, H = height, padL = 34, padB = 22, padT = 10, padR = 10;
  const pts = data.filter((d) => d[yKey] != null);
  if (!pts.length) return <Empty>No data yet.</Empty>;
  const X = (i) => padL + (data.length === 1 ? (w - padL - padR) / 2 : (i * (w - padL - padR)) / (data.length - 1));
  const Y = (v) => padT + (1 - v / max) * (H - padT - padB);
  const ticks = [0, max / 2, max];
  const line = data.map((d, i) => (d[yKey] == null ? null : [X(i), Y(d[yKey])])).filter(Boolean);
  return <div class="chart"><svg viewBox={`0 0 ${w} ${H}`} role="img">
    {ticks.map((t) => <g><line x1={padL} x2={w - padR} y1={Y(t)} y2={Y(t)} stroke="var(--line)" stroke-dasharray="3 3" /><text x={padL - 5} y={Y(t) + 3} text-anchor="end">{t}{unit}</text></g>)}
    {kind === 'bar' ? data.map((d, i) => d[yKey] == null ? null : <rect x={X(i) - 9} y={Y(d[yKey])} width="18" height={Math.max(0, Y(0) - Y(d[yKey]))} rx="3" fill="var(--primary)" />) : <g>
      <path d={`M${line.map((p) => p.join(',')).join('L')}L${line[line.length - 1][0]},${Y(0)}L${line[0][0]},${Y(0)}Z`} fill="var(--primary)" opacity=".1" />
      <path d={`M${line.map((p) => p.join(',')).join('L')}`} fill="none" stroke="var(--primary)" stroke-width="2" />
      {line.map((p, i) => <circle cx={p[0]} cy={p[1]} r={i === line.length - 1 ? 4.5 : 2.5} fill={i === line.length - 1 ? 'var(--gold)' : 'var(--primary)'} />)}
    </g>}
    {data.map((d, i) => <text x={X(i)} y={H - 6} text-anchor="middle">{d[xKey]}</text>)}
  </svg></div>;
}

export function useOnce(fn, deps = []) { const r = useRef(false); useEffect(() => { if (!r.current) { r.current = true; fn(); } }, deps); }

// "Lab 1 · requirements" / "Lab 2 · discussion & project" (see labNo in logic.js)
export function labTitle(s, withSection = true) {
  const n = labNo(s); const sec = withSection && s.section ? ` · ${L('Section', 'سكشن')} ${s.section}` : '';
  if (n === 1) return L('Lab 1 · requirements', 'لاب ١ · المتطلبات') + sec;
  if (n) return L(`Lab ${n} · discussion & project`, `لاب ${n} · مناقشة ومشروع`) + sec;
  return L('Lab', 'لاب') + sec;
}
