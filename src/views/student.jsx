import { useEffect, useState, useMemo, useRef } from 'preact/hooks';
import { MyProject } from './projects.jsx';
import { me, store, today, currentWeek, checkIn, sessionIsOpen, createEntry, makeRequirement, addPhoto, saveSelf, submitEntry, requestAI, rubricFor, isDemo, sendMessage, deepLink, setStage, setProbeReading, labNo } from '../lib/logic.js';
import { SurveyCard } from './survey.jsx';
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
    <SurveyCard u={u} />
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
        <div class="list">{visibleAnn.length ? visibleAnn.slice(0, 4).map((a) => <details class="item" open={a.pinned}><summary>{a.pinned && <Pill kind="gold">{L('Pinned', 'مثبت')}</Pill>} {a.title}{a.imageUrl ? ' 🖼' : ''}{a.videoUrl ? ' ▶' : ''}</summary>{a.imageUrl && <a href={a.imageUrl} target="_blank" rel="noopener"><img src={a.imageUrl} alt={a.title} loading="lazy" style={{ display: 'block', maxWidth: '100%', maxHeight: 420, objectFit: 'contain', borderRadius: 12, marginTop: 8 }} /></a>}{a.videoUrl && <video controls playsInline preload="none" poster={a.videoUrl.replace(/\.mp4$/, '.jpg')} src={a.videoUrl} style={{ display: 'block', width: '100%', maxHeight: 420, borderRadius: 12, marginTop: 8, background: '#10262d' }} />}{a.body && <div style={{ marginTop: 6 }}>{a.body.split('\n').map((l) => <p dir="auto" style={{ margin: '0 0 4px', minHeight: '0.7em' }}>{l}</p>)}</div>}<p class="faint">{a.byName} · {fmtDate(a.publishAt, { day: 'numeric', month: 'short' })}</p></details>) : <Empty>{L('No announcements.', 'لا توجد إعلانات.')}</Empty>}</div></section>
    </div>
    <MyProject section={u.section} />
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
  // A scanned session that is not in the live list (weak network, list loaded before the lab opened):
  // read it from the phone's cache; the server still checks the code and the time window.
  const [scanned, setScanned] = useState(null);
  useEffect(() => {
    if (!sid || sessions.some((s) => s.id === sid) || (scanned && scanned.id === sid)) return;
    // Fully offline and never loaded: rebuild the session from its id (lec-N / lab-wW-sS-N) so the check-in is saved as pending;
    // the server still validates the code, section and time window when the phone reconnects.
    const fromId = () => { let m = /^lec-(\d+)$/.exec(sid); if (m) return { id: sid, type: 'lecture', lectureNo: Number(m[1]), date: today() };
      m = /^lab-w(\d+)-s(\d+)-(\d+)$/.exec(sid); if (m && Number(m[2]) === u.section) return { id: sid, type: 'lab', week: Number(m[1]), section: Number(m[2]), labNo: Number(m[3]), date: today() }; return null; };
    store().get('sessions', sid).then((d) => { if (d && (d.type === 'lecture' || d.section === u.section)) setScanned({ ...d, id: sid }); else if (!d) { const f = fromId(); if (f) setScanned(f); } })
      .catch(() => { const f = fromId(); if (f) setScanned(f); });
  }, [sid, sessions.length]);
  const chosen = sessions.find((s) => s.id === sid) || (scanned && scanned.id === sid ? scanned : null);
  const submit = async (e) => {
    e && e.preventDefault();
    if (!chosen) { setResult({ state: 'failed', reason: 'closed' }); return; }
    setResult({ state: 'sending' });
    const slow = setTimeout(() => setResult((r) => (r && r.state === 'sending' ? { state: 'pending' } : r)), navigator.onLine === false ? 0 : 6000);
    try { const r = await checkIn(chosen, code); clearTimeout(slow); setResult(r); }
    catch (x) { clearTimeout(slow); setResult({ state: 'failed', reason: x.reason || 'network' }); }
  };
  const [scan, setScan] = useState(false);
  const onScan = (text) => { setScan(false); try { const q = new URL(text).searchParams; if (q.get('s')) setSid(q.get('s')); if (q.get('c')) setCode(q.get('c').replace(/\D/g, '').slice(0, 6)); setResult(null); } catch (x) { setResult({ state: 'failed', reason: 'not-qr' }); } };
  const ready = chosen && code.length === 6;
  const reasons = {
    closed: L('This session is not open for attendance now. Ask the lecturer or demonstrator.', 'الجلسة غير مفتوحة للحضور الآن. اسأل المحاضر أو المعيد.'),
    'bad-code': L('The code is wrong or has expired (it changes every 30 seconds). Type the code shown now.', 'الكود خاطئ أو انتهت صلاحيته (يتغير كل ٣٠ ثانية). اكتب الكود المعروض الآن.'),
    'wrong-section': L('This lab session is for another section.', 'هذه الجلسة لسكشن آخر.'),
    rejected: L('The server refused this check-in: the code expired, the window closed, or the session is for another section. Tell the lecturer or demonstrator now, while you are present.', 'رفض الخادم التسجيل: انتهى الكود أو أُغلقت النافذة أو الجلسة لسكشن آخر. أبلغ المحاضر أو المعيد الآن أثناء وجودك.'),
    'not-qr': L('That is not the attendance QR. Scan the QR shown on the lecture or lab screen.', 'هذا ليس QR الحضور. امسح الـQR المعروض على شاشة المحاضرة أو اللاب.'),
    network: L('No connection. Move nearer a window or switch Wi-Fi/data, then tap Try again. If it still fails, tell the lecturer or demonstrator now.', 'لا يوجد اتصال. غيّر مكانك أو الشبكة ثم اضغط حاول مرة أخرى. إن استمرت المشكلة أبلغ المحاضر أو المعيد الآن.'),
  };
  return <>
    <section class="hero"><h1>{L('Attendance', 'الحضور')}</h1><p class="muted">{L('Scan the QR on the screen, then tap Confirm attendance. Staff confirm your presence afterwards.', 'امسح الـQR على الشاشة ثم اضغط تأكيد الحضور. يؤكد فريق التدريس حضورك بعدها.')}</p></section>
    {result && result.state !== 'sending' && <div class={'state ' + ({ recorded: 'recorded', duplicate: 'recorded', pending: 'pending', failed: 'failed' }[result.state])} role="status">
      {result.state === 'recorded' && <><b>✓ {L('Recorded', 'تم التسجيل')}</b><p>{L('Your check-in reached the server. It counts once staff confirm you are present — stay in the session and show your ID if asked.', 'وصل تسجيلك إلى الخادم. يُحتسب بعد تأكيد فريق التدريس لوجودك — ابقَ في الجلسة وأظهر الكارنيه عند الطلب.')}</p></>}
      {result.state === 'duplicate' && <><b>{L('Already recorded', 'مسجّل بالفعل')}</b><p>{L('You already checked in to this session. No need to submit again.', 'سجلت حضورك لهذه الجلسة من قبل. لا داعي للإرسال مرة أخرى.')}</p></>}
      {result.state === 'pending' && <><b>{L('Pending — saved on this phone', 'قيد الإرسال — محفوظ على الموبايل')}</b><p>{L('Your check-in has NOT reached the server yet. It is saved on this phone and is sent automatically as soon as you have signal again — up to 30 minutes after the session ends. Open the logbook once you are connected (e.g. after the lab) to see it change to Recorded.', 'لم يصل تسجيلك إلى الخادم بعد. هو محفوظ على موبايلك وسيُرسل تلقائيًا فور عودة الإشارة — حتى ٣٠ دقيقة بعد انتهاء المحاضرة أو اللاب. افتح اللوج بوك بعد اتصالك (مثلًا بعد اللاب) لترى الحالة "تم التسجيل".')}</p></>}
      {result.state === 'failed' && <><b>{L('Failed — not recorded', 'فشل — لم يُسجل')}</b><p>{reasons[result.reason] || reasons.network}</p><button class="btn" onClick={submit}>{L('Try again', 'حاول مرة أخرى')}</button></>}
    </div>}
    <form class="card lead" onSubmit={submit}>
      <h2>{L('Check in', 'تسجيل الحضور')}</h2>
      {!sessions.length && !chosen && <div class="state info"><b>{L('No open session showing on this phone', 'لا تظهر جلسة مفتوحة على هذا الموبايل')}</b><p>{L('When the lecturer or demonstrator shows the attendance QR on the screen, tap Scan the QR code. Opening this page alone does not record attendance.', 'عندما يعرض المحاضر أو المعيد QR الحضور على الشاشة اضغط امسح الـQR. فتح الصفحة وحده لا يسجل الحضور.')}</p></div>}
      {ready ? <div class="state recorded"><b>{chosen.type === 'lecture' ? `Lecture ${chosen.lectureNo} — ${chosen.title}` : `${labTitle(chosen)} · ${chosen.start}`}</b><p>{L('Session found. Tap Confirm attendance while you are in the room.', 'تم التعرف على الجلسة. اضغط تأكيد الحضور وأنت داخل القاعة.')}</p></div>
        : <><button type="button" id="scan-qr" class="btn primary big" onClick={() => setScan(true)}>{L('Scan the QR code', 'امسح الـQR')}</button>
          <p class="faint">{L('Keep this page open during the session: scanning works here even when the Wi-Fi is weak.', 'اترك هذه الصفحة مفتوحة أثناء المحاضرة أو اللاب: المسح يعمل هنا حتى لو الشبكة ضعيفة.')}</p></>}
      {scan && <QrScanner onResult={onScan} onClose={() => setScan(false)} />}
      {ready && <button id="confirm-att" class="btn primary big" disabled={result && result.state === 'sending'}>{result && result.state === 'sending' ? L('Sending…', 'جارٍ الإرسال…') : L('Confirm attendance', 'تأكيد الحضور')}</button>}
      {sessions.length > 0 && !ready && <details open={sessions.some((x) => x.type === 'lecture')}><summary class="faint">{L("Sitting far, or camera not working? Type the 6-digit code shown on the screen", 'بعيد عن الشاشة أو الكاميرا لا تعمل؟ اكتب الكود (٦ أرقام) المعروض على الشاشة')}</summary>
        {sessions.length > 1 && <label class="fld">{L('Session', 'الجلسة')}<select id="att-session" value={sid} onChange={(e) => setSid(e.target.value)}><option value="">{L('Choose the announced session', 'اختر الجلسة المعلنة')}</option>{sessions.map((s) => <option value={s.id}>{s.type === 'lecture' ? `Lecture ${s.lectureNo} — ${s.title}` : `${labTitle(s)} · ${s.start}`}</option>)}</select></label>}
        <label class="fld">{L('6-digit code shown now', 'الكود المعروض الآن (٦ أرقام)')}<input id="att-code" class="codebox" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" value={code} onInput={(e) => setCode(e.target.value.replace(/\D/g, ''))} /></label></details>}
      <p class="faint">{L('Student number', 'الرقم الجامعي')}: <span class="mono">{u.code}</span> · {L("Never check in for another student or forward the QR. It changes every 30 seconds and counts only after staff confirm you are in the room.", 'لا تسجل لطالب آخر ولا ترسل الـQR لأحد. يتغير كل ٣٠ ثانية ولا يُحتسب إلا بعد تأكيد فريق التدريس لوجودك.')}</p>
    </form>
    <section class="card"><h2>{L('My attendance', 'سجل حضوري')}</h2>
      <div class="list">{(hist.rows || []).length ? hist.rows.map((a) => { const [t, k] = attLabel(a.status); return <div class="item"><div class="grow"><b>{a.type === 'lecture' ? L('Lecture', 'محاضرة') : labTitle(a, false)}</b> <span class="faint">{fmtDate(a.date)} · {fmtTime(a.at)}</span>{a.reason && <div class="faint">{a.reason}</div>}</div><Pill kind={a._pending ? 'warn' : k}>{a._pending ? L('Pending', 'قيد الإرسال') : t}</Pill></div>; }) : <Empty>{L('No attendance yet.', 'لا يوجد حضور بعد.')}</Empty>}</div></section>
  </>;
}

