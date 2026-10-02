// Firebase backend (Firestore + Storage + Auth + Functions).
import { initializeApp } from 'firebase/app';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDoc, setDoc, updateDoc,
  deleteDoc, collection, query, where, orderBy, limit, getDocs, onSnapshot, addDoc, runTransaction,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  getAuth, onAuthStateChanged, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, signOut,
  GoogleAuthProvider, OAuthProvider, signInWithPopup, signInWithRedirect,
} from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

let app, fs, st, auth, fn;

export function initFire(config) {
  app = initializeApp(config);
  fs = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  st = getStorage(app);
  auth = getAuth(app);
  fn = getFunctions(app, 'europe-west1');
  return fireStore;
}

// The app calls the people list 'users'; in Firestore it lives in 'roster' (keyed by email).
const A = (c) => (c === 'users' ? 'roster' : c);

function q(col, filters = [], opts = {}) {
  const parts = filters.map(([f, op, v]) => where(f, op, v));
  if (opts.orderBy) parts.push(orderBy(opts.orderBy, opts.desc ? 'desc' : 'asc'));
  if (opts.limit) parts.push(limit(opts.limit));
  return query(collection(fs, A(col)), ...parts);
}
const rows = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

async function queueJob(type, data) {
  const email = (auth.currentUser?.email || '').toLowerCase();
  const ref = await addDoc(collection(fs, 'jobs'), { type, data: data || {}, email, status: 'queued', at: Date.now() });
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => { off(); reject(Object.assign(new Error('The server did not answer in time. Try again.'), { code: 'deadline-exceeded' })); }, 150000);
    const off = onSnapshot(ref, (s) => {
      const d = s.data(); if (!d || d.status === 'queued') return;
      clearTimeout(t); off();
      if (d.status === 'done') resolve(d.result); else reject(Object.assign(new Error(d.error || 'Request failed'), { code: d.code }));
    }, (e) => { clearTimeout(t); reject(e); });
  });
}

export const fireStore = {
  mode: 'live',
  now: () => Date.now(),
  async get(col, id) { const s = await getDoc(doc(fs, A(col), id)); return s.exists() ? { id: s.id, ...s.data() } : null; },
  async set(col, id, data, opts = {}) { await setDoc(doc(fs, A(col), id), data, opts.merge ? { merge: true } : {}); return id; },
  async create(col, id, data) {
    await runTransaction(fs, async (tx) => {
      const r = doc(fs, A(col), id);
      const s = await tx.get(r);
      if (s.exists()) { const e = new Error('Already exists'); e.code = 'already-exists'; throw e; }
      tx.set(r, data);
    });
    return id;
  },
  // Offline-tolerant create: queued by Firestore when there is no signal; the rules make it create-only.
  createQueued(col, id, data) { return setDoc(doc(fs, A(col), id), data); },
  async add(col, data) { const r = await addDoc(collection(fs, A(col)), data); return r.id; },
  async update(col, id, patch) { await updateDoc(doc(fs, A(col), id), patch); },
  async del(col, id) { await deleteDoc(doc(fs, A(col), id)); },
  async query(col, filters, opts) { return rows(await getDocs(q(col, filters, opts))); },
  watch(col, filters, opts, cb, onErr) {
    return onSnapshot(q(col, filters, opts), { includeMetadataChanges: true },
      (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data(), _pending: d.metadata.hasPendingWrites })), { pending: s.metadata.hasPendingWrites }),
      (e) => { console.error(col, e); onErr && onErr(e); });
  },
  watchDoc(col, id, cb) {
    return onSnapshot(doc(fs, A(col), id), { includeMetadataChanges: true },
      (s) => cb(s.exists() ? { id: s.id, ...s.data(), _pending: s.metadata.hasPendingWrites } : null),
      (e) => { console.error(col, id, e); cb(null); });
  },
  async putFile(path, blob) { const r = ref(st, path); await uploadBytes(r, blob, { contentType: blob.type || 'image/jpeg' }); return getDownloadURL(r); },
  async fileUrl(path) { try { return await getDownloadURL(ref(st, path)); } catch (e) { return null; } },
  // Try the direct call first; if the organisation blocks it, fall back to the request queue.
  async call(name, data) {
    try { const r = await httpsCallable(fn, name, { timeout: 120000 })(data); return r.data; }
    catch (e) {
      // A blocked call (organisation policy / no public access) surfaces as 'internal' or 'unavailable'.
      if (!/internal|unavailable/.test(String(e.code || ''))) throw e;
      return queueJob(name, data);
    }
  },
  auth: {
    onChange: (cb) => onAuthStateChanged(auth, cb),
    async sendLink(email) {
      const url = location.origin + location.pathname;
      await sendSignInLinkToEmail(auth, email, { url, handleCodeInApp: true });
      try { localStorage.setItem('signin-email', email); } catch (e) { /* ignore */ }
    },
    isLink: () => isSignInWithEmailLink(auth, location.href),
    async completeLink(emailIfAsked) {
      let email = emailIfAsked;
      try { email = email || localStorage.getItem('signin-email'); } catch (e) { /* ignore */ }
      if (!email) return { needEmail: true };
      await signInWithEmailLink(auth, email, location.href);
      try { localStorage.removeItem('signin-email'); } catch (e) { /* ignore */ }
      history.replaceState(null, '', location.pathname + '#/');
      return { ok: true };
    },
    // One tap with the faculty Google account; falls back to a full-page redirect where pop-ups are blocked.
    google: async () => {
      const p = new GoogleAuthProvider(); p.setCustomParameters({ hd: 'dentistry.cu.edu.eg' });
      try { return await signInWithPopup(auth, p); }
      catch (e) { if (/popup-blocked|operation-not-supported|popup-closed-by-browser/.test(e.code || '')) return signInWithRedirect(auth, p); throw e; }
    },
    lastEmail: () => { try { return localStorage.getItem('signin-email') || ''; } catch (e) { return ''; } },
    microsoft: () => signInWithPopup(auth, new OAuthProvider('microsoft.com')),
    signOut: () => signOut(auth),
  },
};
