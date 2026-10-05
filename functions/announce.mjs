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
  {
    id: 'staff-grading-2026-10-04',
    title: 'التقييم الجديد للمعيدين · New grading for demonstrators',
    body: `ابتداءً من الأحد ٤ أكتوبر:

١) التقييم = العيوب فقط + درجة واحدة
• افتح السنة من «قائمة التقييم».
• دوس بس على البند اللي فيه عيب، واختار: Slight / Marked / Unacceptable.
• أي بند ما اتدسش عليه بيتسجل «مقبول».
• اكتب درجة واحدة (المنصة بتقترح درجة من العيوب، والقرار لك) ← Save evaluation.
• العيوب بتتبعت للطالب تلقائي؛ الكومنت اختياري.
• «Save & ask to correct» فقط لو السنة لازم تتصلح وتتبعت تاني.

٢) صورتين بس لكل سنة
• صورة ١: أكلوزال ٩٠°.  • صورة ٢: من الجنب بالبروب على الأرضية.
• الطالب يقدر يعيد التصوير؛ الجديدة بتحل محل القديمة.
• Prep Lens على سنة واحدة في الأسبوع لكل طالب؛ التانية تقييم ذاتي بس.

٣) قبل التقييم
• لازم الطالب يكون «حاضر» في لاب الأسبوع ويكون ضغط «إرسال». لو السنة لسه «مسودة» اطلب منه يضغط إرسال.
• لو زرار الحفظ رمادي، السطر الأصفر فوقه بيقول الناقص.

—

From Sunday 4 October:
1) Grading = defects only + one grade. Open the tooth from the Review queue, tap only the criteria with a defect and choose Slight / Marked / Unacceptable; untouched criteria are recorded as acceptable. Enter one overall grade (the platform suggests one) → Save evaluation. The defects go to the student automatically; a comment is optional. Use "Save & ask to correct" only when the tooth must be corrected and resubmitted.
2) Two photos per tooth: occlusal 90° and proximal side with the probe on the floor; students can retake (the new photo replaces the old). Prep Lens is used on one tooth per student per week.
3) Before grading: the student must be marked present in this week's lab and must have tapped Submit. If Save is grey, the yellow line above it says what is missing.`,
    audience: 'staff',
  },
  {
    id: 'student-instructions-2026-10-03',
    title: 'تعليمات المنصة الجديدة · New platform instructions',
    body: `📌 تعليمات المنصة — من الأسبوع ده

أولاً: حضور المحاضرة
• الـQR هيظهر على الشاشة كاملة ومعاه كود من ٦ أرقام.
• افتح المنصة ← الحضور ← امسح الـQR ← تأكيد الحضور.
• لو قاعد بعيد ومش عارف تمسح: اكتب الـ٦ أرقام في خانة الكود ← تأكيد الحضور.
• لو النت ضعيف: الحضور بيتحفظ على الموبايل ويتبعت لوحده لما النت يرجع. متمسحش مرتين.

ثانياً: اللاب (سنتين في الأسبوع)
١. سجّل حضورك بالـQR أول السكشن.
٢. افتح اللاب ← سنة جديدة لكل ضرس من الاتنين.
٣. صورتين بس لكل سنة:
   📷 صورة ١: أكلوزال بزاوية ٩٠° (البكال تحت، الموبايل على بعد ١٥ سم، زووم 2×).
   📷 صورة ٢: من الجنب بالبروب المدرّج على الأرضية موازي لمحور السن، والموبايل في مستوى سطح السن.
   لو الصورة مش واضحة اضغط «إعادة التصوير»، وهي هتحل محل القديمة.
٤. Prep Lens على سنة واحدة بس في الأسبوع: بعد الصورتين، قيّم نفسك على الروبريك واكتب درجتك ← «احفظ واعرض ملاحظات Prep Lens». السنة التانية: تقييم ذاتي وبس.
٥. اضغط «أرسل لتقييم المعيد» لكل سنة. من غير «إرسال» المعيد مش هيقدر يقيّم.
٦. اعرض السنة على المعيد. هيحدد العيوب الموجودة بس، ويديك درجة واحدة. هتوصلك الدرجة وقائمة العيوب على المنصة.

تنبيهات
• متعملش سنان كتير تجريبية. سنتين المتطلبات بس، والتدريب الإضافي من «سنة تدريب».
• الرسائل للأسئلة العلمية العامة فقط. ممنوع إرسال صور أو شغل أو طلب درجات أو حضور.

—

Platform instructions (from this week)
Lecture attendance: the QR fills the screen, with a 6-digit code. Attendance → scan → Confirm attendance. Too far to scan? Type the 6 digits. Weak network? The check-in saves on your phone and sends itself later, so don't scan twice.
Lab, 2 molars per week:
1. Scan the QR at the start of the lab.
2. My lab → New tooth, once for each molar.
3. Two photos only per tooth. Photo 1: occlusal at 90°. Photo 2: proximal side with the probe on the floor, parallel to the long axis. Use Retake to replace a photo.
4. Prep Lens on one tooth per week: self-assess, then Save and see Prep Lens feedback. For the second tooth, self-assessment only.
5. Tap Submit for demonstrator review for each tooth. Without Submit, the demonstrator can't grade.
6. Show the tooth to your demonstrator. They mark only the defects and give one overall grade, and you see both on the platform.
Messages are for general scientific questions only. No photos, work, grades or attendance.`,
    audience: 'students',
  },
  {
    id: 'survey-pilot-2026-10-04',
    title: 'استبيان دقيقتين عن اللوجبوك الرقمي · 2-minute survey',
    body: `رأيك يهمنا 🙏
جاوب استبيان قصير (دقيقتين) عن أول أسبوع على اللوجبوك الرقمي. إجاباتك مجهولة الهوية وهتدخل كأرقام إجمالية في تقرير عن المشروع.

• الطلاب: افتح «الرئيسية» ← الكارت اللي فوق «استبيان دقيقتين» ← «جاوب الاستبيان».
• المعيدين والمشرفين: افتح «Today» ← الكارت اللي فوق ← «Answer the survey».
• ٥ أسئلة + تعليق اختياري. متاح لحد الخميس ٨ أكتوبر الساعة ١١:٥٩ مساءً.

—

Your opinion matters. Please answer a short anonymous 2-minute survey on the first week of the Digital Logbook.
Students: Home → the "2-minute survey" card at the top → Answer the survey.
Demonstrators and supervisors: Today → the card at the top → Answer the survey.
5 questions + an optional comment. Open until Thursday 8 October, 23:59.`,
    audience: 'all', imageUrl: null,
  },
  {
    id: 'lab-flow-2026-10-05',
    title: 'اللاب أسرع: صورتين ← إرسال · Faster lab: 2 photos → Submit',
    body: `بناءً على آراء مجلس القسم والمعيدين — ابتداءً من الآن:

في اللاب (دقيقتين):
١. سجّل الحضور بالـQR.
٢. لكل سنة: الصورتين (أكلوزال ٩٠° + من الجنب بالبروب).
٣. اضغط «Submit for demonstrator review» واعرض السنة على المعيد.
التقييم الذاتي مش مطلوب في اللاب.

في البيت (خلال ٤٨ ساعة من الإرسال):
• افتح السنة ← «التقييم الذاتي + Prep Lens» ← دوس على العيوب واكتب درجتك ← شوف ملاحظات Prep Lens (سنة واحدة في الأسبوع).

للمعيدين: لو «Self» ظاهر «–» ده طبيعي — الطالب هيقيّم نفسه في البيت. قيّم السنة عادي (العيوب + درجة واحدة).

—

From now on (Board and demonstrator feedback):
In the lab: attendance QR → 2 photos per tooth → Submit for demonstrator review → show the tooth. No self-assessment in the lab.
At home, within 48 h of Submit: open the tooth → Self-assessment + Prep Lens.
Demonstrators: "Self –" is normal now; grade as usual (defects + one grade).`,
    audience: 'all', imageUrl: null,
  },
  {
    id: 'you-said-we-did-2026-10-05',
    title: 'قلتم… وعملنا 🎬 · You said, we did (+ 2-minute video)',
    videoUrl: site + '/guides/Digital_Logbook_Services_Tour.mp4',
    body: `شكرًا لـ٦٥ طالب و٢١ عضو مجلس قسم جاوبوا الاستبيان. ده اللي اتغير بناءً على ملاحظاتكم:

📌 الحضور بالـQR (أكتر شكوى):
• زرار تكبير 3× و4× في الكاميرا عشان تمسح من آخر المدرج.
• الأسهل: اكتب الكود (٦ أرقام) اللي تحت الـQR — من غير كاميرا.
• لو النت فصل، الحضور بيتحفظ على الموبايل ويتبعت لوحده. متمسحش مرتين.

📌 اللاب أسرع:
• صورتين بس لكل سنة، وبعدين «Submit» — والتقييم الذاتي وPrep Lens في البيت خلال ٤٨ ساعة.

📌 درجتك وملاحظات المعيد:
• العيوب اللي المعيد علّم عليها بتظهر لك مع الدرجة، عشان تعرف تحسّن إيه.

📌 هنكرر الاستبيان بشكل دوري (الهيئة المعاونة كل ٣ أسابيع) ونعدّل أول بأول.

▶ فيديو دقيقتين بيشرح كل خدمات المنصة — فوق.

—

Thank you to the 65 students and 21 Department Board members who answered the survey. What changed because of your notes:
• QR attendance: 3× / 4× zoom for far seats; or simply type the 6-digit code; check-ins are saved offline and sent automatically.
• Faster lab: 2 photos → Submit. Self-assessment and Prep Lens at home within 48 h.
• Your grade comes with the defects your demonstrator marked.
• We will repeat short surveys regularly (staff every 3 weeks) and keep adjusting.
▶ A 2-minute video tour of all services is above.`,
    audience: 'all', imageUrl: null,
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
  { id: 'atlas-classII-models', category: 'Class II', title: 'Class II for composite — proximal and occlusal views. Left: compound preparation (proximal box + occlusal extension along the central groove). Right: proximal box only (slot) · تحضير كلاس ٢ للكومبوزيت', url: site + '/guides/ClassII_models.jpg', order: 1 },
  { id: 'atlas-classII-outline', category: 'Class II', title: 'Class II — occlusal outline on a typodont molar: follows the grooves with smooth curves, width ≤ ¼ intercuspal distance · الامتداد الأكلوزالي', url: site + '/guides/ClassII_occlusal_outline.jpg', order: 2 },
  { id: 'atlas-classII-probe', category: 'Class II', title: 'Class II — checking the proximal box with a periodontal probe: (a) occlusal view, (b–d) box depth and axial wall, probe parallel to the long axis, (e) gingival floor clearance · قياس الصندوق البروكسيمالي بالبروب', url: site + '/guides/ClassII_probe_box.jpg', order: 3 },
  { id: 'atlas-classII-box-width', category: 'Class II', title: 'Class II — bucco-lingual extent of the proximal box: walls end 1–1.5 mm from the cusp peaks · عرض الصندوق البروكسيمالي', url: site + '/guides/ClassII_box_width.jpg', order: 4 },
  { id: 'prac-w3-classII-pictures', kind: 'practical', ptype: 'guide', week: 3, category: null, title: 'Class II demonstration — reference pictures (PDF) · صور مرجعية لتحضير كلاس ٢', url: site + '/guides/ClassII_Composite_Reference_Pictures.pdf', order: 5 },
  { id: 'prac-w4-classII-pictures', kind: 'practical', ptype: 'guide', week: 4, category: null, title: 'Compound Class II for composite — reference pictures (PDF) · صور مرجعية لتحضير كلاس ٢', url: site + '/guides/ClassII_Composite_Reference_Pictures.pdf', order: 1 },
  { id: 'atlas-classII-contact', category: 'Class II', title: 'Class II — breaking the contact: the proximal box extends just beyond the contact with the adjacent tooth (dotted line) · كسر نقطة التماس', url: site + '/guides/ClassII_contact_clearance.jpg', order: 5 },
  { id: 'atlas-classII-dims-occ', category: 'Class II', title: 'Class II — dimensions, occlusal view (box 2 mm, isthmus 1.5 mm, extensions as marked) · الأبعاد من الناحية الأكلوزالية', url: site + '/guides/ClassII_dims_occlusal.jpg', order: 6 },
  { id: 'atlas-classII-dims-prox', category: 'Class II', title: 'Class II — dimensions, proximal view (2 mm occlusally, 2.5 mm at the gingival floor, 2 mm deep) · الأبعاد من الناحية البروكسيمالية', url: site + '/guides/ClassII_dims_proximal.jpg', order: 7 },
  { id: 'atlas-nomenclature', category: 'Class II', title: 'Cavity nomenclature — walls, line angles and point angles in Class I, II (d, e), III and V preparations · تسمية الجدران والزوايا', url: site + '/guides/Cavity_nomenclature_walls_angles.jpg', order: 8 },
  { id: 'atlas-classII-am-dovetail', category: 'Class II amalgam', title: 'Compound Class II for amalgam — occlusal dovetail and proximal box · كلاس ٢ أملجم: الذيل الحمامي والصندوق', url: site + '/guides/ClassII_amalgam_dovetail.jpg', order: 1 },
  { id: 'atlas-classII-am-lock', category: 'Class II amalgam', title: 'Class II amalgam — (A) 90° cavosurface margins, walls at the DEJ; (B) pulpal floor and proximal retention lock · حواف ٩٠° وأخدود التثبيت', url: site + '/guides/ClassII_amalgam_margins_lock.jpg', order: 2 },
  { id: 'atlas-classII-am-typodont', category: 'Class II amalgam', title: 'Class II amalgam on a typodont — gingival seat, pulpal floor, 0.5 mm clearance with the adjacent tooth · الأرضية اللثوية ومسافة ٠٫٥ مم', url: site + '/guides/ClassII_amalgam_typodont.jpg', order: 3 },
  { id: 'prac-w10-classII-am-pictures', kind: 'practical', ptype: 'guide', week: 10, category: null, title: 'Compound Class II for amalgam — reference pictures (PDF) · صور مرجعية لكلاس ٢ أملجم', url: site + '/guides/ClassII_Amalgam_Reference_Pictures.pdf', order: 1 },
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
  const T = 'Class I preparation for resin composite on 2 molars (practice) · then Class II demonstration';
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
    if (n >= 2 && s.title !== DISC && s.source !== 'paper' && !s.makeup) { up.title = DISC; up.req = 0; }
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

// Course Director's request (2 Oct 2026): remove all student–staff messages sent before the work-message ban. Runs once.
{
  const mk = db.doc('config/seededStaff'); const done2 = new Set((await mk.get()).data()?.ids || []);
  if (!done2.has('purge-messages-2026-10-02')) {
    const cutoff = Date.parse('2026-10-02T12:10:00Z'); // 15:10 Cairo
    const snap = await db.collection('messages').get(); let n = 0;
    for (const d of snap.docs) { const at = Number(d.data().at || 0); if (at && at < cutoff) { await d.ref.delete(); n++; } }
    await db.collection('audit').add({ action: 'messages.purge', target: 'messages', before: String(n), after: '0', reason: 'Course Director: remove messages sent before the rule on work, grades and attendance', by: owner || 'system', byName, byRole: 'director', at: Date.now() });
    await mk.set({ ids: FieldValue.arrayUnion('purge-messages-2026-10-02') }, { merge: true });
    console.log('Messages removed:', n);
  }
}

// One-time clean-up (2 Oct): remove a student's old roster entry left behind when the email was corrected,
// and reset Lab 1 S1 of 3 Oct, which was opened a day early with no records. Emails are matched by hash only.
{
  const cmark = db.doc('config/seededAnnouncements'); const cd = new Set((await cmark.get()).data()?.ids || []);
  if (!cd.has('roster-cleanup-2026-10-02')) {
    const { createHash } = await import('node:crypto');
    const H = (x) => createHash('sha256').update(String(x || '').toLowerCase()).digest('hex');
    const FIXED = new Set(["fe96f9152da8879265382d40e94a4daa10577e52561028ae0c73d82992d57fba", "bc37c3d64ed04bf63c0a5c011e45f32452e14425115b57f166528296ad504f44", "41a945ea67ad29f1825047a163d6371f0ee710f50618a653643fb2e0719b294e", "9ddc3ef1efacf3c5f5b0c6de323fceac4ff306965de3dac28a3e8c888683cc38", "4fd746f2a675ef922af595270b4955ec309a5603bddb791b88d01423b736139e", "475a89820c921b2b6b102c1c30722033fb370f562718279fc17c5147ece9e286", "47510f9c9b1c0379d80876c5220e9480dfc2fc92342029092d539f7587b0df91", "65573521695f95c713d61845eae926ee12c6b8e4d8b380202d420ff0f9fb823d", "31e79153b87ec1664e684803e4a4b6c770776831ea3dcd4a5363d94c28c2514d", "dca8acdcddb07ad7c3a1827c4851c6b9e72f0604f655c4b9c6fa13bdde9be1f2"]);
    const st = (await db.collection('roster').where('role', '==', 'student').get()).docs;
    const g = {}; for (const d of st) (g[d.data().code] = g[d.data().code] || []).push(d);
    let removed = 0;
    for (const ds of Object.values(g)) {
      if (ds.length < 2 || !ds.some((d) => FIXED.has(H(d.id)))) continue;
      for (const d of ds) if (!FIXED.has(H(d.id)) && !d.data().lastLogin) { await d.ref.delete(); removed++; }
    }
    const s1 = db.doc('sessions/lab-w3-s1-1'); const sd = (await s1.get()).data();
    const n = (await db.collection('attendance').where('sid', '==', 'lab-w3-s1-1').get()).size;
    if (sd && sd.status === 'open' && n === 0) await s1.update({ status: 'scheduled', openedAt: FieldValue.delete(), closesAt: FieldValue.delete(), syncUntil: FieldValue.delete(), openedBy: FieldValue.delete(), openedByName: FieldValue.delete() });
    console.log('Roster clean-up: old entries removed', removed, '· Lab 1 S1 reset', !!(sd && sd.status === 'open' && n === 0));
    await cmark.set({ ids: FieldValue.arrayUnion('roster-cleanup-2026-10-02') }, { merge: true });
  }
}

// Lecture 4 (10 Oct): Prof. Omima shows the attendance QR as a slide made in advance. Its code is accepted only while
// attendance for Lecture 4 is open (opened on the day by staff), like the rotating codes.
{
  const fm = db.doc('config/seededAnnouncements'); const fd = new Set((await fm.get()).data()?.ids || []);
  if (!fd.has('lec4-fixed-code')) {
    await db.doc('codes/lec-4').set({ fixed: '985765' }, { merge: true });
    await fm.set({ ids: FieldValue.arrayUnion('lec4-fixed-code') }, { merge: true });
    console.log('Lecture 4 slide code set');
  }
}

// Thursday 8 October 2026 is an official national day off: remove that day's sessions (only those with no attendance taken).
{
  const hm = db.doc('config/seededAnnouncements'); const hd = new Set((await hm.get()).data()?.ids || []);
  if (!hd.has('holiday-2026-10-08')) {
    const snap = await db.collection('sessions').where('date', '==', '2026-10-08').get(); const gone = [];
    for (const d of snap.docs) {
      const n = (await db.collection('attendance').where('sid', '==', d.id).limit(1).get()).size;
      if (n === 0 && !['open', 'closed'].includes(d.data().status)) { await d.ref.delete(); gone.push(d.id); }
    }
    console.log('Holiday 8 Oct: sessions removed', gone.length, gone.join(', '));
    await hm.set({ ids: FieldValue.arrayUnion('holiday-2026-10-08') }, { merge: true });
  }
}

// Section 3, Lab 1, 3 Oct: students present on the paper register but with no platform record are marked present;
// one scanned check-in left unconfirmed is confirmed. Students matched by hashed student number only.
{
  const am = db.doc('config/seededAnnouncements'); const ad = new Set((await am.get()).data()?.ids || []);
  if (!ad.has('s3-paper-2026-10-03')) {
    const { createHash } = await import('node:crypto'); const H = (x) => createHash('sha256').update(String(x || '')).digest('hex');
    const ADD = new Set(["5474ddb2147777171c75dd57766ae104e3368105bb9b7a6c9e29f05e02e1bc04", "7d916bf517cbd25ab670f20af1a27a66868ca4815e95c46561bf1809b52c03af", "b253ab811e9121c6092ea68461dcee07175e69759f501918e50c580e3f7c2347", "a174ca1dcab676b9fe546e2ce4dc8a9b7433380bbc0af3e2526b9dcfda210aae", "48664c5c90a0bd456011918bff4f10e6fda537c176fb01c11e3be6f40c2f70be", "62014ad8ee9d85b258153205926415629de57e4d60ecf3daf736303b26863fb7", "5f746027b9707fa028ce944d349d53902272a12eb76738c35b0bba3dd2908f17", "d6091fd7fdfc48e01fd3238d4374421f9cd1c49b93b7e3f8c9845714f2935531"]); const CONF = '37c90e05f49c65980f5956ae385329f3f4333e6b092d7ed633ad0ce4825065e7';
    const sid = 'lab-w3-s3-1'; const sess = (await db.doc('sessions/' + sid).get()).data();
    const st = (await db.collection('roster').where('role', '==', 'student').where('section', '==', 3).get()).docs.map((d) => d.data());
    const t = Date.now(); let added = 0, confirmed = 0;
    for (const x of st) {
      const ref = db.doc(`attendance/${sid}_${x.uid}`); const cur = (await ref.get()).data();
      if (ADD.has(H(x.code)) && !cur) {
        await ref.set({ sid, uid: x.uid, code: x.code || '', name: x.name, section: 3, type: 'lab', date: sess.date, week: sess.week || 3, at: t, status: 'confirmed', method: 'manual', by: 'course-director', byName: byName, decidedAt: t, reason: 'Paper register, Section 3, 3 Oct (confirmed by Course Director)' });
        added++;
      } else if (H(x.code) === CONF && cur && cur.status === 'recorded') {
        await ref.update({ status: 'confirmed', by: 'course-director', byName: byName, decidedAt: t, reason: 'Present on paper register, 3 Oct' }); confirmed++;
      }
    }
    console.log('Section 3 paper register: added', added, 'confirmed', confirmed);
    await am.set({ ids: FieldValue.arrayUnion('s3-paper-2026-10-03') }, { merge: true });
  }
}

// 3 Oct: several demonstrators pressed "Save & ask to correct" instead of "Save evaluation". The grade and feedback were saved;
// only the status sent the tooth back to the student. Week 3 teeth graded that way (not photo rejections) are set to graded.
{
  const rm = db.doc('config/seededAnnouncements'); const rd = new Set((await rm.get()).data()?.ids || []);
  if (!rd.has('redo-to-reviewed-2026-10-03')) {
    const snap = await db.collection('entries').where('status', '==', 'redo').get(); let n = 0;
    for (const d of snap.docs) { const e = d.data();
      if (e.week === 3 && e.review && e.review.grade != null && !e.photoRejected) { await d.ref.update({ status: 'reviewed', history: [...(e.history || []), { at: Date.now(), event: 'redo-cleared', by: byName, reason: 'Graded with the wrong button on 3 Oct; grade kept' }], updatedAt: Date.now() }); n++; } }
    console.log('Week 3 teeth moved from redo to graded:', n);
    await rm.set({ ids: FieldValue.arrayUnion('redo-to-reviewed-2026-10-03') }, { merge: true });
  }
}

// Section 16: the demonstration took all of Saturday's Lab 1 (3 Oct), so Sunday's session (4 Oct, 16:00–18:00) is used for the Week 3 molars.
{
  const mm = db.doc('config/seededAnnouncements'); const md = new Set((await mm.get()).data()?.ids || []);
  if (!md.has('s16-makeup-2026-10-04')) {
    const r = db.doc('sessions/lab-w3-s16-2');
    if ((await r.get()).exists) await r.update({ makeup: true, req: 2, title: 'Week 3 make-up: Class I preparation on 2 molars (Saturday was the demonstration)' });
    await mm.set({ ids: FieldValue.arrayUnion('s16-makeup-2026-10-04') }, { merge: true });
    console.log('Section 16 make-up session set');
  }
}

// The older photo guides (3 photos per tooth) are superseded by the 2-photo rule (3 Oct): unpin them.
{
  const om = db.doc('config/seededAnnouncements'); const od = new Set((await om.get()).data()?.ids || []);
  if (!od.has('unpin-3photo-guides')) {
    for (const id of ['guide-student-photos-v1', 'guide-demonstrator-v3']) { const r = db.doc('announcements/' + id); if ((await r.get()).exists) await r.update({ pinned: false }); }
    await om.set({ ids: FieldValue.arrayUnion('unpin-3photo-guides') }, { merge: true });
  }
}

// Lecture 3 (3 Oct): students on the Course Director's handwritten list (present, could not scan the QR from the back rows).
// Matched by hashed student number; only students with no record are added.
{
  const lm = db.doc('config/seededAnnouncements'); const ld = new Set((await lm.get()).data()?.ids || []);
  if (!ld.has('lec3-paper-2026-10-03')) {
    const { createHash } = await import('node:crypto'); const H = (x) => createHash('sha256').update(String(x || '')).digest('hex');
    const LIST = new Set(["061cdd34486f80077a31f9448c40bd94eee0e8baed2dc2b34fec0e3d1a2e351a", "8572c18115de38a973afa4169d37eea33679ec97d2163da3fe70d0b1dfdb4cc7", "372e065d0474acac41c18c57229aca05360211a9e004698ade0f84b2dffbe86f", "4f702f8977e2e2514dd85aaae3712b53457a74be65dfc91faef6947340805097", "1260d39d8822994b3028deb97806d2c0570389d16c3b84d3729b3fb89f67db9e", "683f5eae096cca42656e87a197dda36c3222183bcde77a98293af4cdb80e7ace", "7d916bf517cbd25ab670f20af1a27a66868ca4815e95c46561bf1809b52c03af", "a5ecb37f311af961d05d0866ef8840db56fa65369dcb3226f48210270c08d06d", "c24a705fac2242d9da29dc732e2b8ab1d9d446fca44805d35513afca2ede8b8a", "c0ca7b9b280e6cee0559e09a85ebd5084b8c612f3e9804b576a0d3c96d0e3573", "cf30ef488ecf60dece55e4261a920ec8d0e4a59e91cdd575ca1b6cff4362d8e2", "dd4817903576ca795f2b195c9426bd3a639b3dcd4accc3f0e21bfe193a340cb9", "3a31a7b6a76d7f6ffcf05325aa03ce2816050fbd30357a3a4a531f1e5feb6d91", "fde7987680fe49076fd1d7a14a43a7d7718f4f334f97b02cf74b7968440f0a01", "4d526535c192bef110ab0e1fff0fe8c0ac82dc7bd63cae8470ac47f49992f1c6", "d426db1c1af858e2cbf28341bfc3b04812032b1d66c1fcc2bae656622428746e", "762dd0469abe1808cf9a5387e3878f0119c659c1293269b118c7a9153f8a41d6", "62ae3ee73103aef071404c53f2ce72dd5d089966181589f4f95f23b2dcfbdd69", "22d5a5b9d6924cd50eb788d993b17aeafc82f154fb9c84e81e74042440b5f4c5", "716236a8fa441fd22836e26f2872d56c7a52d1e3fd863413e75b41fd2f496e8a", "fbec1ffca4e24f3a9ddba4510bc58efa9e04d59e39b0b0bcc7e4a8c110a226b1", "f3648bc58c31cc43e0243f389943a5f3c18d32e869e97076169e083af7a25703", "6158c31b909504e45d5c188d0072f0b54fc70d1ab44dc1c4aabd974fc12f0aee", "c109fba2530cf2b9e45ceabdb8bafd5f669ad516bc826b01c75822fab4061013", "22b1adb4953b1bd026613c4445c7378d00289d3712f040fc1143e17a62853740", "c7784cf2fca840d5071c922702fb6005a793125bee0ccc99cfde3b903cba15d6", "51d52c450ff3fcfeefe71fb9ac902fd5a5ee29980b0a6a0138f4ffc0a82d0686", "050102a13e0ea1a71ef474ce613b7627219aa1e6afa6c21dbfd8e6e65272d61e", "e3047bd42b619ae9c651545b712b5dee8f8d6af17590cd110a004802d48d3f0d"]);
    const sid = 'lec-3'; const sess = (await db.doc('sessions/' + sid).get()).data();
    const st = (await db.collection('roster').where('role', '==', 'student').get()).docs.map((d) => d.data()).filter((x) => LIST.has(H(x.code)));
    const t = Date.now(); let added = 0, already = 0;
    for (const x of st) {
      const ref = db.doc(`attendance/${sid}_${x.uid}`); const cur = (await ref.get()).data();
      if (cur) { already++; continue; }
      await ref.set({ sid, uid: x.uid, code: x.code || '', name: x.name, section: x.section || null, type: 'lecture', date: sess.date, week: sess.week || null, at: t, status: 'confirmed', method: 'manual', by: 'course-director', byName, decidedAt: t, reason: 'Lecture 3 paper list: present, could not scan the QR (Course Director)' });
      added++;
    }
    console.log('Lecture 3 paper list: matched', st.length, 'added', added, 'already recorded', already);
    await lm.set({ ids: FieldValue.arrayUnion('lec3-paper-2026-10-03') }, { merge: true });
  }
}

// Lecture 3 (3 Oct): 5 more students from the paper list, matched by name on the roster (hashed student numbers).
{
  const lm = db.doc('config/seededAnnouncements'); const ld = new Set((await lm.get()).data()?.ids || []);
  if (!ld.has('lec3-paper-2026-10-03-b')) {
    const { createHash } = await import('node:crypto'); const H = (x) => createHash('sha256').update(String(x || '')).digest('hex');
    const LIST = new Set(["6aba70637874b311d689e301c15786b66829e1668562d101dd2160f688f6d6ce", "8e2f6c95e7db0f56f528a23ac9f587bb02cace77a368bd527bd5a8b3ddafcd2e", "5ed339f14a3bf161fd96d0aaf3797d377c62d07452677f5f66a3f530ade9dc03", "c71dfa6ddd409c6ea3c581d6d6ef1f350b0760c6c5a8fa9a34d89a94b2f2edc0", "a7cd0a786a0a95a390a12a2aba68e7ca877531f33039a707af389475f5424ae1"]);
    const sid = 'lec-3'; const sess = (await db.doc('sessions/' + sid).get()).data();
    const st = (await db.collection('roster').where('role', '==', 'student').get()).docs.map((d) => d.data()).filter((x) => LIST.has(H(x.code)));
    const t = Date.now(); let added = 0;
    for (const x of st) {
      const ref = db.doc(`attendance/${sid}_${x.uid}`); if ((await ref.get()).exists) continue;
      await ref.set({ sid, uid: x.uid, code: x.code || '', name: x.name, section: x.section || null, type: 'lecture', date: sess.date, week: sess.week || null, at: t, status: 'confirmed', method: 'manual', by: 'course-director', byName, decidedAt: t, reason: 'Lecture 3 paper list: present, could not scan the QR (Course Director)' });
      added++;
    }
    console.log('Lecture 3 paper list (b): matched', st.length, 'added', added);
    await lm.set({ ids: FieldValue.arrayUnion('lec3-paper-2026-10-03-b') }, { merge: true });
  }
}

// Lecture 3 (3 Oct): 2 more students confirmed by the class representative with their student numbers.
{
  const lm = db.doc('config/seededAnnouncements'); const ld = new Set((await lm.get()).data()?.ids || []);
  if (!ld.has('lec3-paper-2026-10-03-c')) {
    const { createHash } = await import('node:crypto'); const H = (x) => createHash('sha256').update(String(x || '')).digest('hex');
    const LIST = new Set(["aff236acaa7365c50779aafb2765b38019fb7724746d8d63ae2ade38076ed9ef", "67d4127cc4ae61c39ed4551889ec6e19181d56353393a11ca224df66d8807253"]);
    const sid = 'lec-3'; const sess = (await db.doc('sessions/' + sid).get()).data();
    const st = (await db.collection('roster').where('role', '==', 'student').get()).docs.map((d) => d.data()).filter((x) => LIST.has(H(x.code)));
    const t = Date.now();
    for (const x of st) {
      const ref = db.doc(`attendance/${sid}_${x.uid}`); if ((await ref.get()).exists) continue;
      await ref.set({ sid, uid: x.uid, code: x.code || '', name: x.name, section: x.section || null, type: 'lecture', date: sess.date, week: sess.week || null, at: t, status: 'confirmed', method: 'manual', by: 'course-director', byName, decidedAt: t, reason: 'Lecture 3 paper list: present, could not scan the QR (Course Director)' });
    }
    await lm.set({ ids: FieldValue.arrayUnion('lec3-paper-2026-10-03-c') }, { merge: true });
  }
}

// Section 1: nobody attended Saturday's Lab 1 (3 Oct), so Monday's session (5 Oct, 12:00–14:00) is used for the Week 3 molars.
{
  const mm = db.doc('config/seededAnnouncements'); const md = new Set((await mm.get()).data()?.ids || []);
  if (!md.has('s1-makeup-2026-10-05')) {
    const r = db.doc('sessions/lab-w3-s1-2');
    if ((await r.get()).exists) await r.update({ makeup: true, req: 2, title: 'Week 3 make-up: Class I preparation on 2 molars (no lab on Saturday)' });
    await mm.set({ ids: FieldValue.arrayUnion('s1-makeup-2026-10-05') }, { merge: true });
  }
}

// 5 Oct: shorter wording for "You said, we did" (Course Director's text).
{ const id = 'you-said-we-did-short-v2'; const m = (await mark.get()).data()?.ids || [];
  if (!m.includes(id)) {
    const r = db.doc('announcements/you-said-we-did-2026-10-05');
    if ((await r.get()).exists) await r.update({ body: `شكرًا لكل من جاوب الاستبيان. ده اللي اتغير بناءً على ملاحظاتكم:

• الحضور بالـQR: تكبير 3× / 4× في الكاميرا، أو ببساطة اكتب الكود (٦ أرقام). الحضور بيتحفظ حتى لو النت فصل.
• لاب أسرع: صورتين ثم Submit، والتقييم الذاتي وPrep Lens في البيت.
• الدرجات: بتشوف العيوب اللي المعيد علّم عليها.
• الاستبيانات: هتتكرر بانتظام، وكل ٣ أسابيع للهيئة المعاونة.
• فيديو الدقيقتين بيشتغل جوه الإعلان ده (▶ جنب العنوان).

—

• QR attendance: 3× / 4× zoom, or simply type the 6-digit code. Check-ins are saved even when the network drops.
• Faster lab: 2 photos, then Submit, with self-assessment and Prep Lens at home.
• Grades: you see the defects your demonstrator marked.
• Surveys: repeated regularly, every 3 weeks for staff.
• The 2-minute video plays inside this announcement (▶ next to the title).` });
    await mark.set({ ids: FieldValue.arrayUnion(id) }, { merge: true }); console.log('Updated: you said, we did'); } }

// 5 Oct: staff "You said, we did" after the staff/board survey (25 responses).
{ const id = 'staff-you-said-we-did-2026-10-05'; const m = (await mark.get()).data()?.ids || [];
  if (!m.includes(id)) {
    await db.doc('announcements/' + id).set({ title: 'آراء الهيئة المعاونة والمجلس… وما تم · Staff survey: you said, we did', videoUrl: site + '/guides/Digital_Logbook_Services_Tour.mp4', audience: 'staff', sections: [], pinned: true, publishAt: Date.now(), by: owner || 'system', byName, imageUrl: null, imagePath: null,
      body: `شكرًا لكل من شارك في الاستبيان (٢٥ إجابة — ١٠٠٪ مع الاستمرار). ده اللي اتعمل:

• وقت السكشن: الطالب في اللاب يصوّر صورتين ثم Submit بس. اختيارات التقييم الذاتي وPrep Lens اتنقلت للبيت (خلال ٤٨ ساعة) — يعني مفيش اختيارات قبل الإرسال.
• صورة البروب: إعادة التصوير بتستبدل القديمة، والطالب ممكن يرفعها بعد السكشن.
• الحضور: الطالب يقدر يكتب الكود (٦ أرقام) بدل المسح، والكاميرا فيها تكبير 3×/4×. كشف الإكسل الورقي مستمر كاحتياطي لحد الأسبوع الخامس.
• الشبكة: الحضور والبيانات بتتحفظ على الموبايل لو النت فصل. وتم رفع طلب رسمي لتقوية الـWi-Fi في منطقة المعامل والعيادات.
• المعايرة (Calibration): جلسة قصيرة في الأسبوع الرابع — كل المعيدين يقيّموا نفس السنون على المنصة ونقارن النتائج.
• التدريب: ورشة عمل قصيرة للوجبوك الرقمي (هيتحدد ميعادها)، وفيديو الدقيقتين فوق.
• المنصة لا تغني عن سؤال المشرف في السكشن — Prep Lens للتدريب في البيت.
• الاستبيان هيتكرر كل ٣ أسابيع للهيئة المعاونة، ونعدّل أول بأول.

—

Thank you (25 responses — 100% recommend continuing). What we changed:
• Section time: in the lab, students take 2 photos and Submit only; self-assessment and Prep Lens moved home (within 48 h).
• Attendance: students can type the 6-digit code; the scanner has 3×/4× zoom. The paper Excel backup continues until Week 5.
• Network: data is saved on the phone when the connection drops; a formal request for lab and clinic Wi-Fi has been raised.
• Calibration: a short session in Week 4 — all demonstrators grade the same teeth on the platform and we compare.
• Training: a short workshop (date to follow) and the 2-minute video above.
• Staff survey repeats every 3 weeks, and we keep adjusting.` });
    await mark.set({ ids: FieldValue.arrayUnion(id) }, { merge: true }); console.log('Posted: staff you said, we did'); } }
