// Posts department announcements that ship with the website (guide pictures live in /guides on the site).
// Each one is posted once: ids already posted are remembered in config/seededAnnouncements,
// so an announcement you edit or delete on the dashboard is never recreated.
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
initializeApp({ credential: applicationDefault(), projectId: process.env.FB_PROJECT_ID });
const db = getFirestore();
const site = (process.env.SITE_URL || 'https://digitallogbook-dfc3e.web.app').replace(/\/$/, '');
const owner = (process.env.OWNER_EMAIL || '').trim().toLowerCase();
const who = owner ? (await db.doc(`roster/${owner}`).get()).data() : null;
const byName = who?.name || process.env.OWNER_NAME || 'Course Director';

const SEEDS = [
  {
    id: 'welcome-2026-10-03',
    title: 'أهلاً بكم في اللوجبوك الرقمي · Welcome to the Digital Logbook',
    body: `أعزاءنا الطلاب والزملاء أعضاء هيئة التدريس والهيئة المعاونة،

أهلاً بكم في اللوجبوك الرقمي لمقرر العلاج التحفظي للفرقة الثالثة. يسعدنا أن نكون جزءًا من التحول الرقمي في التعليم الجامعي بكلية طب الأسنان – جامعة القاهرة.

هدفنا أن نجعل كل شيء أسهل: الحضور، ومتطلبات اللاب، والتقييم، والمواد التعليمية… كلها الآن على موبايلك وفي متناول يدك.

نجاح هذه الخطوة يعتمد على تعاون كل واحد منكم، فملاحظاتكم ومشاركتكم هي ما سيجعل التجربة أفضل من أجل مستقبل أفضل لتعليم طب الأسنان. يسعدنا دائمًا أن نخدمكم ونساعدكم.

—

Dear students and colleagues,

Welcome to the Digital Logbook for Year 3 Conservative Dentistry. We are proud to be part of the digital transformation of university education at the Faculty of Dentistry, Cairo University.

Our aim is to make things easier: attendance, lab requirements, evaluation and learning materials are now on your smartphone, at your fingertips.

Its success depends on the cooperation of each one of you. Your feedback and engagement will make it better, for a better future in dental education. We are always glad to serve and support you.

أ.د. أحمد الحوشي — مدير المقرر
Prof. Dr. Ahmed El-Hoshy — Course Director
تحت رعاية أ.د. جيرالدين أحمد، عميدة الكلية، وإشراف أ.د. ألاء الباز، وكيلة الكلية لشؤون الطلاب، وأ.د. هبة حمزة، رئيس القسم
Under the patronage of Prof. Dr. Geraldine Ahmed, Dean of the Faculty, and the supervision of Prof. Dr. Alaa El Baz, Vice Dean for Student Affairs, and Prof. Dr. Heba Hamza, Head of Department`,
    audience: 'all', imageUrl: null,
  },
  {
    id: 'guide-demonstrator-v3',
    title: 'دليل المعيد (محدّث): الحضور والتقييم وتصوير السن',
    body: 'النسخة المحدثة من دليل المعيد.\n\nالجديد: صور الطالب — ٣ صور لكل سن (أكلوزال ٩٠°، زاوية ٤٥°، البروب).\nصورة البروب: الموبايل في مستوى سطح السن من ناحية البكل، مش من فوق، عشان الرقم عند حافة التحضير يبان. والطالب يكتب القراءة بالمم في خانة My probe reading، وتظهر لك بجانب تقييمه الذاتي.\n\nالنت ضعيف؟ الطالب يسجّل عادي ويظهر Pending، ويتسجل تلقائيًا لما يتصل خلال ٣٠ دقيقة من نهاية اللاب.\n\nالفيديو (دقيقة ونص):\n' + site + '/guides/Demonstrator_Guide_Video_v3.mp4',
    audience: 'staff', imageUrl: site + '/guides/Demonstrator_Guide_v3.jpg',
  },
  {
    id: 'guide-student-photos-v1',
    title: 'طريقة تصوير السن — ٣ صور لكل سن',
    body: '١) أكلوزال ٩٠°: البكل لتحت، ١٥ سم، زووم 2×، السن نص الشاشة.\n٢) زاوية ٤٥°: من الميزيال أو الديستال لتظهر الجدران.\n٣) البروب: الموبايل في مستوى سطح السن من ناحية البكل — مش من فوق — واكتب القراءة بالمم في خانة My probe reading.\n\nنظّف السن وجفّفه، وارفع الصور من المنصة مباشرة. Prep Lens للتدريب فقط ولا يعطي درجة.',
    audience: 'students', imageUrl: site + '/guides/Student_Photo_Guide.jpg',
  },
];

