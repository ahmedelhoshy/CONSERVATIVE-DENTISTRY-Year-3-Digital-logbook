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
const CHECK = [["fe96f9152da8879265382d40e94a4daa10577e52561028ae0c73d82992d57fba", "97612e15040a51ae8a8ca84557258f2129d02e25d2c61b28e43734e796986188"], ["bc37c3d64ed04bf63c0a5c011e45f32452e14425115b57f166528296ad504f44", "dcd859c8a0c299bc87d3f802c72a5e282f460144116c73f0254c6ad3443556d9"], ["41a945ea67ad29f1825047a163d6371f0ee710f50618a653643fb2e0719b294e", "3fedd9795a40d289bd1a6f283c125622039aca199380e84c7a90d2321cf79945"], ["9ddc3ef1efacf3c5f5b0c6de323fceac4ff306965de3dac28a3e8c888683cc38", "b587d18296ec6d970e24511095d7c08dda388808fd18dd20fb141b34cd67956d"], ["4fd746f2a675ef922af595270b4955ec309a5603bddb791b88d01423b736139e", "98dcd65bad0dd473d0ab1f6412a7acac70ceb110752372b05a1338e632774fd0"], ["475a89820c921b2b6b102c1c30722033fb370f562718279fc17c5147ece9e286", "31ece28e5941e175ff6afae021b431129dab1db82ed79112a255980d5ddedcfa"], ["47510f9c9b1c0379d80876c5220e9480dfc2fc92342029092d539f7587b0df91", "0629ee66bb1f2b04d6db2856f3edfcaa72765d3bd389d02aa80d4ecb49f55089"], ["65573521695f95c713d61845eae926ee12c6b8e4d8b380202d420ff0f9fb823d", "3a31a7b6a76d7f6ffcf05325aa03ce2816050fbd30357a3a4a531f1e5feb6d91"], ["31e79153b87ec1664e684803e4a4b6c770776831ea3dcd4a5363d94c28c2514d", "10690ead894492eeb08b623b8d3f4331d07baaea426f8c79452033bf15bc056e"], ["dca8acdcddb07ad7c3a1827c4851c6b9e72f0604f655c4b9c6fa13bdde9be1f2", "70908760778da1847c2af7f0ffad094119ebd2443d160f51a1aa671e4c41b158"]];
const H = (x) => createHash('sha256').update(String(x || '').toLowerCase()).digest('hex');
const have = new Map(roster.map((r) => [H(r.email), r]));
note('Account check', CHECK.map(([e, c], i) => { const r = have.get(e); return `#${i + 1}: ${r ? 'on roster (' + r.role + (r.section ? ', section ' + r.section : '') + (H(r.code) === c ? ', right student' : ', WRONG student') + (r.lastLogin ? ', signed in' : ', not signed in yet') + ')' : 'NOT on roster'}`; }).join(' ; '));
const byCode = {}; for (const r of st) byCode[r.code] = (byCode[r.code] || 0) + 1;
note('Duplicates', `students with more than one roster entry: ${Object.values(byCode).filter((n) => n > 1).length} · emails with no student number: ${st.filter((r) => !r.code).length}`);
{ const g = {}; for (const r of st) (g[r.code] = g[r.code] || []).push(r);
  note('Duplicate detail', Object.values(g).filter((x) => x.length > 1).map((x) => x.map((r) => `S${r.section} ${r.lastLogin ? 'signed in' : 'never signed in'} ${CHECK.some(([e]) => e === H(r.email)) ? '(corrected email)' : '(old email)'}`).join(' + ')).join(' ; ') || 'none'); }
{ const s1 = (await db.doc('sessions/lab-w3-s1-1').get()).data() || {}; const by = roster.find((r) => r.uid === s1.openedBy || r.authUid === s1.openedBy);
  const n = (await db.collection('attendance').where('sid', '==', 'lab-w3-s1-1').get()).size;
  note('Lab 1 S1 (3 Oct) opened early', `status ${s1.status} · opened ${s1.openedAt ? new Date(s1.openedAt).toISOString() : '-'} by ${by ? by.role : s1.openedBy ? 'unknown' : '-'} · attendance records ${n}`); }
{ const T = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
  const ts = (await db.collection('sessions').where('date', '==', T).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
  const out = [];
  for (const s of ts.sort((a, b) => (a.start || '').localeCompare(b.start || ''))) {
    const at = (await db.collection('attendance').where('sid', '==', s.id).get()).docs.map((d) => d.data());
    const c = { recorded: 0, confirmed: 0, rejected: 0 }; for (const a of at) c[a.status] = (c[a.status] || 0) + 1;
    let ent = '';
    if (s.type === 'lab') { const es = (await db.collection('entries').where('section', '==', s.section).where('week', '==', 3).get()).docs.map((d) => d.data()).filter((e) => !e.practice);
      ent = ` · teeth ${es.filter((e) => e.status !== 'draft').length} (drafts ${es.filter((e) => e.status === 'draft').length}, Prep Lens ${es.filter((e) => e.ai?.score != null).length}, self-eval ${es.filter((e) => e.self?.grade != null).length}, graded ${es.filter((e) => e.review).length})`; }
    out.push(`${s.type === 'lecture' ? 'Lecture ' + s.lectureNo : 'Lab ' + (s.labNo || '?') + ' S' + s.section} [${s.status || 'scheduled'}] att recorded ${c.recorded} confirmed ${c.confirmed} rejected ${c.rejected}${ent}`);
  }
  note('Today live', out.join(' ; ') || 'no sessions'); }
{ const l = (await db.doc('sessions/lec-3').get()).data() || {}; const c = (await db.doc('codes/lec-3').get()).data() || {};
  const iso = (x) => (x ? new Date(x + 3 * 3600e3).toISOString().slice(11, 16) : '-');
  const n = (await db.collection('attendance').where('sid', '==', 'lec-3').get()).size;
  const today = (await db.collection('attendance').where('date', '==', '2026-10-03').get()).docs.map((d) => d.data());
  const bySid = {}; for (const a of today) bySid[a.sid] = (bySid[a.sid] || 0) + 1;
  note('Lecture 3 detail', `status ${l.status} · opened ${iso(l.openedAt)} · closes ${iso(l.closesAt)} · syncUntil ${iso(l.syncUntil)} (Cairo) · codes: cur ${c.cur ? 'set' : 'none'}, recent ${(c.recent || []).length}, all ${(c.all || []).length}, rotated ${iso(c.at || c.updatedAt)} · records ${n} · today's records by session ${JSON.stringify(bySid)}`); }
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
console.log('health check done');
// check 2026-10-03T10:50:30Z
