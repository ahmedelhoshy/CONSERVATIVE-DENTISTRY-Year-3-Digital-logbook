// Full Firestore backup (all collections, including subcollections). Output is encrypted by the workflow; nothing personal is printed.
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { writeFileSync } from 'node:fs';
initializeApp({ credential: applicationDefault(), projectId: process.env.FB_PROJECT_ID });
const db = getFirestore();
const plain = (v) => v instanceof Timestamp ? { _ts: v.toMillis() } : Array.isArray(v) ? v.map(plain) : v && typeof v === 'object' && v.constructor === Object ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)])) : v && v.path && v.firestore ? { _ref: v.path } : v;
const out = { generatedAt: Date.now(), project: process.env.FB_PROJECT_ID, collections: {} };
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
writeFileSync(process.argv[2], JSON.stringify(out));
const top = Object.entries(counts).filter(([k]) => !k.includes('/')).map(([k, n]) => `${k} ${n}`).join(' · ');
console.log(`::notice title=Backup::${Object.keys(counts).length} collections · ${Object.values(counts).reduce((a, b) => a + b, 0)} documents · ${top}`);
