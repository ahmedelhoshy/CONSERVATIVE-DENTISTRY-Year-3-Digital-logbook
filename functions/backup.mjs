// Full platform backup: every Firestore collection (incl. subcollections) + a manifest of every uploaded file,
// and the files themselves uploaded since the previous backup (photos, materials). Output is encrypted by the workflow.
// summary.json holds COUNTS ONLY (no names, IDs or emails) so it can be stored and emailed in plain text.
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
const [outJson, summaryJson, prevSummary, filesDir] = process.argv.slice(2);
initializeApp({ credential: applicationDefault(), projectId: process.env.FB_PROJECT_ID, storageBucket: process.env.FB_BUCKET || 'digitallogbook-dfc3e.firebasestorage.app' });
const db = getFirestore();
const plain = (v) => v instanceof Timestamp ? { _ts: v.toMillis() } : Array.isArray(v) ? v.map(plain) : v && typeof v === 'object' && v.constructor === Object ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)])) : v && v.path && v.firestore ? { _ref: v.path } : v;
const now = Date.now();
const prev = prevSummary && existsSync(prevSummary) ? JSON.parse(readFileSync(prevSummary, 'utf8')) : null;
const since = prev?.generatedAt || 0;
const out = { generatedAt: now, project: process.env.FB_PROJECT_ID, collections: {}, files: [] };
const counts = {};
async function dump(ref, prefix) {
  for (const col of await ref.listCollections()) {
    const key = prefix ? `${prefix}/${col.id}` : col.id;
    const snap = await col.get();
    out.collections[key] = Object.fromEntries(snap.docs.map((d) => [d.id, plain(d.data())]));
    counts[key] = snap.size;
    for (const d of snap.docs) await dump(d.ref, `${key}/${d.id}`);
  }
}
await dump(db, '');

// Uploaded files: manifest of all, download the new ones.
let newFiles = 0, newBytes = 0, totalBytes = 0;
try {
  const [files] = await getStorage().bucket().getFiles();
  for (const f of files) {
    const m = f.metadata; const t = Date.parse(m.updated || m.timeCreated || 0); const size = Number(m.size || 0); totalBytes += size;
    out.files.push({ name: f.name, size, md5: m.md5Hash, contentType: m.contentType, updated: t });
    if (filesDir && t > since) { const p = join(filesDir, f.name); mkdirSync(dirname(p), { recursive: true }); await f.download({ destination: p }); newFiles++; newBytes += size; }
  }
} catch (e) { console.log('::warning title=Files::could not list/download uploaded files:', e.message); }
writeFileSync(outJson, JSON.stringify(out));

// Counts-only summary (safe to store and email).
const C = out.collections; const vals = (k) => Object.values(C[k] || {});
const ts = (d) => { for (const k of ['updatedAt', 'at', 'createdAt', 'submittedAt', 'publishAt']) { const v = d[k]; const n = v && v._ts ? v._ts : v; if (typeof n === 'number') return n; } return 0; };
const changed = {}; for (const k of Object.keys(C).filter((k) => !k.includes('/'))) changed[k] = vals(k).filter((d) => ts(d) > since).length;
const cnt = (arr, f) => arr.reduce((m, x) => { const v = f(x) ?? 'none'; m[v] = (m[v] || 0) + 1; return m; }, {});
const roster = vals('roster'); const entries = vals('entries').filter((e) => !e.practice); const att = vals('attendance');
const summary = {
  generatedAt: now, previousBackupAt: since || null,
  documents: Object.values(counts).reduce((a, b) => a + b, 0), collections: Object.fromEntries(Object.entries(counts).filter(([k]) => !k.includes('/'))),
  changedSincePrevious: changed,
  people: cnt(roster, (r) => r.role),
  attendance: { byType: cnt(att, (a) => a.type), byMethod: cnt(att, (a) => a.method), byStatus: cnt(att, (a) => a.status) },
  teeth: { byStatus: cnt(entries, (e) => e.status), withPhotos: entries.filter((e) => (e.photos || []).length).length, practiceAnalyses: vals('entries').filter((e) => e.practice).length },
  surveys: cnt(vals('surveys'), (s) => `${s.sid}:${s.role}`),
  materials: vals('materials').length, announcements: vals('announcements').length, messages: vals('messages').length, auditEvents: vals('audit').length,
  files: { total: out.files.length, totalMB: +(totalBytes / 1048576).toFixed(1), newSincePrevious: newFiles, newMB: +(newBytes / 1048576).toFixed(1) },
};
writeFileSync(summaryJson, JSON.stringify(summary, null, 1));
console.log(`::notice title=Backup::${summary.documents} documents · ${summary.files.total} files (${summary.files.totalMB} MB) · new files ${newFiles}`);
