// Builds yesterday's daily report for the Head of Department and Vice Dean and encrypts it with
// report_public.pem. GitHub Actions publishes the encrypted file on the `daily-report` branch; a scheduled
// Claude task holding the private key decrypts it and sends it from the Course Director's Gmail.
// Only aggregate figures are included (no student names).
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { writeFileSync } from 'node:fs';
import { computeStats } from './shared/stats.js';
import { PRACTICAL_WEEKS } from './shared/course.js';
import { cairoDate, loadAll, reportHtml, actionHtml } from './report-lib.js';

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
// REPORT_KIND=evening: today's figures at about 17:30 Cairo for the Course Director's team (Settings → report recipients).
// Otherwise: yesterday's figures for the Head of Department and Vice Dean (09:00).
const evening = process.env.REPORT_KIND === 'evening';
const day = evening ? cairoDate() : cairoDate(new Date(Date.now() - 86400e3));
let to;
if (evening) to = [...new Set((all.config.reportRecipients || []).map((e) => String(e).trim().toLowerCase()).filter((e) => e.endsWith('@dentistry.cu.edu.eg')))];
else { const snap = await db.collection('roster').where('role', 'in', ['hod', 'vicedean']).get(); to = [...new Set(snap.docs.map((d) => String(d.data().email || d.id).trim().toLowerCase()).filter((e) => e.includes('@')))]; }
const heading = evening ? 'End-of-day report' : 'Daily report';
const out = { day, to, subject: `${heading} ${day} — Year 3 Conservative Dentistry`, html: evening ? reportHtml(st, all, day, heading, process.env.SITE_URL || '').replace(/(<\/p>)/, `$1${actionHtml(all, day)}`) : reportHtml(st, all, day, heading, process.env.SITE_URL || ''), builtAt: new Date().toISOString() };
writeFileSync(process.argv[2] || 'report.json', JSON.stringify(out));
console.log('Report built for', day, '→', to.length, 'recipient(s)');
