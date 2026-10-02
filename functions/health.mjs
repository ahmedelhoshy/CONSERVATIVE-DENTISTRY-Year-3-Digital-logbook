// Read-only health check before a teaching day. Prints COUNTS ONLY (no student names, codes or emails)
// as GitHub notices, so the course team can verify the live data without opening the database.
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
initializeApp({ credential: applicationDefault(), projectId: process.env.FB_PROJECT_ID });
const db = getFirestore();
const day = process.env.CHECK_DAY || '2026-10-03';
const note = (t, m) => console.log(`::notice title=${t}::${m}`);

const sess = (await db.collection('sessions').where('date', '==', day).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
note(`Sessions ${day}`, sess.length ? sess.sort((a, b) => (a.start || '').localeCompare(b.start || '')).map((s) => `${s.type === 'lecture' ? 'Lecture ' + s.lectureNo : 'Lab ' + (s.labNo || '?') + ' S' + s.section} ${s.start}-${s.end} [${s.status || 'scheduled'}] ${String(s.title || '').slice(0, 40)}`).join(' ; ') : 'NONE');
const all = (await db.collection('sessions').get()).docs.map((d) => d.data());
const byWeek = {}; for (const s of all) byWeek[s.week || (s.type === 'lecture' ? 'L' : '?')] = (byWeek[s.week || (s.type === 'lecture' ? 'L' : '?')] || 0) + 1;
note('Sessions total', `${all.length} · per week ${JSON.stringify(byWeek)} · lectures ${all.filter((s) => s.type === 'lecture').map((s) => s.lectureNo + '@' + s.date).sort().join(' ')}`);

const roster = (await db.collection('roster').get()).docs.map((d) => d.data());
const roles = {}; for (const r of roster) roles[r.role] = (roles[r.role] || 0) + 1;
const st = roster.filter((r) => r.role === 'student');
note('Roster', `${JSON.stringify(roles)} · students without section ${st.filter((r) => !r.section).length} · students signed in ${st.filter((r) => r.lastLogin).length}/${st.length}`);
const staff = roster.filter((r) => r.role !== 'student');
note('Staff signed in', `${staff.filter((r) => r.lastLogin).length}/${staff.length} · lecturers with sections ${staff.filter((r) => r.role === 'lecturer' && (r.sections || []).length).length} · demonstrators on all 18 ${staff.filter((r) => r.role === 'demonstrator' && (r.sections || []).length === 18).length}/${staff.filter((r) => r.role === 'demonstrator').length}`);
const lec3 = staff.filter((r) => (r.lectures || []).includes(3));
note('Lecture 3 staff', `${lec3.length} account(s) with Lecture 3: ${lec3.map((r) => r.role + (r.lastLogin ? ' (signed in)' : ' (not signed in yet)')).join(', ') || 'NONE'}`);
const secCov = {}; for (const r of staff) if (r.role === 'lecturer') for (const s of r.sections || []) secCov[s] = (secCov[s] || 0) + 1;
note('Supervisor coverage', `sections with a supervisor: ${Object.keys(secCov).length}/18 · missing: ${Array.from({ length: 18 }, (_, i) => i + 1).filter((s) => !secCov[s]).join(',') || 'none'}`);

const mats = (await db.collection('materials').get()).docs.map((d) => d.data());
const lm = {}; for (const m of mats) if (m.lectureNo) (lm[m.lectureNo] = lm[m.lectureNo] || []).push(m.url ? 'link' : 'no-link');
note('Lecture materials', JSON.stringify(lm) + ` · atlas ${mats.filter((m) => m.kind === 'atlas').length}`);

const att = (await db.collection('attendance').get()).docs.map((d) => d.data());
const aw = {}; for (const a of att) if (a.week === 2 && a.status === 'confirmed') aw[a.section] = (aw[a.section] || 0) + 1;
note('Week 2 attendance by section', JSON.stringify(aw));
const ents = (await db.collection('entries').get()).docs.map((d) => d.data());
const gw = {}; for (const e of ents) if (e.week === 2 && e.review) gw[e.section] = (gw[e.section] || 0) + 1;
note('Week 2 graded teeth by section', JSON.stringify(gw) + ` · entries total ${ents.length}`);

const cfg = (await db.doc('config/course').get()).data() || {};
note('Settings', `aiEnabled ${cfg.aiEnabled} · aiDailyLimit ${cfg.aiDailyLimit} · absenceLimit ${cfg.absenceLimitPct}% · report recipients ${(cfg.reportRecipients || []).length}`);
const pj = (await db.collection('projects').get()).docs.map((d) => d.data());
note('Projects', `${pj.length} groups · with supervisor ${pj.filter((p) => p.lecturer).length} · with title ${pj.filter((p) => p.title).length}`);
const w3 = all.filter((s) => s.week === 3 && s.type === 'lab');
const t3 = {}; for (const s of w3) { const k = `Lab ${s.labNo || '?'}: ${String(s.title || '').slice(0, 30)}`; t3[k] = (t3[k] || 0) + 1; }
note('Week 3 lab sessions', JSON.stringify(t3));
// Is a given account on the roster? Checked by SHA-256 of the email so no address appears in the public log.
const CHECK = ['8078c1ce18307e860a94201a39f33d418d2a9d483f8ccd772de4b582a5ddb6fd'];
const have = new Map(roster.map((r) => [createHash('sha256').update(String(r.email || '').toLowerCase()).digest('hex'), r]));
note('Account check', CHECK.map((h, i) => { const r = have.get(h); return `#${i + 1}: ${r ? 'on roster (' + r.role + (r.section ? ', section ' + r.section : '') + (r.lastLogin ? ', signed in before' : ', never signed in') + ')' : 'NOT on roster'}`; }).join(' ; '));
console.log('health check done');
