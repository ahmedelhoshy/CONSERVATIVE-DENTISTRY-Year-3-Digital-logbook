// Builds yesterday's daily report for the Head of Department and Vice Dean and encrypts it with
// report_public.pem. GitHub Actions publishes the encrypted file on the `daily-report` branch; a scheduled
// Claude task holding the private key decrypts it and sends it from the Course Director's Gmail.
// Only aggregate figures are included (no student names).
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { writeFileSync } from 'node:fs';
import { computeStats } from './shared/stats.js';
import { PRACTICAL_WEEKS } from './shared/course.js';
import { cairoDate, loadAll, reportHtml } from './report-lib.js';

initializeApp({ credential: applicationDefault(), projectId: process.env.FB_PROJECT_ID });
const db = getFirestore();
// The leaders' report counts only from the official start of the platform (3 October 2026);
// orientation weeks, paper-register weeks and trial sessions before that are left out of the totals.
const START = '2026-10-03';
const raw = await loadAll(db);
const weeks = PRACTICAL_WEEKS.filter((w) => w.from >= START);
const wk = new Set(weeks.map((w) => w.w));
const sessions = raw.sessions.filter((x) => (x.date || '') >= START);
const sids = new Set(sessions.map((x) => x.id));
const all = { ...raw, sessions, attendance: raw.attendance.filter((a) => sids.has(a.sid)), entries: raw.entries.filter((e) => wk.has(e.week)), paperwork: raw.paperwork.filter((p) => wk.has(p.week)) };
const st = computeStats({ ...all, weeks, today: cairoDate() });
const day = cairoDate(new Date(Date.now() - 86400e3));
const snap = await db.collection('roster').where('role', 'in', ['hod', 'vicedean']).get();
const to = [...new Set(snap.docs.map((d) => String(d.data().email || d.id).trim().toLowerCase()).filter((e) => e.includes('@')))];
const out = { day, to, subject: `Daily report ${day} — Year 3 Conservative Dentistry`, html: reportHtml(st, all, day, 'Daily report', process.env.SITE_URL || ''), builtAt: new Date().toISOString() };
writeFileSync(process.argv[2] || 'report.json', JSON.stringify(out));
console.log('Report built for', day, '→', to.length, 'recipient(s)');
