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