const mark = db.doc('config/seededAnnouncements');
const done = new Set((await mark.get()).data()?.ids || []);
for (const s of SEEDS) {
  if (done.has(s.id)) continue;
  const { id, ...a } = s;
  await db.doc(`announcements/${id}`).set({ ...a, sections: [], pinned: true, publishAt: Date.now(), by: owner || 'system', byName, imagePath: null });
  await mark.set({ ids: FieldValue.arrayUnion(id) }, { merge: true });
  console.log('Announcement posted:', s.title);
}
console.log('Announcements up to date');

// Reference pictures added to the Atlas (Learning resources → Atlas), posted once each.
const PICS = [
  { id: 'atlas-classI-occlusal-90', category: 'Class I', title: 'Class I — occlusal photo at 90° (reference angulation): buccal side down, ~15 cm, 2× zoom, tooth fills half the screen · صورة أكلوزال ٩٠° مرجعية', url: site + '/guides/ClassI_occlusal_90.jpg', order: 1 },
  { id: 'atlas-classI-probe', category: 'Class I', title: 'Class I — periodontal probe on the pulpal floor, parallel to the long axis. For the depth reading, photograph from the side at the level of the occlusal surface · البروب على الأرضية وموازي لمحور السن', url: site + '/guides/ClassI_probe.jpg', order: 2 },
];
const pmark = db.doc('config/seededMaterials');
const pdone = new Set((await pmark.get()).data()?.ids || []);
for (const p of PICS) {
  if (pdone.has(p.id)) continue;
  const { id, ...m } = p;
  await db.doc(`materials/${id}`).set({ kind: 'atlas', lectureNo: null, path: null, ...m, updatedAt: Date.now(), updatedBy: byName });
  await pmark.set({ ids: FieldValue.arrayUnion(id) }, { merge: true });
  console.log('Atlas picture added:', p.id);
}

// Staff accounts added on request (leadership oversight; lecture attendance helpers). Added only if not already on the roster, so a role changed on the People page is kept.
const LEADERS = [
  { email: 'heba.hamza@dentistry.cu.edu.eg', name: 'Prof. Dr. Heba Hamza', role: 'hod' },
  { email: 'geraldine.ahmed@dentistry.cu.edu.eg', name: 'Prof. Dr. Geraldine Ahmed', role: 'dean' },
  { email: 'alaa.elbaz@dentistry.cu.edu.eg', name: 'Prof. Dr. Alaa El Baz', role: 'vicedean' },
  { email: 'zeinab.omar@dentistry.cu.edu.eg', name: 'Dr. Zeinab Omar', role: 'lecturer', lectures: [3] },
  { email: 'mahitab.kamal@dentistry.cu.edu.eg', name: 'Dr. Mahitab Kamal', role: 'demonstrator', sections: [6] },
  { email: 'sarah.seif@dentistry.cu.edu.eg', name: 'Dr. Sarah Seif', role: 'demonstrator', sections: [] },
];
for (const l of LEADERS) {
  const r = db.doc(`roster/${l.email}`);
  if ((await r.get()).exists) { console.log('On roster already:', l.email); continue; }
  await r.set({ uid: l.email, email: l.email, name: l.name, role: l.role, sections: l.sections || [], lectures: l.lectures || [] });
  console.log('Added to roster:', l.email, l.role);
}

// Lecture slides: point Lectures 1 and 2 at the copies already shared with students
// (the original copies in the Course Director's Drive are private). Only links to those two private files are changed.
const RELINK = {
  '12oCqZOSHU5nTJpzufPOgDWTABvDSipLL': '1_unCDVCdcWSPqZm3tzVmVuyKMJxsMHpf', // Lecture 1 → "3rd year orientation session.pdf" (faculty-wide)
  '1dvnYIjio8aCbMzRetBFKLUD3l9jI-nZ5': '1Y544M-qSjk_qImTi3BSAnU7LZk39793e', // Lecture 2 → "Hard tooth structure defects.pdf" (anyone with link)
};
for (const d of (await db.collection('materials').get()).docs) {
  const m = d.data(); const url = String(m.url || '');
  const old = Object.keys(RELINK).find((k) => url.includes(k));
  if (old) {
    await d.ref.update({ url: `https://drive.google.com/file/d/${RELINK[old]}/preview`, updatedAt: Date.now(), updatedBy: byName });
    console.log('Lecture link switched to shared copy:', d.id, 'lecture', m.lectureNo);
  } else if (Number(m.lectureNo) === 1 || Number(m.lectureNo) === 2) {
    console.log('Lecture material left as is:', d.id, 'lecture', m.lectureNo, (url.match(/\/d\/([^/]+)/) || [])[1] || '(no Drive id)');
  }
}

