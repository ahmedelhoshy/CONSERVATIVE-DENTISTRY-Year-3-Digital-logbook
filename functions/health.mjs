// Read-only health check before a teaching day. Prints COUNTS ONLY (no student names, codes or emails)
// as GitHub notices, so the course team can verify the live data without opening the database.
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
initializeApp({ credential: applicationDefault(), projectId: process.env.FB_PROJECT_ID });
const db = getFirestore();
const day = process.env.CHECK_DAY || '2026-10-03';
const note = (t, m) => console.log(`::notice title=${t}::${m}`);
const day0 = process.env.CHECK_DAY || '2026-10-03';
try { const es = (await db.collection('entries').where('week', '==', 3).get()).docs.map((d) => d.data()).filter((e) => !e.practice);
  const by = {}; for (const e of es) { const k = 'S' + e.section; const b = by[k] = by[k] || { n: 0, photo: 0, nophoto: 0, ai: 0, sub: 0 }; b.n++; if ((e.photos || []).length) b.photo++; else b.nophoto++; if (e.ai) b.ai++; if (e.status !== 'draft') b.sub++; }
  let files = 0, today = 0, sizes = [];
  try { const { getStorage } = await import('firebase-admin/storage'); const [fs] = await getStorage().bucket('digitallogbook-dfc3e.firebasestorage.app').getFiles({ prefix: 'photos/' }); files = fs.length; for (const f of fs) if (String(f.metadata.timeCreated || '').startsWith(day0)) { today++; sizes.push(Math.round(Number(f.metadata.size) / 1024)); } } catch (x) { files = 'error ' + x.message.slice(0, 80); }
  const u = (await db.doc('usage/preplens-' + day0).get()).data() || {}; const u2 = (await db.doc('usage/preplens-2026-10-02').get()).data() || {};
  const rs = (await db.collection('research').get()).docs.map((d) => d.data());
  note('Prep Lens', `calls today ${u.total || 0} by ${Object.keys(u.users || {}).length} students · yesterday ${u2.total || 0} · research records ${rs.length} (week 3: ${rs.filter((r) => r.week === 3).length}, practice ${rs.filter((r) => r.practice).length}) · latest ${rs.map((r) => r.at || 0).sort().slice(-1).map((x) => new Date(x).toISOString()).join('')}`);
  { const L7 = ["74353344a4ce6dcb671905ad81a76bc012ab6841116819b9da254a6f78e8b918", "87ab97d75ef85173c307ba848b6b9b0aed7d29877c8cd58ca27e2ec1a936d5ca", "671cca257c0e480bacc38db5a89d1e445449bc7ab8c42af7d3e6e1aaaeb05f4f", "9b082312b0c4b3f53e024346584d82c729ef442bca6d91eae6f235ec1ebace69", "d6091fd7fdfc48e01fd3238d4374421f9cd1c49b93b7e3f8c9845714f2935531", "b3b0f6633c40b350076f28a7151eb46b1daa5dfaff6beaa4f880a7f457161fd0", "149be316dfcee7e23944feaba4c23d83a4bc308d03999bacbd2ba0f8f26ea92e"];
    const ro = (await db.collection('roster').where('section', '==', 3).get()).docs.map((d) => d.data());
    const es3 = (await db.collection('entries').where('section', '==', 3).get()).docs.map((d) => d.data());
    const out = L7.map((h, i) => { const r = ro.find((x) => createHash('sha256').update(String(x.code)).digest('hex') === h); if (!r) return `#${i + 1}: not in S3 roster`;
      const mine = es3.filter((e) => e.uid === r.uid); return `#${i + 1}: uid==code ${String(r.uid) === String(r.code)} · codeType ${typeof r.code} · signedIn ${!!r.lastLogin} · teeth ${mine.length} · withPhotos ${mine.filter((e) => (e.photos || []).length).length} · photos ${mine.reduce((a, e) => a + (e.photos || []).length, 0)}`; });
    const bad = ro.filter((x) => String(x.uid) !== String(x.code)).length;
    note('S3 photo students', out.join(' ; ') + ` · S3 roster entries with uid != code: ${bad}`); }
  { const LH = ["061cdd34486f80077a31f9448c40bd94eee0e8baed2dc2b34fec0e3d1a2e351a", "8572c18115de38a973afa4169d37eea33679ec97d2163da3fe70d0b1dfdb4cc7", "372e065d0474acac41c18c57229aca05360211a9e004698ade0f84b2dffbe86f", "4f702f8977e2e2514dd85aaae3712b53457a74be65dfc91faef6947340805097", "1260d39d8822994b3028deb97806d2c0570389d16c3b84d3729b3fb89f67db9e", "683f5eae096cca42656e87a197dda36c3222183bcde77a98293af4cdb80e7ace", "7d916bf517cbd25ab670f20af1a27a66868ca4815e95c46561bf1809b52c03af", "a5ecb37f311af961d05d0866ef8840db56fa65369dcb3226f48210270c08d06d", "c24a705fac2242d9da29dc732e2b8ab1d9d446fca44805d35513afca2ede8b8a", "c0ca7b9b280e6cee0559e09a85ebd5084b8c612f3e9804b576a0d3c96d0e3573", "cf30ef488ecf60dece55e4261a920ec8d0e4a59e91cdd575ca1b6cff4362d8e2", "dd4817903576ca795f2b195c9426bd3a639b3dcd4accc3f0e21bfe193a340cb9", "3a31a7b6a76d7f6ffcf05325aa03ce2816050fbd30357a3a4a531f1e5feb6d91", "fde7987680fe49076fd1d7a14a43a7d7718f4f334f97b02cf74b7968440f0a01", "4d526535c192bef110ab0e1fff0fe8c0ac82dc7bd63cae8470ac47f49992f1c6", "d426db1c1af858e2cbf28341bfc3b04812032b1d66c1fcc2bae656622428746e", "762dd0469abe1808cf9a5387e3878f0119c659c1293269b118c7a9153f8a41d6", "62ae3ee73103aef071404c53f2ce72dd5d089966181589f4f95f23b2dcfbdd69", "22d5a5b9d6924cd50eb788d993b17aeafc82f154fb9c84e81e74042440b5f4c5", "716236a8fa441fd22836e26f2872d56c7a52d1e3fd863413e75b41fd2f496e8a", "fbec1ffca4e24f3a9ddba4510bc58efa9e04d59e39b0b0bcc7e4a8c110a226b1", "f3648bc58c31cc43e0243f389943a5f3c18d32e869e97076169e083af7a25703", "6158c31b909504e45d5c188d0072f0b54fc70d1ab44dc1c4aabd974fc12f0aee", "c109fba2530cf2b9e45ceabdb8bafd5f669ad516bc826b01c75822fab4061013", "22b1adb4953b1bd026613c4445c7378d00289d3712f040fc1143e17a62853740", "c7784cf2fca840d5071c922702fb6005a793125bee0ccc99cfde3b903cba15d6", "51d52c450ff3fcfeefe71fb9ac902fd5a5ee29980b0a6a0138f4ffc0a82d0686", "050102a13e0ea1a71ef474ce613b7627219aa1e6afa6c21dbfd8e6e65272d61e", "e3047bd42b619ae9c651545b712b5dee8f8d6af17590cd110a004802d48d3f0d"];
    const at = {}; for (const d of (await db.collection('attendance').where('sid', '==', 'lec-3').get()).docs) at[createHash('sha256').update(String(d.data().code)).digest('hex')] = d.data().status + '/' + d.data().method;
    const c = {}; for (const h of LH) { const k = at[h] || 'none'; c[k] = (c[k] || 0) + 1; }
    note('Lecture 3 paper list', JSON.stringify(c)); const LB = ["6aba70637874b311d689e301c15786b66829e1668562d101dd2160f688f6d6ce", "8e2f6c95e7db0f56f528a23ac9f587bb02cace77a368bd527bd5a8b3ddafcd2e", "5ed339f14a3bf161fd96d0aaf3797d377c62d07452677f5f66a3f530ade9dc03", "c71dfa6ddd409c6ea3c581d6d6ef1f350b0760c6c5a8fa9a34d89a94b2f2edc0", "a7cd0a786a0a95a390a12a2aba68e7ca877531f33039a707af389475f5424ae1"]; const cb = {}; for (const h of LB) { const k = at[h] || 'none'; cb[k] = (cb[k] || 0) + 1; } note('Lecture 3 list b', JSON.stringify(cb)); const LC = ["aff236acaa7365c50779aafb2765b38019fb7724746d8d63ae2ade38076ed9ef", "67d4127cc4ae61c39ed4551889ec6e19181d56353393a11ca224df66d8807253"]; note('Lecture 3 list c', LC.map((h) => at[h] || 'none').join(', ')); }
  note('Photos', `week-3 teeth by section ${JSON.stringify(by)} · storage photos total ${files}, uploaded today ${today}, sizes KB ${sizes.slice(0, 15).join(',')}`); } catch (x) { note('Photos', 'error ' + String(x.message).slice(0, 200)); }

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
// check 2026-10-03T17:24:00Z
// check 2026-10-03T21:49:28Z
