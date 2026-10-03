// Read-only health check before a teaching day. Prints COUNTS ONLY (no student names, codes or emails)
// as GitHub notices, so the course team can verify the live data without opening the database.
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { getStorage } from 'firebase-admin/storage';
initializeApp({ credential: applicationDefault(), projectId: process.env.FB_PROJECT_ID });
const db = getFirestore();
const day0 = process.env.CHECK_DAY || '2026-10-03';
{ const es = (await db.collection('entries').where('week', '==', 3).get()).docs.map((d) => d.data()).filter((e) => !e.practice);
  const by = {}; for (const e of es) { const k = 'S' + e.section; const b = by[k] = by[k] || { n: 0, photo: 0, nophoto: 0, ai: 0, sub: 0 }; b.n++; if ((e.photos || []).length) b.photo++; else b.nophoto++; if (e.ai) b.ai++; if (e.status !== 'draft') b.sub++; }
  let files = 0, today = 0, sizes = [];
  try { const [fs] = await getStorage().bucket('digitallogbook-dfc3e.firebasestorage.app').getFiles({ prefix: 'photos/' }); files = fs.length; for (const f of fs) if (String(f.metadata.timeCreated || '').startsWith(day0)) { today++; sizes.push(Math.round(Number(f.metadata.size) / 1024)); } } catch (x) { files = 'error ' + x.message.slice(0, 80); }
  note('Photos', `week-3 teeth by section ${JSON.stringify(by)} · storage photos total ${files}, uploaded today ${today}, sizes KB ${sizes.slice(0, 15).join(',')}`); }
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
// note('Account check', CHECK.map(([e, c], i) => { const r = have.get(e); return `#${i + 1}: ${r ? 'on roster (' + r.role + (r.section ? ', section ' + r.section : '') + (H(r.code) === c ? ', right student' : ', WRONG student') + (r.lastLogin ? ', signed in' : ', not signed in yet') + ')' : 'NOT on roster'}`; }).join(' ; '));
const byCode = {}; for (const r of st) byCode[r.code] = (byCode[r.code] || 0) + 1;
note('Duplicates', `students with more than one roster entry: ${Object.values(byCode).filter((n) => n > 1).length} · emails with no student number: ${st.filter((r) => !r.code).length}`);
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
{ const PAPER = ["671cca257c0e480bacc38db5a89d1e445449bc7ab8c42af7d3e6e1aaaeb05f4f", "87ab97d75ef85173c307ba848b6b9b0aed7d29877c8cd58ca27e2ec1a936d5ca", "149be316dfcee7e23944feaba4c23d83a4bc308d03999bacbd2ba0f8f26ea92e", "020a99f40c2db9e62cf8725c3f05ec9093a769dfe1708f2d1b52ea6409cceb50", "35c929e5d37ddac5900f965dfffc6c3b42a2e30fde0d24551fecb79ca5f4c579", "74353344a4ce6dcb671905ad81a76bc012ab6841116819b9da254a6f78e8b918", "11d695108dad88f762f461b8aea925a79f1be4cee8fc4d2dba508a5248bb04a0", "6a136d0d43a1a7cf210f0eaff617ec799f2430fa7d9d3a64e74ab035b3d5571e", "f0be345624be6ff705a2ae8a0e578bee25cf577e6b08aa611a02dcad4315d504", "995f94905df025c06f8d3094fe090c4695b026f638a93f51813080a941181325", "6b8b36afc78bd0d482fb97d434cb45cb43f933671425fa3f8c2175ca3d709dc6", "c69bad125b4e28bff7606912da46d60ab815d4d8076517cef87a2f62aba87e6f", "bae5b09ea79a402d5ee2f5f964ef8ed4e627a52ab5893327a734fcbbf9212fd1", "5474ddb2147777171c75dd57766ae104e3368105bb9b7a6c9e29f05e02e1bc04", "7d916bf517cbd25ab670f20af1a27a66868ca4815e95c46561bf1809b52c03af", "64fbbb16ada16bfae61f94d41ac23224ab67b57cf2e6d36bcdd15a002c3ab953", "be6765e8d16c4ba83b1515e5c8bb2aa24d2d6cb1fda548168f786ffdde39afa5", "6b19ab06e506c94a223d5527c40726c122e98a0bdb34a2da0c96619c472a83b5", "87c44e1073e417fcc5980c5e88fa7fcc571291d680faf86f91d055d45ceced60", "b3b0f6633c40b350076f28a7151eb46b1daa5dfaff6beaa4f880a7f457161fd0", "b253ab811e9121c6092ea68461dcee07175e69759f501918e50c580e3f7c2347", "a174ca1dcab676b9fe546e2ce4dc8a9b7433380bbc0af3e2526b9dcfda210aae", "48664c5c90a0bd456011918bff4f10e6fda537c176fb01c11e3be6f40c2f70be", "62014ad8ee9d85b258153205926415629de57e4d60ecf3daf736303b26863fb7", "9b082312b0c4b3f53e024346584d82c729ef442bca6d91eae6f235ec1ebace69", "5f746027b9707fa028ce944d349d53902272a12eb76738c35b0bba3dd2908f17", "96cf6d50788407c153c745cbddf78b57d3b86fa4e899aeaf9f08fc94029d14f3", "d6091fd7fdfc48e01fd3238d4374421f9cd1c49b93b7e3f8c9845714f2935531", "650fa943c312ff8cac6c5fd052647617bec0c1409054cf66ab37e424429ae21a", "37c90e05f49c65980f5956ae385329f3f4333e6b092d7ed633ad0ce4825065e7"];
  const P = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  const at = {}; for (const d of (await db.collection('attendance').where('sid', '==', 'lab-w3-s3-1').get()).docs) at[H(d.data().code)] = d.data().status;
  const ent = {}; for (const d of (await db.collection('entries').where('section', '==', 3).where('week', '==', 3).get()).docs) { const e = d.data(); const k = H(e.code); ent[k] = (ent[k] || []).concat(e.status === 'draft' ? 'draft' : e.review ? 'graded' : 'submitted'); }
  const rows = PAPER.map((h, i) => `r${i + 4}:${P[i] ? 'P' : 'A'}/${at[h] || 'none'}${ent[h] ? '/' + ent[h].join('+') : ''}`);
  const mism = rows.filter((r, i) => (P[i] === 1) !== (at[PAPER[i]] === 'confirmed' || at[PAPER[i]] === 'recorded'));
  note('S3 paper vs platform', `mismatches ${mism.length}: ${mism.join(' ')} || all: ${rows.join(' ')}`); }
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
// check 2026-10-03T13:20:48Z
