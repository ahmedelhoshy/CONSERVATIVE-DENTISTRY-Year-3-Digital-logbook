// Short pilot survey (first week of the digital logbook) for the report to the University President.
// One response per person; results are reported only as anonymous totals.
import { useState } from 'preact/hooks';
import { L, useDoc, toast } from '../lib/ui.jsx';
import { store, isDemo } from '../lib/logic.js';

export const SURVEY = { id: 'pilot-2026-10', closes: Date.parse('2026-10-08T21:59:00Z') }; // Thursday 8 Oct, 23:59 Cairo

const Q_STUDENT = [
  ['easy', 'Signing in and using the platform is easy.', 'الدخول على المنصة واستخدامها سهل.'],
  ['attendance', 'Recording attendance with the QR code works well.', 'تسجيل الحضور بالـQR بيشتغل كويس.'],
  ['preplens', 'The 2 photos and Prep Lens feedback helped me understand my preparation.', 'الصورتين وملاحظات Prep Lens ساعدوني أفهم تحضيري.'],
  ['feedback', 'Seeing my demonstrator\'s grade and the defects on the platform is useful.', 'إني أشوف درجة المعيد والعيوب على المنصة مفيد.'],
  ['prefer', 'Overall, I prefer the digital logbook to the paper logbook alone.', 'عمومًا، أفضّل اللوجبوك الرقمي عن الورقي لوحده.'],
];
const Q_STAFF = [
  ['attendance', 'Taking attendance with the QR code is easier than paper.', 'Taking attendance with the QR code is easier than paper.'],
  ['grading', 'Defects-only grading on the phone is practical in the lab.', 'Defects-only grading on the phone is practical in the lab.'],
  ['overview', 'The platform gives me a clearer view of my students\' work.', 'The platform gives me a clearer view of my students\' work.'],
  ['time', 'The time the platform takes per student is acceptable.', 'The time the platform takes per student is acceptable.'],
  ['continue', 'Overall, I support continuing the digital logbook.', 'Overall, I support continuing the digital logbook.'],
];
const SCALE = [[1, 'Strongly disagree', 'لا أوافق بشدة'], [2, 'Disagree', 'لا أوافق'], [3, 'Neutral', 'محايد'], [4, 'Agree', 'أوافق'], [5, 'Strongly agree', 'أوافق بشدة']];

export function SurveyCard({ u }) {
  const isStudent = u.role === 'student';
  const active = ['student', 'demonstrator', 'lecturer'].includes(u.role) && !isDemo() && Date.now() <= SURVEY.closes;
  const key = String(u.uid);
  const id = active ? `${SURVEY.id}_${key}` : null;
  const mine = useDoc('surveys', id);
  const [a, setA] = useState({});
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const qs = isStudent ? Q_STUDENT : Q_STAFF;
  if (!active || mine === undefined) return null;
  if (mine) return <section class="card"><p class="faint">{L('Thank you — your survey answers are saved.', 'شكرًا — إجاباتك على الاستبيان اتسجلت.')}</p></section>;
  const done = qs.every(([k]) => a[k]);
  const send = async () => {
    setBusy(true);
    try {
      await store().set('surveys', id, { sid: SURVEY.id, uid: key, role: u.role, section: u.section || null, answers: a, comment: comment.trim().slice(0, 600), at: Date.now() });
      toast(L('Thank you!', 'شكرًا!'));
    } catch (x) { toast(L('Could not save — try again.', 'لم يتم الحفظ — حاول مرة أخرى.')); }
    setBusy(false);
  };
  return <section class="card lead">
    <h2>{L('2-minute survey: the first week of the digital logbook', 'استبيان دقيقتين: أول أسبوع للوجبوك الرقمي')}</h2>
    <p class="muted">{L('Your answers are anonymous and will be included as totals in a report on the project. Open until Thursday 8 October.', 'إجاباتك مجهولة الهوية وهتدخل كأرقام إجمالية في تقرير عن المشروع. متاح لحد الخميس ٨ أكتوبر.')}</p>
    {!open ? <button class="btn primary" onClick={() => setOpen(true)}>{L('Answer the survey', 'جاوب الاستبيان')}</button> : <div class="stack">
      {qs.map(([k, en, ar], i) => <div class="crit"><b dir="auto">{i + 1}. {L(en, ar)}</b>
        <div class="seg" style={{ flexWrap: 'wrap' }}>{SCALE.map(([v, en2, ar2]) => <button type="button" class={a[k] === v ? 'on' : ''} onClick={() => setA({ ...a, [k]: v })}>{L(en2, ar2)}</button>)}</div></div>)}
      <label class="fld">{L('What worked well, and what should we improve? (optional)', 'إيه اللي كان كويس، وإيه اللي محتاج يتحسن؟ (اختياري)')}<textarea dir="auto" value={comment} maxLength={600} onInput={(ev) => setComment(ev.target.value)} /></label>
      <button class="btn primary" disabled={!done || busy} onClick={send}>{busy ? L('Saving…', 'جارٍ الحفظ…') : L('Send', 'إرسال')}</button>
    </div>}
  </section>;
}
