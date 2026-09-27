// Firebase backend (Firestore + Storage + Auth + Functions).
import { initializeApp } from 'firebase/app';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDoc, setDoc, updateDoc,
  deleteDoc, collection, query, where, orderBy, limit, getDocs, onSnapshot, addDoc, runTransaction,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  getAuth, onAuthStateChanged, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, signOut,
  GoogleAuthProvider, OAuthProvider, signInWithPopup,
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
  async call(name, data) { const r = await httpsCallable(fn, name, { timeout: 120000 })(data); return r.data; },
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
    google: () => signInWithPopup(auth, new GoogleAuthProvider()),
    microsoft: () => signInWithPopup(auth, new OAuthProvider('microsoft.com')),
    signOut: () => signOut(auth),
  },
};
