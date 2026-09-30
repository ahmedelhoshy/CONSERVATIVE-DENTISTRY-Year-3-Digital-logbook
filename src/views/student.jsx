import { useEffect, useState, useMemo } from 'preact/hooks';
import { me, store, today, currentWeek, checkIn, sessionIsOpen, createEntry, addPhoto, saveSelf, submitEntry, requestAI, rubricFor, isDemo, sendMessage, deepLink, setStage } from '../lib/logic.js';
import { L, lang, useQuery, useDoc, Pill, Band, Kpi, Bar, Sheet, Empty, fmtDate, fmtTime, ago, toast, useNow , labTitle } from '../lib/ui.jsx';
import { PRACTICAL_WEEKS, LECTURES, PHOTO_GUIDE, PHOTO_GUIDE_AR, PHOTO_VIEWS, PREP_STAGES, stageCriteria, ORIENTATION_EXERCISES, COURSE } from '../data/course.js';
import { rubricById, suggestGrade, RUBRICS } from '../data/rubrics.js';

const attLabel = (s) => ({ recorded: [L('Recorded — awaiting staff confirmation', 'مسجّل — في انتظار تأكيد فريق التدريس'), 'info'], confirmed: [L('Confirmed', 'مؤكد'), 'good'], rejected: [L('Rejected', 'مرفوض'), 'bad'] }[s] || [s, '']);
const entryLabel = (e) => e.practice ? [L('Practice', 'تدريب ذاتي'), 'info'] : ({ draft: [L('Draft', 'مسودة'), ''], submitted: [L('Waiting for demonstrator', 'في انتظار المعيد'), 'warn'], reviewed: [L('Reviewed', 'تم التقييم'), 'good'], redo: [L('Correct & resubmit', 'صحّح وأعد الإرسال'), 'bad'] }[e.status] || [e.status, '']);

