// Short pilot survey (first week of the digital logbook) for the report to the University President.
// One response per person; results are reported only as anonymous totals.
import { useState } from 'preact/hooks';
import { L, useDoc, useQuery, toast } from '../lib/ui.jsx';
import { store, isDemo } from '../lib/logic.js';

export const SURVEY = { id: 'pilot-2026-10', opens: Date.parse('2026-10-03T00:00:00+03:00'), closes: Date.parse('2026-10-08T23:59:00+03:00'), roles: ['student', 'demonstrator', 'lecturer'], label: 'Pilot week (students + staff)', studentCloses: Date.parse('2026-10-10T08:00:00+03:00') }; // staff: Thu 8 Oct 23:59; students: Sat 10 Oct 08:00 Cairo

// After the pilot: a staff-only round every 3 weeks, open Saturday 00:00 → Thursday 23:59 (Cairo).
const DAY = 86400000;
// Cairo midnight for a calendar date (Egypt summer time UTC+3 until the last Friday of Oct, then UTC+2 until the last Friday of Apr).
const cairo = (ymd) => Date.parse(ymd + 'T00:00:00' + (ymd >= '2026-10-30' && ymd < '2027-04-30' ? '+02:00' : '+03:00'));
const addDays = (ymd, n) => new Date(Date.parse(ymd + 'T12:00:00Z') + n * DAY).toISOString().slice(0, 10);
const fmtD = (t) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Cairo' });
export function surveyRounds(upto = Date.now()) {
  const out = [SURVEY];
  for (let k = 0; k < 20; k++) {
    const d = addDays('2026-10-24', 21 * k); // Saturdays: 24 Oct, 14 Nov, 5 Dec, 26 Dec …
    const opens = cairo(d);
    if (opens > upto) break;
    out.push({ id: 'staff-' + d, opens, closes: cairo(addDays(d, 6)) - 60000, roles: ['demonstrator', 'lecturer'], label: `Staff round ${k + 1} (${fmtD(opens)})` });
  }
  return out;
}
const closesFor = (r, role) => (role === 'student' && r.studentCloses) || r.closes;
const openRound = (role, now = Date.now()) => surveyRounds(now).find((r) => r.roles.includes(role) && now >= r.opens && now <= closesFor(r, role)) || null;

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
  const round = isDemo() ? null : openRound(u.role);
  const active = !!round;
  const key = String(u.uid);
  const id = active ? `${round.id}_${key}` : null;
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
      await store().set('surveys', id, { sid: round.id, uid: key, role: u.role, section: u.section || null, answers: a, comment: comment.trim().slice(0, 600), at: Date.now() });
      toast(L('Thank you!', 'شكرًا!'));
    } catch (x) { toast(L('Could not save — try again.', 'لم يتم الحفظ — حاول مرة أخرى.')); }
    setBusy(false);
  };
  return <section class="card lead">
    <h2>{round.id === SURVEY.id ? L('2-minute survey: the first week of the digital logbook', 'استبيان دقيقتين: أول أسبوع للوجبوك الرقمي') : '2-minute staff survey: the last 3 weeks on the digital logbook'}</h2>
    <p class="muted">{round.id === SURVEY.id ? L(u.role === 'student' ? 'Your answers are anonymous and will be included as totals in a report on the project. Open until Saturday 10 October, 8:00 am.' : 'Your answers are anonymous and will be included as totals in a report on the project. Open until Thursday 8 October.', u.role === 'student' ? 'إجاباتك مجهولة الهوية وهتدخل كأرقام إجمالية في تقرير عن المشروع. متاح لحد السبت ١٠ أكتوبر الساعة ٨ الصبح.' : 'إجاباتك مجهولة الهوية وهتدخل كأرقام إجمالية في تقرير عن المشروع. متاح لحد الخميس ٨ أكتوبر.') : `Staff survey every 3 weeks · anonymous totals · open until Thursday ${fmtD(round.closes)}.`}</p>
    {!open ? <button class="btn primary" onClick={() => setOpen(true)}>{L('Answer the survey', 'جاوب الاستبيان')}</button> : <div class="stack">
      {qs.map(([k, en, ar], i) => <div class="crit"><b dir="auto">{i + 1}. {L(en, ar)}</b>
        <div class="seg" style={{ flexWrap: 'wrap' }}>{SCALE.map(([v, en2, ar2]) => <button type="button" class={a[k] === v ? 'on' : ''} onClick={() => setA({ ...a, [k]: v })}>{L(en2, ar2)}</button>)}</div></div>)}
      <label class="fld">{L('What worked well, and what should we improve? (optional)', 'إيه اللي كان كويس، وإيه اللي محتاج يتحسن؟ (اختياري)')}<textarea dir="auto" value={comment} maxLength={600} onInput={(ev) => setComment(ev.target.value)} /></label>
      <button class="btn primary" disabled={!done || busy} onClick={send}>{busy ? L('Saving…', 'جارٍ الحفظ…') : L('Send', 'إرسال')}</button>
    </div>}
  </section>;
}