// Course Director's assistant: same full access as the Course Director.
{
  const e = 'yomna.sayed@dentistry.cu.edu.eg'; const r = db.doc(`roster/${e}`); const s = await r.get();
  if (!s.exists) { await r.set({ uid: e, email: e, name: 'Dr. Yomna Sayed', role: 'director', sections: [], lectures: [] }); console.log('Added to roster:', e, 'director'); }
  else if (!['director', 'admin'].includes(s.data().role)) { await r.update({ role: 'director' }); console.log('Role set to director:', e, '(was', s.data().role + ')'); }
  else console.log('Full access already:', e);
}

// First-semester 2026–27 staffing from the Head of Department (supervisor timetable):
// main supervisors keep their own sections; every demonstrator covers all 18 sections because their schedules change.
// Runs once (config/seededStaff), so later edits on the People page are kept.
{
  const smark = db.doc('config/seededStaff');
  const sdone = new Set((await smark.get()).data()?.ids || []);
  if (!sdone.has('staff-2026-s1')) {
    const SUP = [
      { email: 'zeinab.omar@dentistry.cu.edu.eg', name: 'Assoc. Prof. Zeinab Omar', sections: [1, 2, 3], lectures: [3] },
      { email: 'omnia.magdy@dentistry.cu.edu.eg', name: 'Dr. Omnia Magdy', sections: [4, 5, 6, 12] },
      { email: 'amir.hafez@dentistry.cu.edu.eg', name: 'Assoc. Prof. Amir Hafez', sections: [7, 11, 16] },
      { email: 'monamahmoud@dentistry.cu.edu.eg', name: 'Dr. Mona Mahmoud', sections: [9] },
      { email: 'possy.moustafa@dentistry.cu.edu.eg', name: 'Assoc. Prof. Possy Moustafa', sections: [10, 14, 17] },
      { email: 'heba.eldeeb@dentistry.cu.edu.eg', name: 'Prof. Heba ElDeeb', sections: [13, 15] },
      { email: 'nancy.helmy@dentistry.cu.edu.eg', name: 'Dr. Nancy Helmy', sections: [18] },
    ];
    for (const s of SUP) {
      const r = db.doc(`roster/${s.email}`); const cur = (await r.get()).data() || {};
      const lectures = [...new Set([...(cur.lectures || []), ...(s.lectures || [])])];
      await r.set({ uid: s.email, email: s.email, name: cur.name && cur.role === 'lecturer' ? cur.name : s.name, role: ['director', 'admin', 'hod', 'vicedean'].includes(cur.role) ? cur.role : 'lecturer', sections: s.sections, lectures }, { merge: true });
      console.log('Supervisor set:', s.email, s.sections.join(','));
    }
    const ALL = Array.from({ length: 18 }, (_, i) => i + 1);
    const dems = await db.collection('roster').where('role', '==', 'demonstrator').get();
    for (const d of dems.docs) { await d.ref.update({ sections: ALL }); console.log('Demonstrator → all sections:', d.id); }
    // Project lecturer column = the section's supervisor (only where still empty). Engy Mostafa (Section 8) has no account yet.
    const NAMES = { 8: 'Dr. Engy Mostafa' }; for (const s of SUP) for (const n of s.sections) NAMES[n] = s.name;
    for (const [g, name] of Object.entries(NAMES)) {
      const r = db.doc(`projects/g${g}`); const cur = (await r.get()).data() || {};
      if (!cur.lecturer) await r.set({ group: Number(g), title: cur.title || '', lecturer: name, demonstrator: cur.demonstrator || '', updatedAt: Date.now(), updatedBy: byName }, { merge: true });
    }
    await smark.set({ ids: FieldValue.arrayUnion('staff-2026-s1') }, { merge: true });
  }
}

// Dr. Engy Mostafa — main supervisor, Section 8 (email received after the first staffing setup).
{
  const e = 'engy.mostafa@dentistry.cu.edu.eg'; const r = db.doc(`roster/${e}`); const cur = await r.get();
  if (!cur.exists) { await r.set({ uid: e, email: e, name: 'Dr. Engy Mostafa', role: 'lecturer', sections: [8], lectures: [] }); console.log('Supervisor added:', e); }
}