// In-page QR reader: works inside the already-open logbook, so scanning still works when the network drops.
function QrScanner({ onResult, onClose }) {
  const vref = useRef(null);
  const zref = useRef(2);
  const [zoom, setZoomS] = useState(2);
  const [err, setErr] = useState('');
  const [optical, setOptical] = useState(false);
  const trackRef = useRef(null);
  // Zoom for far seats: optical zoom when the phone supports it, plus a digital crop of the centre at full resolution.
  const setZoom = (z) => {
    zref.current = z; setZoomS(z);
    const t = trackRef.current; const cap = t && t.getCapabilities ? t.getCapabilities() : {};
    setOptical(!!cap.zoom);
    if (cap.zoom) { try { t.applyConstraints({ advanced: [{ zoom: Math.min(cap.zoom.max, Math.max(cap.zoom.min, z)) }] }); } catch (x) { /* digital zoom still works */ } }
  };
  useEffect(() => {
    let stream, timer, stopped = false;
    (async () => {
      try {
        const jsQR = (await import('jsqr')).default;
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
        trackRef.current = stream.getVideoTracks()[0]; setZoom(zref.current);
        const v = vref.current; v.srcObject = stream; await v.play();
        const c = document.createElement('canvas'); const ctx = c.getContext('2d', { willReadFrequently: true });
        let n = 0;
        const tick = () => {
          if (stopped) return;
          if (v.videoWidth) {
            // Alternate between the zoomed centre (small, far QR) and the whole frame (near QR).
            const t = trackRef.current; const optical = !!(t && t.getCapabilities && t.getCapabilities().zoom);
            const z = n++ % 2 === 0 && !optical ? zref.current : 1;
            const sw = v.videoWidth / z, sh = v.videoHeight / z, sx = (v.videoWidth - sw) / 2, sy = (v.videoHeight - sh) / 2;
            const w = Math.min(800, sw), h = Math.round(sh * w / sw);
            c.width = w; c.height = h; ctx.drawImage(v, sx, sy, sw, sh, 0, 0, w, h);
            const r = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
            if (r && r.data) { onResult(r.data); return; }
          }
          timer = setTimeout(tick, 150);
        };
        tick();
      } catch (e) { setErr(L('Camera not available — allow camera access, or type the code instead.', 'الكاميرا غير متاحة — اسمح بالكاميرا أو اكتب الكود.')); }
    })();
    return () => { stopped = true; clearTimeout(timer); if (stream) stream.getTracks().forEach((t) => t.stop()); };
  }, []);
  return <div class="stack"><div style={{ overflow: 'hidden', borderRadius: 14, background: '#10262d', maxHeight: 360 }}>
      <video ref={vref} playsInline muted style={{ width: '100%', maxHeight: 360, objectFit: 'cover', display: 'block', transform: optical ? 'none' : `scale(${zoom})`, transformOrigin: 'center' }} /></div>
    <div class="seg" role="group" aria-label="Zoom">{[1, 2, 3, 4].map((z) => <button type="button" class={zoom === z ? 'on' : ''} onClick={() => setZoom(z)}>{z}×</button>)}</div>
    <p class="faint">{L('Far from the screen? Use 3× or 4×. Or type the 6-digit code shown under the QR.', 'بعيد عن الشاشة؟ استخدم 3× أو 4×. أو اكتب الكود (٦ أرقام) اللي تحت الـQR.')}</p>
    {err && <p class="faint">{err}</p>}<button type="button" class="btn" onClick={onClose}>{L('Cancel', 'إلغاء')}</button></div>;
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
  // Requirement teeth are recorded in Lab 1 only, at most wk.req (2) per week; Lab 2 is discussion and the group project.
  const wkS = useQuery('sessions', u.section ? [['section', '==', u.section], ['week', '==', wk.w]] : null, {}, [u.section, wk.w]);
  const lab1 = (wkS.rows || []).find((s) => s.type === 'lab' && labNo(s) === 1);
  const lab1Open = !lab1 || today() >= lab1.date;
  const full = weekRows.length >= (wk.req || 2);
  const byWeek = useMemo(() => { const m = {}; for (const e of rows) (m[e.week] = m[e.week] || []).push(e); return Object.entries(m).sort((a, b) => b[0] - a[0]); }, [rows]);
  return <>
    <section class="hero"><span class="eyebrow">{L(`Week ${wk.w}`, `الأسبوع ${wk.w}`)} · {fmtDate(wk.from, { day: 'numeric', month: 'short' })}–{fmtDate(wk.to, { day: 'numeric', month: 'short' })}</span><h1>{L('My lab', 'اللاب')}</h1><p class="muted">{wk.topic}</p></section>
    {wk.orientation ? <section class="card"><h2>{L('Orientation lab', 'لاب التهيئة')}</h2><p class="muted">{L('No cavity preparation until your demonstrator verifies these exercises.', 'لا تحضير للحفر حتى يتحقق المعيد من هذه التدريبات.')}</p><ol class="steps">{ORIENTATION_EXERCISES.map((x) => <li><div><b>{x.title}</b><div class="faint">{x.checks.join(' · ')}</div></div></li>)}</ol></section>
      : !u.section ? <section class="card lead"><h2>{L('Section not assigned yet', 'لم يتم تحديد السكشن بعد')}</h2><p class="muted">{L('Your lab section has not been entered yet. Until then you can attend lectures and use the library; lab check-in and tooth submissions open as soon as the course office assigns your section.', 'لم يتم إدخال السكشن الخاص بك بعد. حتى ذلك الحين يمكنك حضور المحاضرات واستخدام المكتبة؛ ويُفتح تسجيل حضور اللاب ورفع الأسنان فور تحديد السكشن.')}</p></section>
      : <section class="card lead"><div class="row between"><div><h2>{L("This week's requirements", 'متطلبات هذا الأسبوع')}</h2><p class="faint">{L(`${weekRows.filter((e) => e.status !== 'draft').length} of ${wk.req} submitted`, `تم إرسال ${weekRows.filter((e) => e.status !== 'draft').length} من ${wk.req}`)}</p></div><button class="btn primary" onClick={() => setStarting(true)} disabled={!wk.tasks.length || full || !lab1Open}>{L('+ New tooth', '+ سن جديد')}</button></div>
        {full ? <p class="faint">{L(`You have recorded your ${wk.req || 2} requirement teeth for this week (Lab 1). Use Practice below for extra self-training.`, `سجلت سنتي المتطلبات لهذا الأسبوع (لاب ١). استخدم التدريب الذاتي بالأسفل لأي تدريب إضافي.`)}</p>
          : !lab1Open && lab1 ? <p class="faint">{L(`Requirement teeth are recorded in your Lab 1: ${fmtDate(lab1.date, { weekday: 'long', day: 'numeric', month: 'short' })}, ${lab1.start}.`, `تُسجل أسنان المتطلبات في لاب ١: ${fmtDate(lab1.date, { weekday: 'long', day: 'numeric', month: 'short' })}، ${lab1.start}.`)}</p> : null}
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
  const weekMine = useQuery('entries', e ? [['uid', '==', e.uid], ['week', '==', e.week]] : null, {}, [e && e.uid, e && e.week]);
  useEffect(() => { if (e && picks === null) { setPicks(e.self?.picks || {}); setGrade(e.self?.grade ?? ''); setComment(e.self?.comment || ''); } }, [e]);
  if (!e) return <Sheet onClose={onClose}><p>{L('Loading…', 'جارٍ التحميل…')}</p></Sheet>;
  const rub = rubricFor(e);
  const editable = e.status === 'draft' || e.status === 'redo';
  // Self-assessment + Prep Lens are done at home: open while drafting and for 48 h after Submit (Board feedback, 5 Oct 2026).
  const selfOpen = editable || (!e.practice && ['submitted', 'reviewed'].includes(e.status) && Date.now() - (e.submittedAt || 0) < 48 * 3600e3);
  const stage = e.practice ? (e.stage || 'outline') : 'full';
  const crits = rub ? stageCriteria(rub, stage) : [];
  const aiHere = e.ai && (e.ai.stage || 'full') === stage ? e.ai : null;
  // Same as the demonstrator: the student marks only the defects; untouched criteria count as acceptable (A).
  const fullPicks = rub ? Object.fromEntries(crits.map((c) => [c.id, (picks && picks[c.id]) || 'A'])) : {};
  const allPicked = !!rub;
  const hasView = (v) => (e.photos || []).some((p) => p.view === v);
  const bothPhotos = e.practice ? !!e.photos?.length : hasView('occlusal') && hasView('probe');
  // Prep Lens is used on ONE requirement tooth per week; the second tooth is self-assessed and submitted directly.
  const lensUsedOn = !e.practice && !e.ai ? (weekMine.rows || []).find((x) => x.id !== e.id && !x.practice && x.ai) : null;
  const needGrade = !e.practice;
  const sugg = rub ? suggestGrade(rub, fullPicks) : null;
  const onPhoto = async (ev, vw) => {
    const f = ev.target.files && ev.target.files[0]; if (!f) return;
    // Photos must be taken now with the phone camera: older files (gallery, downloads) are refused.
    if (!e.practice && f.lastModified && Date.now() - f.lastModified > 10 * 60e3) { ev.target.value = ''; toast(L('Take the photo now with the camera — photos from the gallery are not accepted.', 'صوّر السنة دلوقتي بالكاميرا — صور المعرض غير مقبولة.')); return; }
    const v = vw || view; setView(v); setBusy('photo');
    try { const { quality } = await addPhoto(e.id, f, v); setQ(quality); }
    catch (x) { toast(L('Upload failed — check connection and try again.', 'فشل الرفع — تحقق من الاتصال وحاول مرة أخرى.')); }
    setBusy(''); ev.target.value = '';
  };
  const saveAndReveal = async () => {
    setBusy('self'); await saveSelf(e.id, fullPicks, grade === '' ? null : Number(grade), comment, !!e.review);
    try { await requestAI(e.id); } catch (x) { toast(x.message && x.message.includes('quota') ? L('Prep Lens daily limit reached — your self-assessment is saved; continue with your demonstrator.', 'تم الوصول للحد اليومي لـ Prep Lens — تم حفظ تقييمك الذاتي؛ تابع مع المعيد.') : L('Prep Lens is unavailable now. Your self-assessment is saved.', 'Prep Lens غير متاح الآن. تم حفظ تقييمك الذاتي.')); }
    setBusy('');
  };
  const hasSelf = grade !== '' || Object.values(fullPicks).some((b) => b !== 'A') || comment.trim();
  const submit = async () => { setBusy('submit'); if (hasSelf) await saveSelf(e.id, fullPicks, grade === '' ? null : Number(grade), comment, !!e.review); await submitEntry(e.id); setBusy(''); toast(L('Submitted — show the tooth to your demonstrator.', 'تم الإرسال — اعرض السن على المعيد.')); };
  const saveOnly = async () => { setBusy('save'); try { await saveSelf(e.id, fullPicks, grade === '' ? null : Number(grade), comment, !!e.review); toast(L('Self-assessment saved.', 'تم حفظ التقييم الذاتي.')); } catch (x) { toast(L('Could not save — try again.', 'لم يتم الحفظ — حاول مرة أخرى.')); } setBusy(''); };
  return <Sheet onClose={onClose} label="Tooth record">
    <div class="row between"><div><span class="eyebrow">{e.practice ? L('Practice (self-training) · not graded', 'تدريب ذاتي · بدون درجة') : L('Week', 'الأسبوع') + ' ' + e.week} · {fmtDate(e.date)}</span><h2>{rub?.title || e.taskLabel} <span class="mono">#{e.tooth}</span></h2></div><button class="btn sm" onClick={onClose}>{L('Close', 'إغلاق')}</button></div>
    {e.practice && <div class="stack"><span class="eyebrow">{L('Which step are you checking?', 'أي خطوة تراجع الآن؟')}</span><div class="seg" style={{ flexWrap: 'wrap' }}>{PREP_STAGES.map(([k, en, ar]) => <button class={stage === k ? 'on' : ''} onClick={() => setStage(e.id, k)}>{L(en, ar)}</button>)}</div></div>}
    {e.status === 'redo' && <div class="state failed"><b>{L('Correction needed', 'مطلوب تصحيح')}</b><p>{e.photoRejected ? L('Photo rejected: ', 'الصورة مرفوضة: ') + e.photoRejected : e.review?.feedback}</p></div>}
    {e.review && <section class="card flat"><div class="row between"><h3>{L('Demonstrator evaluation (official)', 'تقييم المعيد (الرسمي)')}</h3><span class="kpi" style={{ padding: '4px 12px' }}><span class="v mono">{e.review.grade}</span></span></div>
      <p>{e.review.feedback}</p><p class="faint">{e.review.byName} · {fmtDate(e.review.at, { day: 'numeric', month: 'short' })} · {e.review.status}</p></section>}

    <section class="stack"><h3>1 · {L('Photograph', 'التصوير')}</h3>
      <ul class="faint" style={{ margin: 0, paddingInlineStart: 18 }}>{(lang() === 'ar' ? PHOTO_GUIDE_AR : PHOTO_GUIDE).map((g) => <li>{g}</li>)}</ul>
      <div class="thumbs">{PHOTO_VIEWS.map(([v, en, ar]) => { const ph = (e.photos || []).filter((p) => p.view === v).slice(-1)[0];
        return <figure style={{ margin: 0 }}>{ph ? <img class="photo" src={ph.url} alt={`${en} — tooth ${e.tooth}`} /> : <div class="photo" style={{ display: 'grid', placeItems: 'center', background: 'var(--primary-soft)', color: 'var(--primary)', minHeight: 110 }}>{L('No photo yet', 'لا توجد صورة')}</div>}
          <figcaption class="faint">{L(en, ar)}</figcaption>
          {editable && <label class="btn sm" style={{ marginTop: 6, position: 'relative' }}>{busy === 'photo' && view === v ? L('Uploading…', 'جارٍ الرفع…') : ph ? L('Retake', 'إعادة التصوير') : L('Take photo', 'التقط صورة')}<input type="file" accept="image/*" capture="environment" style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' }} onChange={(ev) => onPhoto(ev, v)} /></label>}</figure>; })}</div>
      {q && (q.tooDark || q.blurry || q.tooBright) && <div class="state pending"><b>{L('Consider retaking', 'يُفضل إعادة التصوير')}</b><p>{[q.tooDark && L('too dark', 'مظلمة'), q.tooBright && L('too bright', 'ساطعة جدًا'), q.blurry && L('not sharp', 'غير واضحة')].filter(Boolean).join(' · ')}</p></div>}

      {(e.photos || []).some((p) => p.view === 'probe') && <label class="fld" style={{ maxWidth: 260 }}>{L('My probe reading (mm)', 'قراءة البروب (مم)')}<input id="probe-mm" type="number" min="0" max="10" step="0.5" inputMode="decimal" value={e.probeMm ?? ''} disabled={!editable} onChange={(ev) => { const v = ev.target.value; setProbeReading(e.id, v === '' ? null : Math.min(10, Math.max(0, Number(v)))); }} /></label>}
    </section>

    {editable && !e.practice && <section class="stack"><h3>2 · {L('Submit to your demonstrator', 'أرسل للمعيد')}</h3>
      {!bothPhotos ? <p class="faint">{L('Add both photos (occlusal 90° and proximal with probe) to submit.', 'أضف الصورتين (أكلوزال ٩٠° ومن الجنب بالبروب) عشان ترسل.')}</p>
        : <p class="faint">{L('In the lab: photos → Submit. The self-assessment and Prep Lens can be done later at home (within 48 h).', 'في اللاب: الصورتين ← إرسال. التقييم الذاتي وPrep Lens ممكن تعملهم بعدين في البيت (خلال ٤٨ ساعة).')}</p>}
      <button class="btn gold big" disabled={!bothPhotos || busy} onClick={submit}>{e.status === 'redo' ? L('Resubmit for review', 'أعد الإرسال للتقييم') : L('Submit for demonstrator review', 'أرسل لتقييم المعيد')}</button></section>}

    {rub && (e.practice || selfOpen || e.self) && <section class="stack"><h3>{e.practice ? '2' : '3'} · {e.practice ? L('Self-assessment against the rubric', 'التقييم الذاتي وفق الروبرك') : L('Self-assessment + Prep Lens — at home, within 48 h', 'التقييم الذاتي + Prep Lens — في البيت خلال ٤٨ ساعة')}</h3>
      <p class="faint">{e.practice ? L('Score your own work first. Prep Lens feedback appears after you save.', 'قيّم عملك أولًا. تظهر ملاحظات Prep Lens بعد الحفظ.') : L('Optional in the lab. Score your own work, then see the Prep Lens notes on your photos.', 'مش لازم في اللاب. قيّم شغلك، وبعدين شوف ملاحظات Prep Lens على صورك.')}</p>
      {e.practice && editable && <div class="state pending" style={{ display: 'block' }}><b style={{ fontSize: '1rem' }}>{L('This is a practice tooth — it is not sent to your demonstrator.', 'دي سنة تدريب — مش بتتبعت للمعيد.')}</b> {L('If this is one of your 2 requirement teeth, tap:', 'لو دي واحدة من سنتين المتطلبات، اضغط:')} <button class="btn sm" onClick={async () => { try { await makeRequirement(e.id); toast(L('Now a requirement tooth — add both photos, self-assess, then Submit.', 'بقت سنة متطلبات — أضف الصورتين وقيّم نفسك ثم أرسل.')); } catch (x) { toast(x.code === 'limit' ? L('You already have 2 requirement teeth this week.', 'عندك سنتين متطلبات الأسبوع ده بالفعل.') : x.message); } }}>{L('Make it a requirement tooth', 'حوّلها لسنة متطلبات')}</button></div>}
      {e.practice && <p class="faint">{L('Only the criteria of this step are shown.', 'تظهر بنود هذه الخطوة فقط.')}</p>}
      <p class="faint" style={{ marginTop: -4 }}>{L('Tap only what is wrong in your preparation, then choose how much. Everything not tapped counts as acceptable.', 'دوس بس على العيب الموجود في تحضيرك واختار درجته. أي بند ما دستش عليه بيتحسب مقبول.')}</p>
      <div class="defects">{crits.map((c) => { const b = fullPicks[c.id]; const on = b !== 'A'; const ai = aiHere?.criteria?.[c.id];
        return <div class={'defect' + (on ? ' on' : '')}>
          <button type="button" class={'chip' + (on ? ' on' : '')} disabled={!selfOpen} aria-pressed={on} onClick={() => setPicks({ ...fullPicks, [c.id]: on ? 'A' : 'B' })}>{on ? '✕ ' : ''}{c.name}</button>
          {on && <div class="seg">{[['B', L('Slight', 'بسيط')], ['C', L('Marked', 'واضح')], ['D', L('Unacceptable', 'غير مقبول')]].map(([k, l]) => <button type="button" disabled={!selfOpen} class={b === k ? 'on' : ''} onClick={() => setPicks({ ...fullPicks, [c.id]: k })}>{l}</button>)}</div>}
          {on && <div class="faint" style={{ fontSize: '.85rem' }}>{c.bands[rub.bands.findIndex((x) => x.key === b)]}</div>}
          {ai && <div class="row" style={{ gap: 6 }}><span class="faint">Prep Lens:</span>{ai.assessable ? <Band k={ai.band} /> : <Pill>{L('Not assessable from photo', 'لا يمكن تقييمه من الصورة')}</Pill>}<span class="faint">{ai.comment}</span></div>}
        </div>; })}</div>
      {needGrade && <div class="grid2"><label class="fld">{L('My overall grade (0–10)', 'درجتي الكلية (٠–١٠)')}<input id="self-grade" type="number" min="0" max="10" step="0.25" value={grade} disabled={!selfOpen} onInput={(ev) => setGrade(ev.target.value)} placeholder={sugg != null ? String(sugg) : ''} /></label>
        <label class="fld">{L('Note for my demonstrator (optional)', 'ملاحظة للمعيد (اختياري)')}<input id="self-note" value={comment} disabled={!selfOpen} onInput={(ev) => setComment(ev.target.value)} /></label></div>}
      {needGrade && sugg != null && <p class="faint">{L(`From your band choices the rubric suggests about ${sugg}/10.`, `حسب اختياراتك يقترح الروبرك حوالي ${sugg}/١٠.`)}</p>}
      {selfOpen && !aiHere && lensUsedOn && <p class="faint">{L(`Prep Lens is used on one tooth per week — you used it on #${lensUsedOn.tooth}. Your self-assessment of this tooth is still useful.`, `Prep Lens بيُستخدم على سنة واحدة في الأسبوع — استخدمته على #${lensUsedOn.tooth}. التقييم الذاتي للسنة دي لسه مفيد.`)}</p>}
      {selfOpen && !aiHere && !lensUsedOn && <button class="btn" disabled={!allPicked || (needGrade && grade === '') || !bothPhotos || busy} onClick={saveAndReveal}>{busy === 'self' ? L('Prep Lens is reading your photos…', 'Prep Lens يقرأ الصور…') : L('Save and see Prep Lens feedback', 'احفظ واعرض ملاحظات Prep Lens')}</button>}
      {selfOpen && !editable && (lensUsedOn || aiHere) && <button class="btn" disabled={!!busy || (needGrade && grade === '')} onClick={saveOnly}>{busy === 'save' ? L('Saving…', 'جارٍ الحفظ…') : L('Save my self-assessment', 'احفظ تقييمي الذاتي')}</button>}
      {aiHere && <div class="state info"><b>Prep Lens{e.practice ? ' · ' + L((PREP_STAGES.find((x) => x[0] === stage) || [])[1] || '', (PREP_STAGES.find((x) => x[0] === stage) || [])[2] || '') : ''}</b>
        {aiHere.depthMm != null && <p><b>{L(`Estimated depth from the probe photo ≈ ${aiHere.depthMm} mm`, `العمق التقريبي من صورة البروب ≈ ${aiHere.depthMm} مم`)}</b></p>}
        <p>{aiHere.summary || ''}</p><p class="faint">{L('Formative notes from your photos — not a grade. Only your demonstrator grades the physical tooth.', 'ملاحظات تعليمية من صورك — ليست درجة. المعيد وحده يقيّم السن الفعلي.')}</p></div>}
      {editable && aiHere && <button class="btn" disabled={!!busy || !allPicked} onClick={saveAndReveal}>{busy === 'self' ? L('Prep Lens is reading your photos…', 'Prep Lens يقرأ الصور…') : L('I corrected it — add new photos, then check again', 'صحّحت — أضف صورًا جديدة ثم راجع مرة أخرى')}</button>}
      {e.practice && (e.aiHistory || []).length > 1 && <details><summary>{L(`Progress on this tooth (${e.aiHistory.length} checks)`, `تقدّمك في هذا السن (${e.aiHistory.length} مراجعة)`)}</summary><div class="list">{e.aiHistory.slice().reverse().map((hx) => <div class="item"><div class="grow"><b>{L((PREP_STAGES.find((x) => x[0] === hx.stage) || PREP_STAGES[3])[1], (PREP_STAGES.find((x) => x[0] === hx.stage) || PREP_STAGES[3])[2])}</b>{hx.depthMm != null && <span class="faint"> · ≈{hx.depthMm} mm</span>}<div class="faint" dir="auto">{hx.summary}</div></div><span class="faint">{ago(hx.at)}</span></div>)}</div></details>}
    </section>}

    {e.status === 'submitted' && <div class="state pending"><b>{L('Waiting for your demonstrator', 'في انتظار المعيد')}</b><p>{L('Take the tooth to your demonstrator for inspection. Record the official grade in your physical logbook too. At home (within 48 h): do your self-assessment and Prep Lens above.', 'اعرض السن على المعيد للفحص، وسجل الدرجة الرسمية في اللوجبوك الورقي أيضًا. في البيت (خلال ٤٨ ساعة): اعمل التقييم الذاتي وPrep Lens فوق.')}</p></div>}
    {/* Per-tooth messages to the demonstrator were removed: no work, grades or attendance in messages (Course Director, 2 Oct 2026). */}
  </Sheet>;
}