export function StudentHome({ go }) {
  const u = me();
  const t = today();
  const wk = currentWeek();
  const ann = useQuery('announcements', [['audience', 'in', ['students', 'all', 'sections']]], { orderBy: 'publishAt', desc: true, limit: 20 });
  const sessions = useQuery('sessions', [['date', '>=', t]], { orderBy: 'date', limit: 60 });
  const att = useQuery('attendance', [['uid', '==', u.uid]]);
  const entries = useQuery('entries', [['uid', '==', u.uid]]);
  const mine = (sessions.rows || []).filter((s) => s.type === 'lecture' || s.section === u.section).slice(0, 4);
  const visibleAnn = (ann.rows || []).filter((a) => (a.audience === 'students' || a.audience === 'all' || (a.audience === 'sections' && (a.sections || []).includes(u.section))) && (!a.publishAt || a.publishAt <= Date.now() || isDemo()));
  const ents = (entries.rows || []).filter((e) => e.status !== 'draft' && !e.practice);
  const reviewed = ents.filter((e) => e.review);
  const mean = reviewed.length ? (reviewed.reduce((a, e) => a + e.review.grade, 0) / reviewed.length).toFixed(1) : '–';
  const confirmed = (att.rows || []).filter((a) => a.status === 'confirmed');
  const due = PRACTICAL_WEEKS.filter((w) => w.to < t).reduce((a, w) => a + w.req, 0);
  const pastWeeks = new Set(PRACTICAL_WEEKS.filter((w) => w.to < t).map((w) => w.w));
  const paper = useQuery('paperwork', [['uid', '==', u.uid]]);
  const done = reviewed.filter((e) => e.review.status === 'Completed' && !e.practice && pastWeeks.has(e.week)).length + (paper.rows || []).filter((p) => pastWeeks.has(p.week)).reduce((a, p) => a + (Number(p.teeth) || 0), 0);
  const fresh = reviewed.filter((e) => e.review.at > Date.now() - 7 * 86400e3 || isDemo()).sort((a, b) => b.review.at - a.review.at).slice(0, 3);
  return <>
    <section class="hero"><span class="eyebrow">{fmtDate(t, { weekday: 'long', day: 'numeric', month: 'long' })} · {L(`Practical week ${wk.w}`, `الأسبوع العملي ${wk.w}`)}</span>
      <h1>{L(`Hello, ${u.name.split(' ')[0]}`, `أهلاً ${u.name.split(' ')[0]}`)}</h1>
      <p class="muted">{wk.topic}</p></section>
    <div class="kpis">
      <Kpi label={L('Requirements completed', 'المتطلبات المكتملة')} value={`${done}/${due}`} kind={done >= due ? 'good' : done >= due * 0.7 ? 'warn' : 'bad'} sub={L('Completed in finished weeks', 'مكتملة في الأسابيع المنتهية')} />
      <Kpi label={L('Mean demonstrator grade', 'متوسط درجة المعيد')} value={mean} kind={mean === '–' ? '' : mean >= 6 ? 'good' : 'bad'} sub={L('Pass mark 6 / 10 (60 %)', 'النجاح ٦ من ١٠')} />
      <Kpi label={L('Confirmed attendances', 'الحضور المؤكد')} value={confirmed.length} kind="info" sub={L('Lectures and labs', 'محاضرات ومعامل')} />
    </div>
    <div class="grid2">
      <section class="card"><div class="row between"><h2>{L('Coming up', 'القادم')}</h2><button class="btn ghost" onClick={() => go('attend')}>{L('Attendance', 'الحضور')}</button></div>
        <div class="list">{mine.length ? mine.map((s) => <div class="item"><div class="grow"><b>{s.type === 'lecture' ? L(`Lecture ${s.lectureNo}`, `محاضرة ${s.lectureNo}`) : labTitle(s)}</b><div class="faint">{fmtDate(s.date)} · {s.start}–{s.end}{s.type === 'lecture' ? ` · ${COURSE.lectureSlot.place}` : ''}</div><div class="muted" style={{ fontSize: '.86rem' }}>{s.title}</div></div>{sessionIsOpen(s) && <Pill kind="good">{L('Open now', 'مفتوح الآن')}</Pill>}</div>) : <Empty>{L('No upcoming sessions.', 'لا توجد جلسات قادمة.')}</Empty>}</div></section>
      <section class="card"><h2>{L('Announcements', 'الإعلانات')}</h2>
        <div class="list">{visibleAnn.length ? visibleAnn.slice(0, 4).map((a) => <details class="item" open={a.pinned}><summary>{a.pinned && <Pill kind="gold">{L('Pinned', 'مثبت')}</Pill>} {a.title}{a.imageUrl ? ' 🖼' : ''}</summary>{a.imageUrl && <a href={a.imageUrl} target="_blank" rel="noopener"><img src={a.imageUrl} alt={a.title} loading="lazy" style={{ display: 'block', maxWidth: '100%', maxHeight: 420, objectFit: 'contain', borderRadius: 12, marginTop: 8 }} /></a>}{a.body && <p style={{ whiteSpace: 'pre-wrap', marginTop: 6 }} dir="auto">{a.body}</p>}<p class="faint">{a.byName} · {fmtDate(a.publishAt, { day: 'numeric', month: 'short' })}</p></details>) : <Empty>{L('No announcements.', 'لا توجد إعلانات.')}</Empty>}</div></section>
    </div>
    <section class="card"><div class="row between"><h2>{L('Latest feedback', 'آخر تقييمات')}</h2><button class="btn ghost" onClick={() => go('lab')}>{L('My lab', 'اللاب')}</button></div>
      {fresh.length ? <div class="list">{fresh.map((e) => <div class="item"><div class="grow"><b>{rubricById[e.rubricId]?.title || e.taskLabel}</b> <span class="mono">#{e.tooth}</span><div class="faint">{L('Week', 'أسبوع')} {e.week} · {e.review.byName}</div><p class="muted" style={{ fontSize: '.88rem' }}>{e.review.feedback}</p></div><div class="stack" style={{ alignItems: 'flex-end', gap: 4 }}><span class="faint">{L('Self', 'ذاتي')} <b class="mono">{e.self?.grade ?? '–'}</b></span><span>{L('Official', 'الرسمي')} <b class="mono">{e.review.grade}</b></span></div></div>)}</div> : <Empty>{L('No reviewed teeth yet.', 'لا توجد تقييمات بعد.')}</Empty>}
    </section>
  </>;
}

export function Attend() {
  const u = me();
  const now = useNow(5000);
  const open = useQuery('sessions', [['status', '==', 'open']]);
  const hist = useQuery('attendance', [['uid', '==', u.uid]], { orderBy: 'at', desc: true });
  const sessions = (open.rows || []).filter((s) => sessionIsOpen(s, now) && (s.type === 'lecture' || s.section === u.section));
  const [sid, setSid] = useState(deepLink.sid || '');
  const [code, setCode] = useState(deepLink.code || '');
  const [result, setResult] = useState(null);
  useEffect(() => { if (!sid && sessions.length === 1) setSid(sessions[0].id); }, [sessions.length]);
  const chosen = sessions.find((s) => s.id === sid);
  const submit = async (e) => {
    e && e.preventDefault();
    if (!chosen) { setResult({ state: 'failed', reason: 'closed' }); return; }
    setResult({ state: 'sending' });
    const slow = setTimeout(() => setResult((r) => (r && r.state === 'sending' ? { state: 'pending' } : r)), navigator.onLine === false ? 0 : 6000);
    try { const r = await checkIn(chosen, code); clearTimeout(slow); setResult(r); }
    catch (x) { clearTimeout(slow); setResult({ state: 'failed', reason: x.reason || 'network' }); }
  };
  useEffect(() => { if (deepLink.sid && deepLink.code && chosen && !result) submit(); }, [chosen]);
  const reasons = {
    closed: L('This session is not open for attendance now. Ask the lecturer or demonstrator.', 'الجلسة غير مفتوحة للحضور الآن. اسأل المحاضر أو المعيد.'),
    'bad-code': L('The code is wrong or has expired (it changes every 30 seconds). Type the code shown now.', 'الكود خاطئ أو انتهت صلاحيته (يتغير كل ٣٠ ثانية). اكتب الكود المعروض الآن.'),
    'wrong-section': L('This lab session is for another section.', 'هذه الجلسة لسكشن آخر.'),
    rejected: L('The server refused this check-in: the code expired, the window closed, or the session is for another section. Tell the lecturer or demonstrator now, while you are present.', 'رفض الخادم التسجيل: انتهى الكود أو أُغلقت النافذة أو الجلسة لسكشن آخر. أبلغ المحاضر أو المعيد الآن أثناء وجودك.'),
    network: L('No connection. Move nearer a window or switch Wi-Fi/data, then tap Try again. If it still fails, tell the lecturer or demonstrator now.', 'لا يوجد اتصال. غيّر مكانك أو الشبكة ثم اضغط حاول مرة أخرى. إن استمرت المشكلة أبلغ المحاضر أو المعيد الآن.'),
  };
  return <>
    <section class="hero"><h1>{L('Attendance', 'الحضور')}</h1><p class="muted">{L('Scan the QR on the board or type the 6-digit code during the open window. Staff confirm your presence afterwards.', 'امسح الـQR على السبورة أو اكتب الكود المكون من ٦ أرقام أثناء فترة الحضور. يؤكد فريق التدريس حضورك بعدها.')}</p></section>
    {result && result.state !== 'sending' && <div class={'state ' + ({ recorded: 'recorded', duplicate: 'recorded', pending: 'pending', failed: 'failed' }[result.state])} role="status">
      {result.state === 'recorded' && <><b>✓ {L('Recorded', 'تم التسجيل')}</b><p>{L('Your check-in reached the server. It counts once staff confirm you are present — stay in the session and show your ID if asked.', 'وصل تسجيلك إلى الخادم. يُحتسب بعد تأكيد فريق التدريس لوجودك — ابقَ في الجلسة وأظهر الكارنيه عند الطلب.')}</p></>}
      {result.state === 'duplicate' && <><b>{L('Already recorded', 'مسجّل بالفعل')}</b><p>{L('You already checked in to this session. No need to submit again.', 'سجلت حضورك لهذه الجلسة من قبل. لا داعي للإرسال مرة أخرى.')}</p></>}
      {result.state === 'pending' && <><b>{L('Pending — saved on this phone', 'قيد الإرسال — محفوظ على الموبايل')}</b><p>{L('Your check-in has NOT reached the server yet. It is saved on this phone and is sent automatically as soon as you have signal again — up to 30 minutes after the session ends. Open the logbook once you are connected (e.g. after the lab) to see it change to Recorded.', 'لم يصل تسجيلك إلى الخادم بعد. هو محفوظ على موبايلك وسيُرسل تلقائيًا فور عودة الإشارة — حتى ٣٠ دقيقة بعد انتهاء المحاضرة أو اللاب. افتح اللوج بوك بعد اتصالك (مثلًا بعد اللاب) لترى الحالة "تم التسجيل".')}</p></>}
      {result.state === 'failed' && <><b>{L('Failed — not recorded', 'فشل — لم يُسجل')}</b><p>{reasons[result.reason] || reasons.network}</p><button class="btn" onClick={submit}>{L('Try again', 'حاول مرة أخرى')}</button></>}
    </div>}
    <form class="card lead" onSubmit={submit}>
      <h2>{L('Check in', 'تسجيل الحضور')}</h2>
      {sessions.length ? <label class="fld">{L('Session', 'الجلسة')}<select id="att-session" value={sid} onChange={(e) => setSid(e.target.value)}><option value="">{L('Choose the announced session', 'اختر الجلسة المعلنة')}</option>{sessions.map((s) => <option value={s.id}>{s.type === 'lecture' ? `Lecture ${s.lectureNo} — ${s.title}` : `${labTitle(s)} · ${s.start}`}</option>)}</select></label>
        : <div class="state info"><b>{L('No session is open right now', 'لا توجد جلسة مفتوحة الآن')}</b><p>{L('Attendance opens only when the lecturer or demonstrator starts it (15-minute window). Opening this page alone does not record attendance.', 'يفتح الحضور فقط عندما يبدأه المحاضر أو المعيد (١٥ دقيقة). فتح الصفحة وحده لا يسجل الحضور.')}</p></div>}
      <label class="fld">{L('Student number', 'الرقم الجامعي')}<input id="att-code-student" value={u.code} disabled class="mono" /></label>
      <label class="fld">{L('6-digit code shown now', 'الكود المعروض الآن (٦ أرقام)')}<input id="att-code" class="codebox" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" value={code} onInput={(e) => setCode(e.target.value.replace(/\D/g, ''))} /></label>
      <button class="btn primary big" disabled={!chosen || code.length !== 6 || (result && result.state === 'sending')}>{result && result.state === 'sending' ? L('Sending…', 'جارٍ الإرسال…') : L('Submit attendance', 'إرسال الحضور')}</button>
      <p class="faint">{L("Never enter another student's number or share the code. The course assistant cannot record attendance.", 'لا تُدخل رقم طالب آخر ولا تشارك الكود. المساعد التعليمي لا يسجل الحضور.')}</p>
    </form>
    <section class="card"><h2>{L('My attendance', 'سجل حضوري')}</h2>
      <div class="list">{(hist.rows || []).length ? hist.rows.map((a) => { const [t, k] = attLabel(a.status); return <div class="item"><div class="grow"><b>{a.type === 'lecture' ? L('Lecture', 'محاضرة') : labTitle(a, false)}</b> <span class="faint">{fmtDate(a.date)} · {fmtTime(a.at)}</span>{a.reason && <div class="faint">{a.reason}</div>}</div><Pill kind={a._pending ? 'warn' : k}>{a._pending ? L('Pending', 'قيد الإرسال') : t}</Pill></div>; }) : <Empty>{L('No attendance yet.', 'لا يوجد حضور بعد.')}</Empty>}</div></section>
  </>;
}

export function MyLab() {
  const u = me();
  const wk = currentWeek();
  const entries = useQuery('entries', [['uid', '==', u.uid]], { orderBy: 'createdAt', desc: true });
  const [open, setOpen] = useState(null);
  const [starting, setStarting] = useState(false);
  const [practicing, setPracticing] = useState(false);
  const allRows = entries.rows || [];
  const rows = allRows.filter((e) => !e.practice);
  const practice = allRows.filter((e) => e.practice);
  const weekRows = rows.filter((e) => e.week === wk.w);
  const byWeek = useMemo(() => { const m = {}; for (const e of rows) (m[e.week] = m[e.week] || []).push(e); return Object.entries(m).sort((a, b) => b[0] - a[0]); }, [rows]);
  return <>
    <section class="hero"><span class="eyebrow">{L(`Week ${wk.w}`, `الأسبوع ${wk.w}`)} · {fmtDate(wk.from, { day: 'numeric', month: 'short' })}–{fmtDate(wk.to, { day: 'numeric', month: 'short' })}</span><h1>{L('My lab', 'اللاب')}</h1><p class="muted">{wk.topic}</p></section>
    {wk.orientation ? <section class="card"><h2>{L('Orientation lab', 'لاب التهيئة')}</h2><p class="muted">{L('No cavity preparation until your demonstrator verifies these exercises.', 'لا تحضير للحفر حتى يتحقق المعيد من هذه التدريبات.')}</p><ol class="steps">{ORIENTATION_EXERCISES.map((x) => <li><div><b>{x.title}</b><div class="faint">{x.checks.join(' · ')}</div></div></li>)}</ol></section>
      : !u.section ? <section class="card lead"><h2>{L('Section not assigned yet', 'لم يتم تحديد السكشن بعد')}</h2><p class="muted">{L('Your lab section has not been entered yet. Until then you can attend lectures and use the library; lab check-in and tooth submissions open as soon as the course office assigns your section.', 'لم يتم إدخال السكشن الخاص بك بعد. حتى ذلك الحين يمكنك حضور المحاضرات واستخدام المكتبة؛ ويُفتح تسجيل حضور اللاب ورفع الأسنان فور تحديد السكشن.')}</p></section>
      : <section class="card lead"><div class="row between"><div><h2>{L("This week's requirements", 'متطلبات هذا الأسبوع')}</h2><p class="faint">{L(`${weekRows.filter((e) => e.status !== 'draft').length} of ${wk.req} submitted`, `تم إرسال ${weekRows.filter((e) => e.status !== 'draft').length} من ${wk.req}`)}</p></div><button class="btn primary" onClick={() => setStarting(true)} disabled={!wk.tasks.length}>{L('+ New tooth', '+ سن جديد')}</button></div>
        <div class="list">{wk.tasks.map((t) => <div class="item"><div class="grow"><b>{t.rubric ? rubricById[t.rubric].title : t.label}</b><div class="faint">{L('Teeth', 'الأسنان')}: {t.teeth.length ? t.teeth.map((x) => '#' + x).join(', ') : '—'}{!t.rubric && ' · ' + L('Demonstrator records this task', 'يسجله المعيد')}</div></div></div>)}</div></section>}
    <section class="card"><div class="row between"><div><h2>{L('Practice anywhere (self-training)', 'تدرّب في أي مكان (تدريب ذاتي)')}</h2><p class="faint">{L('At home or in the lab, check each step — outline, depth and walls, finishing — with Prep Lens before you go to your demonstrator. Practice teeth are never graded and do not count as requirements.', 'في البيت أو في اللاب، راجع كل خطوة — الـ outline ثم العمق والجدران ثم التشطيب — مع Prep Lens قبل الذهاب للمعيد. أسنان التدريب لا تُقيَّم بدرجة ولا تُحسب من المتطلبات.')}</p></div><button class="btn" onClick={() => setPracticing(true)}>{L('+ Practice tooth', '+ سن تدريب')}</button></div>
      {practice.length > 0 && <div class="list">{practice.slice(0, 8).map((e) => <div class="item click" onClick={() => setOpen(e.id)}><div class="grow"><b>{rubricById[e.rubricId]?.title}</b> <span class="mono">#{e.tooth}</span><div class="faint">{fmtDate(e.date)} · {L(`${(e.aiHistory || []).length} Prep Lens check(s)`, `${(e.aiHistory || []).length} مراجعة Prep Lens`)}{e.ai?.depthMm ? ` · ≈${e.ai.depthMm} mm` : ''}</div></div><Pill kind="info">{L((PREP_STAGES.find((x) => x[0] === e.stage) || PREP_STAGES[3])[1], (PREP_STAGES.find((x) => x[0] === e.stage) || PREP_STAGES[3])[2])}</Pill></div>)}</div>}</section>
    {byWeek.length ? byWeek.map(([w, list]) => <section class="card"><h3>{L(`Week ${w}`, `الأسبوع ${w}`)}</h3><div class="list">{list.map((e) => { const [t, k] = entryLabel(e); return <div class="item click" onClick={() => setOpen(e.id)}><div class="grow"><b>{rubricById[e.rubricId]?.title || e.taskLabel}</b> <span class="mono">#{e.tooth}</span><div class="faint">{fmtDate(e.date)}{e.ai ? ' · Prep Lens ✓' : ''}</div></div><div class="stack" style={{ alignItems: 'flex-end', gap: 4 }}><Pill kind={k}>{t}</Pill><span class="faint">{L('Self', 'ذاتي')} <b class="mono">{e.self?.grade ?? '–'}</b> · {L('Official', 'رسمي')} <b class="mono">{e.review?.grade ?? '–'}</b></span></div></div>; })}</div></section>)
      : <Empty>{L('No teeth recorded yet. Tap “New tooth” in the lab.', 'لا توجد أسنان مسجلة بعد. اضغط "سن جديد" في اللاب.')}</Empty>}
    {starting && <NewTooth wk={wk} onClose={() => setStarting(false)} onCreated={(id) => { setStarting(false); setOpen(id); }} />}
    {practicing && <PracticeTooth wk={wk} onClose={() => setPracticing(false)} onCreated={(id) => { setPracticing(false); setOpen(id); }} />}
    {open && <EntrySheet id={open} onClose={() => setOpen(null)} />}
  </>;
}

function NewTooth({ wk, onClose, onCreated }) {
  const tasks = wk.tasks.filter((t) => t.rubric);
  const [ti, setTi] = useState(0);
  const [tooth, setTooth] = useState(tasks[0]?.teeth[0] || '');
  const t = tasks[ti];
  return <Sheet onClose={onClose} label="New tooth"><h2>{L('New tooth', 'سن جديد')}</h2>
    <label class="fld">{L('Exercise', 'التمرين')}<select id="nt-task" value={ti} onChange={(e) => { setTi(+e.target.value); setTooth(tasks[+e.target.value].teeth[0] || ''); }}>{tasks.map((x, i) => <option value={i}>{rubricById[x.rubric].title}</option>)}</select></label>
    <label class="fld">{L('Tooth (FDI number)', 'رقم السن (FDI)')}<select id="nt-tooth" value={tooth} onChange={(e) => setTooth(e.target.value)}>{(t?.teeth || []).map((x) => <option value={x}>#{x}</option>)}</select></label>
    {rubricById[t?.rubric]?.needsConfirmation && <p class="faint">{rubricById[t.rubric].source}</p>}
    <div class="row"><button class="btn primary" onClick={async () => onCreated(await createEntry({ week: wk.w, rubricId: t.rubric, tooth }))}>{L('Start', 'ابدأ')}</button><button class="btn" onClick={onClose}>{L('Cancel', 'إلغاء')}</button></div></Sheet>;
}

function PracticeTooth({ wk, onClose, onCreated }) {
  const list = RUBRICS.filter((r) => r.term === 1);
  const suggested = wk.tasks.find((t) => t.rubric)?.rubric;
  const [rid, setRid] = useState(suggested || list[0].id);
  const [tooth, setTooth] = useState(wk.tasks.find((t) => t.rubric === (suggested || list[0].id))?.teeth[0] || '');
  const [busy, setBusy] = useState(false);
  return <Sheet onClose={onClose} label="Practice tooth"><h2>{L('Practice tooth', 'سن تدريب')}</h2>
    <p class="muted">{L('Self-training only: Prep Lens gives notes on each step; nothing is graded or sent to your demonstrator.', 'تدريب ذاتي فقط: Prep Lens يعطيك ملاحظات على كل خطوة؛ لا توجد درجة ولا يُرسل شيء للمعيد.')}</p>
    <label class="fld">{L('Exercise', 'التمرين')}<select id="pt-rubric" value={rid} onChange={(e) => setRid(e.target.value)}>{list.map((r) => <option value={r.id}>{r.title}</option>)}</select></label>
    <label class="fld">{L('Tooth (FDI number)', 'رقم السن (FDI)')}<input id="pt-tooth" value={tooth} onInput={(e) => setTooth(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))} inputmode="numeric" placeholder="36" /></label>
    <div class="row"><button class="btn primary" disabled={busy || tooth.length !== 2} onClick={async () => { setBusy(true); try { onCreated(await createEntry({ week: wk.w, rubricId: rid, tooth, practice: true, stage: 'outline' })); } catch (e) { toast(L('Could not start — check your connection.', 'تعذر البدء — تحقق من الاتصال.')); setBusy(false); } }}>{L('Start with step 1 · Outline', 'ابدأ بالخطوة ١ · الـ Outline')}</button><button class="btn" onClick={onClose}>{L('Cancel', 'إلغاء')}</button></div></Sheet>;
}

export function EntrySheet({ id, onClose }) {
  const e = useDoc('entries', id);
  const u = me();
  const [picks, setPicks] = useState(null);
  const [grade, setGrade] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState('');
  const [q, setQ] = useState(null);
  const [view, setView] = useState('occlusal');
  const [msg, setMsg] = useState('');
  useEffect(() => { if (e && picks === null) { setPicks(e.self?.picks || {}); setGrade(e.self?.grade ?? ''); setComment(e.self?.comment || ''); } }, [e]);
  if (!e) return <Sheet onClose={onClose}><p>{L('Loading…', 'جارٍ التحميل…')}</p></Sheet>;
  const rub = rubricFor(e);
  const editable = e.status === 'draft' || e.status === 'redo';
  const stage = e.practice ? (e.stage || 'outline') : 'full';
  const crits = rub ? stageCriteria(rub, stage) : [];
  const aiHere = e.ai && (e.ai.stage || 'full') === stage ? e.ai : null;
  const allPicked = rub && crits.every((c) => picks && picks[c.id]);
  const needGrade = !e.practice;
  const sugg = rub && picks ? suggestGrade(rub, picks) : null;
  const onPhoto = async (ev) => {
    const f = ev.target.files[0]; if (!f) return;
    setBusy('photo');
    try { const { quality } = await addPhoto(e.id, f, view); setQ(quality); }
    catch (x) { toast(L('Upload failed — check connection and try again.', 'فشل الرفع — تحقق من الاتصال وحاول مرة أخرى.')); }
    setBusy(''); ev.target.value = '';
  };
  const saveAndReveal = async () => {
    setBusy('self'); await saveSelf(e.id, picks, grade === '' ? null : Number(grade), comment);
    try { await requestAI(e.id); } catch (x) { toast(x.message && x.message.includes('quota') ? L('Prep Lens daily limit reached — your self-assessment is saved; continue with your demonstrator.', 'تم الوصول للحد اليومي لـ Prep Lens — تم حفظ تقييمك الذاتي؛ تابع مع المعيد.') : L('Prep Lens is unavailable now. Your self-assessment is saved.', 'Prep Lens غير متاح الآن. تم حفظ تقييمك الذاتي.')); }
    setBusy('');
  };
  const submit = async () => { setBusy('submit'); await saveSelf(e.id, picks, grade === '' ? null : Number(grade), comment); await submitEntry(e.id); setBusy(''); toast(L('Submitted — show the tooth to your demonstrator.', 'تم الإرسال — اعرض السن على المعيد.')); };
  return <Sheet onClose={onClose} label="Tooth record">
    <div class="row between"><div><span class="eyebrow">{e.practice ? L('Practice (self-training) · not graded', 'تدريب ذاتي · بدون درجة') : L('Week', 'الأسبوع') + ' ' + e.week} · {fmtDate(e.date)}</span><h2>{rub?.title || e.taskLabel} <span class="mono">#{e.tooth}</span></h2></div><button class="btn sm" onClick={onClose}>{L('Close', 'إغلاق')}</button></div>
    {e.practice && <div class="stack"><span class="eyebrow">{L('Which step are you checking?', 'أي خطوة تراجع الآن؟')}</span><div class="seg" style={{ flexWrap: 'wrap' }}>{PREP_STAGES.map(([k, en, ar]) => <button class={stage === k ? 'on' : ''} onClick={() => setStage(e.id, k)}>{L(en, ar)}</button>)}</div></div>}
    {e.status === 'redo' && <div class="state failed"><b>{L('Correction needed', 'مطلوب تصحيح')}</b><p>{e.photoRejected ? L('Photo rejected: ', 'الصورة مرفوضة: ') + e.photoRejected : e.review?.feedback}</p></div>}
    {e.review && <section class="card flat"><div class="row between"><h3>{L('Demonstrator evaluation (official)', 'تقييم المعيد (الرسمي)')}</h3><span class="kpi" style={{ padding: '4px 12px' }}><span class="v mono">{e.review.grade}</span></span></div>
      <p>{e.review.feedback}</p><p class="faint">{e.review.byName} · {fmtDate(e.review.at, { day: 'numeric', month: 'short' })} · {e.review.status}</p></section>}

    <section class="stack"><h3>1 · {L('Photograph', 'التصوير')}</h3>
      <ul class="faint" style={{ margin: 0, paddingInlineStart: 18 }}>{(lang() === 'ar' ? PHOTO_GUIDE_AR : PHOTO_GUIDE).map((g) => <li>{g}</li>)}</ul>
      {e.photos?.length > 0 && <div class="thumbs">{e.photos.map((p) => <figure style={{ margin: 0 }}><img class="photo" src={p.url} alt={`${p.view} view of tooth ${e.tooth}`} /><figcaption class="faint">{p.view}</figcaption></figure>)}</div>}
      {q && (q.tooDark || q.blurry || q.tooBright) && <div class="state pending"><b>{L('Consider retaking', 'يُفضل إعادة التصوير')}</b><p>{[q.tooDark && L('too dark', 'مظلمة'), q.tooBright && L('too bright', 'ساطعة جدًا'), q.blurry && L('not sharp', 'غير واضحة')].filter(Boolean).join(' · ')}</p></div>}
      {editable && <div class="row"><div class="seg">{PHOTO_VIEWS.map(([v, en, ar]) => <button class={view === v ? 'on' : ''} onClick={() => setView(v)}>{L(en, ar)}</button>)}</div>
        <label class="btn primary">{busy === 'photo' ? L('Uploading…', 'جارٍ الرفع…') : L('Take / choose photo', 'التقط / اختر صورة')}<input id="photo-input" type="file" accept="image/*" capture="environment" onChange={onPhoto} hidden /></label></div>}
    </section>

    {rub && <section class="stack"><h3>2 · {L('Self-assessment against the rubric', 'التقييم الذاتي وفق الروبرك')}</h3>
      <p class="faint">{L('Score your own work first. Prep Lens feedback appears after you save.', 'قيّم عملك أولًا. تظهر ملاحظات Prep Lens بعد الحفظ.')}</p>
      {e.practice && <p class="faint">{L('Only the criteria of this step are shown.', 'تظهر بنود هذه الخطوة فقط.')}</p>}
      {crits.map((c) => <div class="crit"><div class="row between"><b>{c.name}</b><span class="faint">{c.group}{c.weight ? ` · ${c.weight} mark${c.weight > 1 ? 's' : ''}` : ''}</span></div>
        <div class="bands">{rub.bands.map((b, i) => <button disabled={!editable} class={(picks && picks[c.id] === b.key ? 'on ' : '') + b.key} onClick={() => setPicks({ ...picks, [c.id]: b.key })}><b>{b.label.replace('Accepted ', '').replace('Unaccepted ', '')}</b>{c.bands[i]}</button>)}</div>
        {aiHere && <div class="row" style={{ gap: 6 }}><span class="faint">Prep Lens:</span>{aiHere.criteria[c.id]?.assessable ? <Band k={aiHere.criteria[c.id].band} /> : <Pill>{L('Not assessable from photo', 'لا يمكن تقييمه من الصورة')}</Pill>}<span class="faint">{aiHere.criteria[c.id]?.comment}</span></div>}
      </div>)}
      {needGrade && <div class="grid2"><label class="fld">{L('My overall grade (0–10)', 'درجتي الكلية (٠–١٠)')}<input id="self-grade" type="number" min="0" max="10" step="0.25" value={grade} disabled={!editable} onInput={(ev) => setGrade(ev.target.value)} placeholder={sugg != null ? String(sugg) : ''} /></label>
        <label class="fld">{L('Note for my demonstrator (optional)', 'ملاحظة للمعيد (اختياري)')}<input id="self-note" value={comment} disabled={!editable} onInput={(ev) => setComment(ev.target.value)} /></label></div>}
      {needGrade && sugg != null && <p class="faint">{L(`From your band choices the rubric suggests about ${sugg}/10.`, `حسب اختياراتك يقترح الروبرك حوالي ${sugg}/١٠.`)}</p>}
      {editable && !aiHere && <button class="btn" disabled={!allPicked || (needGrade && grade === '') || !e.photos?.length || busy} onClick={saveAndReveal}>{busy === 'self' ? L('Prep Lens is reading your photos…', 'Prep Lens يقرأ الصور…') : L('Save and see Prep Lens feedback', 'احفظ واعرض ملاحظات Prep Lens')}</button>}
      {aiHere && <div class="state info"><b>Prep Lens{e.practice ? ' · ' + L((PREP_STAGES.find((x) => x[0] === stage) || [])[1] || '', (PREP_STAGES.find((x) => x[0] === stage) || [])[2] || '') : ''}</b>
        {aiHere.depthMm != null && <p><b>{L(`Estimated depth from the probe photo ≈ ${aiHere.depthMm} mm`, `العمق التقريبي من صورة البروب ≈ ${aiHere.depthMm} مم`)}</b></p>}
        <p>{aiHere.summary || ''}</p><p class="faint">{L('Formative notes from your photos — not a grade. Only your demonstrator grades the physical tooth.', 'ملاحظات تعليمية من صورك — ليست درجة. المعيد وحده يقيّم السن الفعلي.')}</p></div>}
      {editable && aiHere && <button class="btn" disabled={!!busy || !allPicked} onClick={saveAndReveal}>{busy === 'self' ? L('Prep Lens is reading your photos…', 'Prep Lens يقرأ الصور…') : L('I corrected it — add new photos, then check again', 'صحّحت — أضف صورًا جديدة ثم راجع مرة أخرى')}</button>}
      {e.practice && (e.aiHistory || []).length > 1 && <details><summary>{L(`Progress on this tooth (${e.aiHistory.length} checks)`, `تقدّمك في هذا السن (${e.aiHistory.length} مراجعة)`)}</summary><div class="list">{e.aiHistory.slice().reverse().map((hx) => <div class="item"><div class="grow"><b>{L((PREP_STAGES.find((x) => x[0] === hx.stage) || PREP_STAGES[3])[1], (PREP_STAGES.find((x) => x[0] === hx.stage) || PREP_STAGES[3])[2])}</b>{hx.depthMm != null && <span class="faint"> · ≈{hx.depthMm} mm</span>}<div class="faint" dir="auto">{hx.summary}</div></div><span class="faint">{ago(hx.at)}</span></div>)}</div></details>}
    </section>}

    {editable && !e.practice && <button class="btn gold big" disabled={!allPicked || grade === '' || !e.photos?.length || busy} onClick={submit}>{e.status === 'redo' ? L('Resubmit for review', 'أعد الإرسال للتقييم') : L('Submit for demonstrator review', 'أرسل لتقييم المعيد')}</button>}
    {e.status === 'submitted' && <div class="state pending"><b>{L('Waiting for your demonstrator', 'في انتظار المعيد')}</b><p>{L('Take the tooth to your demonstrator for inspection. Record the official grade in your physical logbook too.', 'اعرض السن على المعيد للفحص، وسجل الدرجة الرسمية في اللوجبوك الورقي أيضًا.')}</p></div>}
    <section class="stack"><h3>{L('Ask my demonstrator about this tooth', 'اسأل المعيد عن هذا السن')}</h3><div class="row"><input id="entry-msg" value={msg} onInput={(ev) => setMsg(ev.target.value)} placeholder={L('e.g. Check my margins?', 'مثال: هل الحواف سليمة؟')} style={{ flex: 1, minWidth: 180 }} /><button class="btn" disabled={!msg.trim()} onClick={async () => { await sendMessage(u.uid, u.section, `[#${e.tooth} ${rub?.title || ''}] ${msg}`, e.id); setMsg(''); toast(L('Sent to your demonstrators', 'تم الإرسال للمعيدين')); }}>{L('Send', 'إرسال')}</button></div></section>
  </Sheet>;
}