// Final Year 3 staff list (Course Director, 1 Oct 2026): 8 main supervisors with their sections, 10 demonstrators on all 18 sections.
// Runs once (config/seededStaff 'staff-final-2026-s1'); later edits on the People page are kept.
{
  const smark = db.doc('config/seededStaff');
  const sdone = new Set((await smark.get()).data()?.ids || []);
  if (!sdone.has('staff-final-2026-s1')) {
    const ALL = Array.from({ length: 18 }, (_, i) => i + 1);
    const SUP = {
      'heba.eldeeb@dentistry.cu.edu.eg': ['Prof. Heba ElDeeb', [13, 15]],
      'amir.hafez@dentistry.cu.edu.eg': ['Assoc. Prof. Amir Hafez', [7, 11, 16]],
      'zeinab.omar@dentistry.cu.edu.eg': ['Assoc. Prof. Zeinab Omar', [1, 2, 3]],
      'possy.moustafa@dentistry.cu.edu.eg': ['Assoc. Prof. Possy Moustafa', [10, 14, 17]],
      'omnia.magdy@dentistry.cu.edu.eg': ['Dr. Omnia Magdy', [4, 5, 6, 12]],
      'monamahmoud@dentistry.cu.edu.eg': ['Dr. Mona Mahmoud', [9]],
      'nancy.helmy@dentistry.cu.edu.eg': ['Dr. Nancy Helmy', [18]],
      'engy.mostafa@dentistry.cu.edu.eg': ['Dr. Engy Mostafa', [8]],
    };
    const DEM = ['sarah.seif', 'engy.aref', 'marwa.husseiny', 'mariam.kamal', 'ayatellah.ossman', 'mahetab.mahmoud', 'asmaa.abdelfatah', 'mahitab.kamal', 'manar_said', 'yasmin.shibl'].map((x) => x + '@dentistry.cu.edu.eg');
    const keep = (cur) => ['director', 'admin', 'hod', 'vicedean'].includes(cur.role);
    for (const [e, [name, sections]] of Object.entries(SUP)) {
      const r = db.doc(`roster/${e}`); const cur = (await r.get()).data() || {};
      if (keep(cur)) continue;
      await r.set({ uid: e, email: e, name: cur.name || name, role: 'lecturer', sections, lectures: cur.lectures || [] }, { merge: true });
      console.log('Supervisor:', e, sections.join(','));
    }
    for (const e of DEM) {
      const r = db.doc(`roster/${e}`); const cur = (await r.get()).data() || {};
      if (keep(cur)) continue;
      const nm = cur.name || 'Dr. ' + e.split('@')[0].split(/[._]/).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
      await r.set({ uid: e, email: e, name: nm, role: 'demonstrator', sections: ALL, lectures: [] }, { merge: true });
      console.log('Demonstrator (all sections):', e);
    }
    const r8 = db.doc('projects/g8'); const p8 = (await r8.get()).data() || {};
    if (!p8.lecturer) await r8.set({ group: 8, title: p8.title || '', lecturer: 'Dr. Engy Mostafa', demonstrator: p8.demonstrator || '' }, { merge: true });
    await smark.set({ ids: FieldValue.arrayUnion('staff-final-2026-s1') }, { merge: true });
  }
}

// Week 3 changed to Class I on 2 molars (schedule delay): update the titles of Week 3 lab sessions already created.
{
  const T = 'Class I cavity preparation for resin composite on 2 molars (practice week: schedule delay)';
  const snap = await db.collection('sessions').where('week', '==', 3).get(); let n = 0;
  for (const d of snap.docs) if (d.data().type === 'lab' && /-1$/.test(d.id) && d.data().title !== T) { await d.ref.update({ title: T }); n++; }
  console.log('Week 3 lab sessions retitled:', n);
}

// Every lab session carries its lab number (Lab 1 = requirements, Lab 2+ = discussion & project).
// Sessions generated before lab numbers existed get it from their id (lab-w<week>-s<section>-<n>); Lab 2+ keep the project title.
{
  const DISC = 'Discussion and group project (no requirement)';
  const snap = await db.collection('sessions').where('type', '==', 'lab').get(); let fixed = 0;
  for (const d of snap.docs) {
    const m = /^lab-w\d+-s\d+-(\d+)$/.exec(d.id); if (!m) continue;
    const n = Number(m[1]); const s = d.data(); const up = {};
    if (s.labNo !== n) up.labNo = n;
    if (n >= 2 && s.title !== DISC && s.source !== 'paper') { up.title = DISC; up.req = 0; }
    if (Object.keys(up).length) { await d.ref.update(up); fixed++; }
  }
  console.log('Lab sessions given lab numbers / project titles:', fixed);
}

// Welcome note v3: signature with the Dean of the Faculty; Vice Dean's name spelled ألاء (updates the note already posted; runs once).
{
  const wmark = db.doc('config/seededAnnouncements'); const wd = new Set((await wmark.get()).data()?.ids || []);
  if (!wd.has('welcome-2026-10-03-v3')) {
    const w = SEEDS.find((x) => x.id === 'welcome-2026-10-03');
    const r = db.doc('announcements/welcome-2026-10-03');
    if ((await r.get()).exists) { await r.update({ body: w.body }); console.log('Welcome note updated with the Dean'); }
    await wmark.set({ ids: FieldValue.arrayUnion('welcome-2026-10-03-v3') }, { merge: true });
  }
}