// Results for leaders (Dashboard): counts, average per question, % agree, anonymous comments.
export function SurveyResults() {
  const [show, setShow] = useState(false);
  const rounds = surveyRounds();
  const [rid, setRid] = useState(rounds[rounds.length - 1].id);
  const cur = rounds.find((r) => r.id === rid) || SURVEY;
  const q = useQuery(isDemo() ? null : 'surveys', [['sid', '==', rid]], {}, [rid]);
  if (isDemo()) return null;
  const rows = q.rows || [];
  const group = (stu) => rows.filter((r) => (r.role === 'student') === stu);
  const block = (title, list, qs) => {
    if (!list.length) return <div><h3>{title}</h3><p class="faint">No responses yet.</p></div>;
    return <div><h3>{title} — {list.length} response{list.length === 1 ? '' : 's'}</h3>
      <div class="tablewrap"><table><thead><tr><th>Question</th><th>Average /5</th><th>Agree or strongly agree</th></tr></thead><tbody>
        {qs.map(([k, en]) => {
          const v = list.map((r) => r.answers && r.answers[k]).filter((x) => x >= 1 && x <= 5);
          const avg = v.length ? (v.reduce((s, x) => s + x, 0) / v.length).toFixed(1) : '–';
          const agree = v.length ? Math.round((100 * v.filter((x) => x >= 4).length) / v.length) + '%' : '–';
          return <tr><td>{en}</td><td><b>{avg}</b></td><td>{agree}</td></tr>;
        })}
      </tbody></table></div>
      {show && <ul class="stack" style={{ marginTop: 8 }}>{list.filter((r) => r.comment).map((r) => <li dir="auto">{r.comment}{r.section ? <span class="faint"> · S{r.section}</span> : null}</li>)}</ul>}
    </div>;
  };
  const nComments = rows.filter((r) => r.comment).length;
  return <section class="card">
    <div class="row between"><h2>Survey results</h2>
      {rounds.length > 1 && <select value={rid} onChange={(e) => { setRid(e.target.value); setShow(false); }}>{rounds.map((r) => <option value={r.id}>{r.label}</option>)}</select>}</div>
    <p class="faint">Anonymous totals · {Date.now() <= closesFor(cur, 'student') ? (cur.studentCloses ? `students open until ${fmtD(cur.studentCloses)} 08:00 · staff until ${fmtD(cur.closes)} 23:59 · updates live` : `open until ${fmtD(cur.closes)} 23:59 · updates live`) : `closed ${fmtD(closesFor(cur, 'student'))}`} · next staff round every 3 weeks from Sat 24 Oct</p>
    {q.error ? <p class="faint">Could not load the survey answers.</p> : q.rows == null ? <p class="faint">Loading…</p> : <div class="stack">
      {cur.roles.includes('student') && block('Students', group(true), Q_STUDENT)}
      {block('Demonstrators and supervisors', group(false), Q_STAFF)}
      {nComments > 0 && <button class="btn sm" onClick={() => setShow(!show)}>{show ? 'Hide comments' : `Show comments (${nComments})`}</button>}
    </div>}
  </section>;
}
