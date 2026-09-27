// One-time setup: gives the Course Director access and writes default settings.
// Runs in the GitHub deploy workflow with the project's service account.
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
const owner = (process.env.OWNER_EMAIL || '').trim().toLowerCase();
const name = process.env.OWNER_NAME || 'Course Director';
if (!owner) { console.log('OWNER_EMAIL not set — skipping bootstrap'); process.exit(0); }
initializeApp({ credential: applicationDefault(), projectId: process.env.FB_PROJECT_ID });
const db = getFirestore();
const r = db.doc(`roster/${owner}`);
if (!(await r.get()).exists) { await r.set({ uid: owner, email: owner, name, role: 'director', sections: [], lectures: [1] }); console.log('Director added:', owner); }
const c = db.doc('config/course');
if (!(await c.get()).exists) { await c.set({ absenceLimitPct: 25, minTeethPerLab: 2, aiEnabled: true, aiDailyLimit: 1500, reportRecipients: [owner] }); console.log('Default settings written'); }
console.log('Bootstrap done');
