import { useEffect, useState, useMemo } from 'preact/hooks';
import QRCode from 'qrcode';
import { me, store, today, openSession, closeSession, extendSession, rotateCode, sessionIsOpen, setAttendance, confirmAllRecorded, reviewEntry, submitEntry, rubricFor, isDemo, canEditCourse, currentWeek } from '../lib/logic.js';
import { SurveyCard } from './survey.jsx';
import { L, useQuery, useDoc, useNow, Pill, Band, Kpi, Sheet, Empty, Confirm, fmtDate, fmtTime, fmtDT, ago, toast, Bar , labTitle } from '../lib/ui.jsx';
import { exportXlsx } from '../lib/export.js';
import { suggestGrade } from '../data/rubrics.js';
import { TOOTH_STATUS, PRACTICAL_WEEKS } from '../data/course.js';
import { Thread } from './chat.jsx';

const mySections = (u) => (['director', 'admin', 'hod', 'vicedean', 'dean'].includes(u.role) ? Array.from({ length: 18 }, (_, i) => i + 1) : u.sections || []);

export function Today() {
  const u = me();
  const t = today();
  const end = new Date(new Date(t).getTime() + 7 * 86400e3).toISOString().slice(0, 10);
  const q = useQuery('sessions', [['date', '>=', t], ['date', '<=', end]], { orderBy: 'date' });
  const [open, setOpen] = useState(null);
  const secs = mySections(u);
  const rows = (q.rows || []).filter((s) => {
    if (['director', 'admin'].includes(u.role)) return true;
    if (s.type === 'lecture') return ['lecturer', 'hod', 'vicedean', 'dean'].includes(u.role); // any lecturer can open any lecture (they cover for each other)
    return secs.includes(s.section);
  }).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const ann = useQuery('announcements', [['audience', 'in', ['staff', 'all']]], { orderBy: 'publishAt', desc: true, limit: 3 });
  const todays = rows.filter((s) => s.date === t);
  const later = rows.filter((s) => s.date > t);
  return <>
    <SurveyCard u={u} />
    <section class="hero"><span class="eyebrow">{fmtDate(t, { weekday: 'long', day: 'numeric', month: 'long' })} · Week {currentWeek().w}</span><h1>{u.role === 'lecturer' ? 'My sessions' : 'Today'}</h1>
      <p class="muted">{u.role === 'demonstrator' ? `Sections ${secs.join(' & ')}. Open attendance at the start of the lab, confirm each student at the bench, then review their teeth.` : u.role === 'lecturer' ? `Sections ${secs.join(', ') || '—'}. Open attendance at the start of each lab (or your lecture), confirm students at the bench, then review the Lab 1 teeth in the Review queue.` : 'All sessions scheduled today.'}</p></section>
    {(ann.rows || []).length > 0 && <section class="card"><h2>Staff announcements</h2><div class="list">{ann.rows.map((a) => <details class="item" open={a.pinned}><summary>{a.title} <span class="faint">· {fmtDate(a.publishAt, { day: 'numeric', month: 'short' })}</span></summary>{a.imageUrl && <a href={a.imageUrl} target="_blank" rel="noopener"><img src={a.imageUrl} alt={a.title} loading="lazy" style={{ display: 'block', maxWidth: '100%', maxHeight: 420, objectFit: 'contain', borderRadius: 12, marginTop: 8 }} /></a>}{a.videoUrl && <video controls playsInline preload="none" poster={a.videoUrl.replace(/\.mp4$/, '.jpg')} src={a.videoUrl} style={{ display: 'block', width: '100%', maxHeight: 420, borderRadius: 12, marginTop: 8, background: '#10262d' }} />}{a.body && <div style={{ marginTop: 6 }}>{a.body.split('\n').map((l) => <p dir="auto" style={{ margin: '0 0 4px', minHeight: '0.7em' }}>{l}</p>)}</div>}{a.linkUrl && <a class="btn primary" href={a.linkUrl} target="_blank" rel="noopener" style={{ marginTop: 8, display: 'inline-block' }}>{a.linkLabel || 'Open link'}</a>}</details>)}</div></section>}
    <section class="card lead"><h2>Today</h2><div class="list">{todays.length ? todays.map((s) => <SessionRow s={s} onOpen={() => setOpen(s.id)} />) : <Empty>No sessions today.</Empty>}</div></section>
    <section class="card"><h2>Next 7 days</h2><div class="list">{later.length ? later.slice(0, 30).map((s) => <SessionRow s={s} onOpen={() => setOpen(s.id)} />) : <Empty>Nothing scheduled.</Empty>}</div></section>
    {open && <SessionPanel id={open} onClose={() => setOpen(null)} />}
  </>;
}

function SessionRow({ s, onOpen }) {
  const now = useNow(10000);
  const st = sessionIsOpen(s, now) ? <Pill kind="good">Open</Pill> : s.status === 'closed' ? <Pill>Closed</Pill> : <Pill kind="info">Scheduled</Pill>;
  return <div class="item click" onClick={onOpen}><div class="grow"><b>{s.type === 'lecture' ? `Lecture ${s.lectureNo}` : labTitle(s)}</b> <span class="faint">{fmtDate(s.date)} · {s.start}–{s.end}</span><div class="muted" style={{ fontSize: '.86rem' }}>{s.title}</div></div>{st}</div>;
}

export function SessionPanel({ id, onClose }) {
  const s = useDoc('sessions', id);
  const u = me();
  const now = useNow(1000);
  const att = useQuery('attendance', [['sid', '==', id]]);
  const roster = useQuery('users', s ? (s.type === 'lab' ? [['role', '==', 'student'], ['section', '==', s.section]] : [['role', '==', 'student']]) : null, {}, [s && s.section]);
  const [proj, setProj] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [ask, setAsk] = useState(null);
  if (!s) return <Sheet onClose={onClose}><p>Loading…</p></Sheet>;
  const isOpen = sessionIsOpen(s, now);
  const recs = {}; for (const a of att.rows || []) recs[a.uid] = a;
  const studs = (roster.rows || []).map((st) => ({ ...st, rec: recs[st.uid] || recs[st.code] }));
  const counts = { recorded: 0, confirmed: 0, rejected: 0, none: 0 };
  for (const st of studs) counts[st.rec ? st.rec.status : 'none']++;
  const shown = studs.filter((st) => (filter === 'all' || (st.rec ? st.rec.status : 'none') === filter) && (!search || (st.name + st.code).toLowerCase().includes(search.toLowerCase()))).sort((a, b) => String(a.code).localeCompare(String(b.code)));
  const canManage = !['hod', 'vicedean', 'dean'].includes(u.role);
  const left = s.closesAt ? Math.max(0, Math.round((s.closesAt - now) / 1000)) : 0;
  const register = () => exportXlsx({ title: `Attendance register — ${s.type === 'lecture' ? 'Lecture ' + s.lectureNo : labTitle(s)}`, range: `${s.date} ${s.start}–${s.end}`, filters: `Session ${s.id}`, columns: [{ label: 'Student number', key: 'code' }, { label: 'Name', key: 'name', w: 34 }, { label: 'Section', key: 'section' }, { label: 'Status', get: (r) => (r.rec ? r.rec.status : 'no record') }, { label: 'Check-in time', get: (r) => (r.rec ? fmtDT(r.rec.at) : '') }, { label: 'Method', get: (r) => r.rec?.method || '' }, { label: 'Decided by', get: (r) => r.rec?.byName || '' }, { label: 'Reason', get: (r) => r.rec?.reason || '' }], rows: studs, definitions: {}, fileName: `register_${s.id}` });
  return <Sheet onClose={onClose} label="Session">
    <div class="row between"><div><span class="eyebrow">{fmtDate(s.date)} · {s.start}–{s.end}</span><h2>{s.type === 'lecture' ? `Lecture ${s.lectureNo}` : labTitle(s)}</h2><p class="muted">{s.title}</p></div><button class="btn sm" onClick={onClose}>Close</button></div>
    {canManage && <div class="card flat">
      {isOpen ? <><div class="row between"><div><Pill kind="good">Attendance open</Pill> <span class="mono">{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</span> left</div></div>
        <div class="row"><button class="btn primary" onClick={() => setProj(true)}>Show code & QR</button><button class="btn" onClick={() => extendSession(s.id, 5)}>+5 min</button><button class="btn danger" onClick={() => closeSession(s.id)}>Close attendance</button></div></>
        : <><p class="muted">{s.status === 'closed' ? 'Attendance is closed. You can still confirm, reject or add students manually with a reason.' : 'Opens a 15-minute window with a code that changes every 30 seconds.'}</p>
          {s.date === today() ? <div class="row"><button class="btn primary" onClick={async () => { await openSession(s.id); setProj(true); }}>{s.status === 'closed' ? 'Reopen attendance' : 'Open attendance'}</button></div>
            : <p class="faint">{s.date > today() ? `Attendance opens on the day of the session (${fmtDate(s.date)}).` : 'This session has passed. Add or correct students manually below, with a reason.'}</p>}</>}
    </div>}
    <div class="kpis"><Kpi label="Awaiting confirmation" value={counts.recorded} kind={counts.recorded ? 'warn' : ''} /><Kpi label="Confirmed" value={counts.confirmed} kind="good" /><Kpi label="Rejected" value={counts.rejected} kind={counts.rejected ? 'bad' : ''} /><Kpi label="No record" value={counts.none} sub={s.status === 'closed' ? 'No record is not proof of absence' : ''} /></div>
    <div class="row">{canManage && counts.recorded > 0 && <button class="btn gold" onClick={async () => { const n = await confirmAllRecorded(s.id); toast(`${n} confirmed`); }}>Confirm all {counts.recorded} recorded</button>}<button class="btn" onClick={register}>Download register (Excel)</button></div>
    <div class="row"><div class="seg">{[['all', 'All'], ['recorded', 'Awaiting'], ['confirmed', 'Confirmed'], ['rejected', 'Rejected'], ['none', 'No record']].map(([k, l]) => <button class={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l}</button>)}</div><input id="sess-search" placeholder="Search name or number" value={search} onInput={(e) => setSearch(e.target.value)} style={{ maxWidth: 240 }} /></div>
    <div class="list">{shown.slice(0, 200).map((st) => { const r = st.rec; return <div class="item"><div class="grow"><b>{st.name}</b> <span class="mono faint">{st.code}</span>{s.type === 'lecture' && <span class="faint"> · S{st.section}</span>}<div class="faint">{r ? `${r.method === 'manual' ? 'Added by staff' : 'Checked in'} ${fmtTime(r.at)}${r.byName && r.status !== 'recorded' ? ' · ' + r.byName : ''}${r.reason ? ' · ' + r.reason : ''}` : 'No check-in'}</div></div>
      <div class="row" style={{ gap: 6 }}>{r ? <Pill kind={{ recorded: 'warn', confirmed: 'good', rejected: 'bad' }[r.status]}>{{ recorded: 'Awaiting', confirmed: 'Confirmed', rejected: 'Rejected' }[r.status]}</Pill> : null}
        {canManage && (!r || r.status === 'recorded') && <button class="btn sm" onClick={() => (r ? setAttendance(s, st, 'confirmed') : setAsk({ st, status: 'confirmed' }))}>{r ? 'Confirm' : 'Mark present'}</button>}
        {canManage && r && r.status !== 'rejected' && <button class="btn sm danger" onClick={() => setAsk({ st, status: 'rejected' })}>Reject</button>}
        {canManage && r && r.status === 'rejected' && <button class="btn sm" onClick={() => setAsk({ st, status: 'confirmed' })}>Correct</button>}</div></div>; })}
      {shown.length > 200 && <p class="faint">Showing 200 of {shown.length}. Use search.</p>}</div>
    {ask && <Confirm text={`${ask.status === 'confirmed' ? 'Record as present' : 'Reject check-in'}: ${ask.st.name}`} needReason yes="Save" onNo={() => setAsk(null)} onYes={async (reason) => { try { await setAttendance(s, ask.st, ask.status, reason); setAsk(null); toast('Saved'); } catch (x) { toast('Not saved: ' + (x.code || x.message || 'error') + ' — check the connection and try again, or send a screenshot to the Course Director.'); } }} />}
    {proj && <Projector session={s} onClose={() => setProj(false)} />}
  </Sheet>;
}

export function Projector({ session, onClose }) {
  const code = useDoc('codes', session.id);
  const now = useNow(1000);
  const [qr, setQr] = useState('');
  const [bigCode, setBigCode] = useState(false); // code only, very large, for students sitting far from the screen
  const s = useDoc('sessions', session.id) || session;
  useEffect(() => {
    let wake = null;
    try { navigator.wakeLock && navigator.wakeLock.request('screen').then((w) => (wake = w)).catch(() => {}); } catch (e) { /* ignore */ }
    const t = setInterval(() => { if (sessionIsOpen(s)) rotateCode(session.id); }, 30000);
    return () => { clearInterval(t); wake && wake.release && wake.release(); };
  }, [session.id]);
  useEffect(() => { if (!code) return; const url = `${location.origin}${location.pathname}?s=${encodeURIComponent(session.id)}&c=${code.cur}`; QRCode.toDataURL(url, { margin: 1, width: 600, errorCorrectionLevel: 'M' }).then(setQr); }, [code && code.cur]);
  const open = sessionIsOpen(s, now);
  const cyc = code ? Math.max(0, 30 - Math.floor((now - code.at) / 1000)) : 30;
  const left = s.closesAt ? Math.max(0, Math.round((s.closesAt - now) / 1000)) : 0;
  return <div class="projector" role="dialog" aria-label="Attendance code">
    <div style={{ opacity: .8 }}>{session.type === 'lecture' ? `Lecture ${session.lectureNo} · ${session.title}` : labTitle(session)}</div>
    {open ? <>
      {!bigCode && <div class="qr">{qr ? <img src={qr} alt="Attendance QR code" /> : null}</div>}
      <div class="big" style={bigCode ? { fontSize: 'min(22vw, 40vh)', letterSpacing: '.08em', lineHeight: 1 } : null}>{code ? code.cur : '······'}</div>
      {bigCode && <div style={{ fontSize: '1.6rem' }}>Type this code in the logbook: Attendance → type the code · اكتب الكود في صفحة الحضور</div>}
      <div class="timer" aria-hidden="true"><i style={{ width: (cyc / 30) * 100 + '%' }} /></div>
      <div>Scan with the phone camera, or in the logbook: Attendance → Scan the QR code, then tap Confirm attendance. New code in {cyc}s · window closes in {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</div>
    </> : <div class="big" style={{ fontSize: '2.4rem', letterSpacing: 0 }}>Attendance closed</div>}
    <div class="row" style={{ justifyContent: 'center' }}>{open && <button class="btn" onClick={() => setBigCode(!bigCode)}>{bigCode ? 'Show QR' : 'Large code for back rows'}</button>}<button class="btn" onClick={() => extendSession(session.id, 5)}>+5 min</button><button class="btn" onClick={onClose}>Back to list</button></div>
  </div>;
}

// ---------------- Review ----------------
// Accept Arabic digits (٨٫٥), Persian digits and a comma decimal (8,5) from phone keyboards.
const normGrade = (v) => String(v || '').replace(/[\u0660-\u0669]/g, (d) => d.charCodeAt(0) - 0x660).replace(/[\u06F0-\u06F9]/g, (d) => d.charCodeAt(0) - 0x6F0).replace(/[\u066B,،]/g, '.').replace(/[^0-9.]/g, '');

export function ReviewQueue() {
  const u = me();
  const secs = mySections(u);
  const [sec, setSec] = useState(secs.length > 2 ? 'all' : secs[0]);
  const boss = ['director', 'admin'].includes(u.role);
  const [drafts, setDrafts] = useState(false);
  const [done, setDone] = useState(false);
  const filters = [done ? ['status', '==', 'reviewed'] : ['status', drafts ? 'in' : '==', drafts ? ['submitted', 'draft'] : 'submitted']];
  if (sec !== 'all') filters.push(['section', '==', Number(sec)]); else if (!['director', 'admin', 'hod'].includes(u.role)) filters.push(['section', 'in', secs.slice(0, 10)]);
  const q = useQuery('entries', filters, { orderBy: 'createdAt' });
  const [open, setOpen] = useState(null);
  const since = Date.now() - 2 * 86400000;
  const rows = done ? (q.rows || []).filter((e) => (e.review?.at || 0) >= since).sort((a, b) => (b.review?.at || 0) - (a.review?.at || 0)) : (q.rows || []);
  return <>
    <section class="hero"><h1>Review queue</h1><p class="muted">Teeth submitted by students and waiting for inspection. Examine the physical tooth before saving a grade; Prep Lens output is supporting information only.</p>
      {boss && <label class="row" style={{ gap: 8, cursor: 'pointer' }}><input type="checkbox" checked={drafts} onChange={(ev) => setDrafts(ev.target.checked)} /> Course Director: also show teeth not yet submitted (drafts) — you can admit and grade them</label>}</section>
    <div class="row"><label class="fld" style={{ maxWidth: 220 }}>Section<select id="rq-section" value={sec} onChange={(e) => setSec(e.target.value)}>{secs.length > 2 && <option value="all">All sections</option>}{secs.map((s) => <option value={s}>Section {s}</option>)}</select></label><div class="seg"><button class={!done ? 'on' : ''} onClick={() => setDone(false)}>Waiting</button><button class={done ? 'on' : ''} onClick={() => setDone(true)}>Graded (last 48 h)</button></div>{done ? <Pill kind="good">{rows.length} graded</Pill> : <Pill kind={rows.length ? 'warn' : 'good'}>{rows.length} waiting</Pill>}</div>
    <section class="card"><div class="list">{rows.length ? rows.map((e) => <div class="item click" onClick={() => setOpen(e.id)}><div class="grow"><b>{e.name}</b> <span class="mono faint">{e.code}</span> <span class="faint">· S{e.section}</span><div class="faint">{rubricFor(e)?.title} · <span class="mono">#{e.tooth}</span> · week {e.week}</div></div><div class="stack" style={{ alignItems: 'flex-end', gap: 4 }}>{done ? <><b class="mono" style={{ fontSize: '1.25em' }}>{e.review?.grade ?? '–'}</b><span class="faint">{e.review?.byName || ''} · {ago(e.review?.at)}</span></> : <><span class="faint">{ago(e.submittedAt || e.createdAt)}</span><span class="faint">Self <b class="mono">{e.self?.grade ?? '–'}</b></span></>}</div></div>) : <Empty>{done ? 'No teeth graded in the last 48 hours.' : 'Nothing waiting. Well done.'}</Empty>}</div></section>
    {open && <ReviewSheet id={open} onClose={() => setOpen(null)} />}
  </>;
}

export function ReviewSheet({ id, onClose }) {
  const e = useDoc('entries', id);
  const u = me();
  const [picks, setPicks] = useState(null);
  const [grade, setGrade] = useState('');
  const [status, setStatus] = useState('Completed');
  const [feedback, setFeedback] = useState('');
  const [reason, setReason] = useState('');
  const [rejectPhoto, setRejectPhoto] = useState('');
  const [showAI, setShowAI] = useState(false);
  const [busy, setBusy] = useState(false);
  const attended = useQuery('attendance', e ? [['uid', '==', e.uid], ['type', '==', 'lab']] : null, {}, [e && e.uid]);
  useEffect(() => { if (e && picks === null) { setPicks(e.review?.picks || {}); setGrade(e.review?.grade ?? ''); setStatus(e.review?.status || 'Completed'); setFeedback(e.review?.feedback || ''); } }, [e]);
  if (!e) return <Sheet onClose={onClose}><p>Loading…</p></Sheet>;
  const rub = rubricFor(e);
  const readOnly = ['hod', 'vicedean', 'dean'].includes(u.role);
  // Course Director / admin supervise all sections: they may admit a tooth and grade it without a confirmed attendance record.
  const boss = ['director', 'admin'].includes(u.role);
  // Overall grading: the demonstrator marks only the defects; untouched criteria count as acceptable (A).
  const full = rub ? Object.fromEntries(rub.criteria.map((c) => [c.id, (picks && picks[c.id]) || 'A'])) : {};
  const defects = rub ? rub.criteria.filter((c) => full[c.id] !== 'A') : [];
  const sugg = rub ? suggestGrade(rub, full) : null;
  const weekAtt = (attended.rows || []).filter((a) => a.week === e.week && a.status === 'confirmed').length;
  const attOk = weekAtt > 0 || boss;
  const markPresent = async () => {
    try {
      const ss = (await store().query('sessions', [['section', '==', e.section]])).filter((x) => x.type === 'lab' && Number(x.week) === Number(e.week)).sort((a, b) => String(a.date).localeCompare(String(b.date)));
      const s = ss.find((x) => x.date === e.date) || ss[0];
      if (!s) { toast('No lab session found for this week.'); return; }
      await setAttendance(s, { uid: e.uid, code: e.code, name: e.name, section: e.section }, 'confirmed', 'Admitted by the Course Director');
      toast('Marked present');
    } catch (x) { toast('Could not mark present: ' + x.message); }
  };
  const gradeOk = grade !== '' && Number.isFinite(Number(grade)) && Number(grade) >= 0 && Number(grade) <= 10;
  const changing = e.review && Number(grade) !== e.review.grade;
  const save = async (redo) => {
    setBusy(true);
    const auto = defects.length ? 'Defects: ' + defects.map((c) => `${c.name} — ${c.bands[rub.bands.findIndex((b) => b.key === full[c.id])]}`).join('; ') + '.' : 'No defects noted.';
    try { if (boss && e.status === 'draft') await submitEntry(e.id); await reviewEntry(e, { picks: full, mode: 'overall', grade: Number(grade), status, feedback: feedback.trim() ? feedback : auto, reason, redo, rejectPhoto: rejectPhoto || null }); toast('Saved'); onClose(); }
    catch (x) { toast(x.message); }
    setBusy(false);
  };
  return <Sheet onClose={onClose} label="Review">
    <div class="row between"><div><span class="eyebrow">Section {e.section} · week {e.week} · {fmtDate(e.date)}</span><h2>{e.name} <span class="mono faint">{e.code}</span></h2><p class="muted">{rub?.title} · <span class="mono">#{e.tooth}</span></p></div><button class="btn sm" onClick={onClose}>Close</button></div>
    {weekAtt === 0 && !readOnly && !boss && <div class="state failed"><b>No confirmed lab attendance this week</b><p>Official grades need physical attendance. Confirm the student's attendance for this week's lab first (Today → the lab → Confirm or Mark present), then grade the tooth.</p></div>}
    {weekAtt === 0 && boss && <div class="state pending" style={{ display: 'block' }}><b>No confirmed lab attendance this week</b> — as Course Director you can still grade. <button class="btn sm" onClick={markPresent}>Mark present (Course Director)</button></div>}
    {e.status === 'draft' && boss && <div class="state pending" style={{ display: 'block' }}><b>Not submitted by the student yet.</b> Saving a grade admits the tooth on the student's behalf.</div>}
    {e.photos?.length ? <div class="thumbs">{e.photos.map((p) => <a href={p.url} target="_blank" rel="noopener"><img class="photo" src={p.url} alt={`${p.view} view`} /></a>)}</div> : <p class="faint">No photos attached.</p>}
    {e.self?.comment && <p><b>Student note:</b> {e.self.comment}</p>}
    <div class="row"><span class="faint">Student self-grade</span><b class="mono">{e.self?.grade ?? '–'}</b>{e.probeMm != null && <><span class="faint">· probe reading</span><b class="mono">{e.probeMm} mm</b></>}{e.ai && <button class="btn sm" onClick={() => setShowAI(!showAI)}>{showAI ? 'Hide' : 'Show'} Prep Lens feedback</button>}</div>
    {rub && !readOnly && <section class="stack"><h3>Defects in the preparation</h3><p class="faint" style={{ marginTop: -6 }}>Tap only what is wrong, then choose how much. Everything not tapped is recorded as acceptable.</p>
      <div class="defects">{rub.criteria.map((c) => { const b = full[c.id]; const on = b !== 'A'; const si = e.self?.picks?.[c.id]; const ai = e.ai?.criteria?.[c.id];
        return <div class={'defect' + (on ? ' on' : '')}>
          <button type="button" class={'chip' + (on ? ' on' : '')} aria-pressed={on} onClick={() => setPicks({ ...full, [c.id]: on ? 'A' : 'B' })}>{on ? '✕ ' : ''}{c.name}{si && si !== 'A' ? <span class="faint"> · student {si}</span> : ''}{showAI && ai?.assessable && ai.band !== 'A' ? <span class="faint"> · AI {ai.band}</span> : ''}</button>
          {on && <div class="seg">{[['B', 'Slight'], ['C', 'Marked'], ['D', 'Unacceptable']].map(([k, l]) => <button type="button" class={b === k ? 'on' : ''} onClick={() => setPicks({ ...full, [c.id]: k })}>{l}</button>)}</div>}
          {on && <div class="faint" style={{ fontSize: '.85rem' }}>{c.bands[rub.bands.findIndex((x) => x.key === b)]}</div>}
        </div>; })}</div>
      {defects.length === 0 && <p class="faint">No defects marked — the tooth will be recorded as meeting every criterion.</p>}
    </section>}
    {rub && readOnly && <section class="stack"><h3>Your evaluation of the physical tooth</h3>
      {rub.criteria.map((c) => <div class="crit"><div class="row between"><b>{c.name}</b><span class="row" style={{ gap: 6 }}><span class="faint">Self</span><Band k={e.self?.picks?.[c.id]} />{showAI && <><span class="faint">AI</span>{e.ai?.criteria?.[c.id]?.assessable ? <Band k={e.ai.criteria[c.id].band} /> : <Band k={null} title="Not assessable from photo" />}</>}</span></div>
        <div class="bands">{rub.bands.map((b, i) => <button disabled={readOnly} class={(picks && picks[c.id] === b.key ? 'on ' : '') + b.key} onClick={() => setPicks({ ...picks, [c.id]: b.key })}><b>{b.label.replace('Accepted ', '').replace('Unaccepted ', '')}</b>{c.bands[i]}</button>)}</div></div>)}
    </section>}
    {!readOnly && <>
      <div class="grid2"><label class="fld">Overall grade (0–10){sugg != null ? ` · from the defects marked: about ${sugg}` : ''}<input id="rv-grade" type="text" inputMode="decimal" autoComplete="off" value={grade} onInput={(ev) => setGrade(normGrade(ev.target.value))} placeholder={sugg != null ? String(sugg) : ''} /></label>
        <label class="fld">Requirement status<select id="rv-status" value={status} onChange={(ev) => setStatus(ev.target.value)}>{TOOTH_STATUS.map((t) => <option>{t}</option>)}</select></label></div>
      <label class="fld">Comment to the student (optional — the defects marked are sent automatically)<textarea id="rv-feedback" value={feedback} onInput={(ev) => setFeedback(ev.target.value)} placeholder="Optional" /></label>
      {changing && <label class="fld">Reason for changing the saved grade (audit log)<input id="rv-reason" value={reason} onInput={(ev) => setReason(ev.target.value)} /></label>}
      <details><summary>Photo unclear?</summary><label class="fld" style={{ marginTop: 8 }}>Reject photo and ask for a new one — reason<input id="rv-reject" value={rejectPhoto} onInput={(ev) => setRejectPhoto(ev.target.value)} placeholder="e.g. not at 90°, no probe for scale" /></label></details>
      {(() => { const why = [];
        if (!attOk) why.push('the student has no confirmed attendance this week');
        if (grade === '') why.push('enter the official grade');
        else if (!gradeOk) why.push('the grade must be a number from 0 to 10 (e.g. 8.5)');
        if (changing && !reason.trim()) why.push('give a reason for changing the saved grade');
        return why.length ? <div class="state pending" role="status" style={{ display: "block", padding: 12 }}><b style={{ fontSize: "1rem" }}>To save:</b> {why.join(' · ')}.</div> : null; })()}
      <div class="row"><button class="btn primary" disabled={busy || !attOk || !gradeOk || (changing && !reason.trim())} onClick={() => save(false)}>Save evaluation</button>
        <button class="btn danger" disabled={busy || !attOk || !gradeOk || (!feedback.trim() && !defects.length)} onClick={() => { if (confirm('This sends the tooth BACK to the student to correct and resubmit. To simply grade it, press Cancel and use "Save evaluation".')) save(true); }}>Save & ask to correct</button></div>
    </>}
    {e.history?.length > 0 && <details><summary>History ({e.history.length})</summary><div class="list">{e.history.map((ev) => <div class="item faint">{fmtDT(ev.at)} · {ev.event}{ev.by ? ' · ' + ev.by : ''}{ev.reason ? ' · ' + ev.reason : ''}</div>)}</div></details>}
  </Sheet>;
}

// ---------------- Students ----------------
export function Students() {
  const u = me();
  const secs = mySections(u);
  const [sec, setSec] = useState(secs[0] || 1);
  const [open, setOpen] = useState(null);
  const studs = useQuery('users', [['role', '==', 'student'], ['section', '==', Number(sec)]]);
  const ents = useQuery('entries', [['section', '==', Number(sec)]]);
  const att = useQuery('attendance', [['section', '==', Number(sec)]]);
  const sess = useQuery('sessions', [['section', '==', Number(sec)]]);
  const paper = useQuery('paperwork', [['section', '==', Number(sec)]]);
  const t = today();
  const withRec = new Set((att.rows || []).map((a) => a.sid));
  // Only labs where attendance was actually taken count as held.
  const labsHeld = (sess.rows || []).filter((s) => s.type === 'lab' && s.date <= t && (s.status === 'open' || s.status === 'closed' || withRec.has(s.id))).map((s) => s.id);
  const heldSet = new Set(labsHeld);
  // Weeks that have started (the current week's requirement is due by its end).
  const due = PRACTICAL_WEEKS.filter((w) => w.from <= t).reduce((a, w) => a + w.req, 0);
  const past = new Set(PRACTICAL_WEEKS.filter((w) => w.to < t).map((w) => w.w));
  const rows = (studs.rows || []).map((s) => {
    const e = (ents.rows || []).filter((x) => x.uid === s.uid && x.review && !x.practice);
    const done = e.filter((x) => x.review.status === 'Completed').length + (paper.rows || []).filter((p) => p.uid === s.uid && past.has(p.week)).reduce((a, p) => a + (Number(p.teeth) || 0), 0);
    const labPres = new Set((att.rows || []).filter((a) => a.uid === s.uid && a.type === 'lab' && a.status === 'confirmed' && heldSet.has(a.sid)).map((a) => a.sid)).size;
    const mean = e.length ? e.reduce((a, x) => a + x.review.grade, 0) / e.length : null;
    return { ...s, done, due, labAtt: labsHeld.length ? Math.round((labPres / labsHeld.length) * 100) : null, mean: mean == null ? null : Math.round(mean * 10) / 10, pending: (ents.rows || []).filter((x) => x.uid === s.uid && x.status === 'submitted').length };
  }).sort((a, b) => String(a.code).localeCompare(String(b.code)));
  return <>
    <section class="hero"><h1>Students</h1><p class="muted">Section roster with attendance, requirements and grades.</p></section>
    <div class="row"><label class="fld" style={{ maxWidth: 220 }}>Section<select id="st-section" value={sec} onChange={(e) => setSec(e.target.value)}>{secs.map((s) => <option value={s}>Section {s}</option>)}</select></label>
      <button class="btn" style={{ alignSelf: 'flex-end' }} onClick={() => exportXlsx({ title: `Section ${sec} progress`, filters: `Section ${sec}`, columns: [{ label: 'Student number', key: 'code' }, { label: 'Name', key: 'name', w: 34 }, { label: 'Lab attendance %', key: 'labAtt' }, { label: 'Requirements completed', key: 'done' }, { label: 'Requirements due', key: 'due' }, { label: 'Mean official grade', key: 'mean' }, { label: 'Awaiting review', key: 'pending' }], rows, definitions: { labAtt: 'Confirmed lab attendances ÷ lab sessions held', done: 'Teeth reviewed with status Completed', due: 'Sum of weekly requirements for completed weeks', mean: 'Mean demonstrator grade (0–10)' } })}>Export (Excel)</button></div>
    <div class="tablewrap"><table><thead><tr><th>Number</th><th>Name</th><th class="n">Lab att.</th><th class="n">Req.</th><th class="n">Mean</th><th>Flags</th></tr></thead><tbody>
      {rows.map((r) => <tr class="click" onClick={() => setOpen(r)}><td class="mono">{r.code}</td><td>{r.name}</td><td class="n">{r.labAtt ?? '–'}%</td><td class="n">{r.done}/{r.due}</td><td class="n">{r.mean ?? '–'}</td><td>{r.labAtt != null && r.labAtt < 75 && <Pill kind="bad">attendance</Pill>} {r.mean != null && r.mean < 6 && <Pill kind="bad">below 6</Pill>} {r.done < r.due * 0.7 && <Pill kind="warn">behind</Pill>} {r.pending > 0 && <Pill kind="info">{r.pending} to review</Pill>}</td></tr>)}
    </tbody></table></div>
    {open && <StudentSheet s={open} onClose={() => setOpen(null)} />}
  </>;
}

export function StudentSheet({ s, onClose }) {
  const ents = useQuery('entries', [['uid', '==', s.uid]], { orderBy: 'createdAt', desc: true });
  const att = useQuery('attendance', [['uid', '==', s.uid]], { orderBy: 'at', desc: true });
  const [rev, setRev] = useState(null);
  const [tab, setTab] = useState('work');
  return <Sheet onClose={onClose} label="Student">
    <div class="row between"><div><span class="eyebrow">Section {s.section} · {s.status || ''}</span><h2>{s.name}</h2><p class="mono faint">{s.code}</p></div><button class="btn sm" onClick={onClose}>Close</button></div>
    <div class="seg" style={{ alignSelf: 'flex-start' }}>{[['work', 'Logbook'], ['att', 'Attendance'], ['msg', 'Messages']].map(([k, l]) => <button class={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
    {tab === 'work' && <div class="tablewrap"><table><thead><tr><th>Wk</th><th>Exercise</th><th>Tooth</th><th class="n">Self</th><th class="n">AI</th><th class="n">Official</th><th>Status</th></tr></thead><tbody>{(ents.rows || []).map((e) => <tr class="click" onClick={() => setRev(e.id)}><td class="n">{e.week}</td><td>{rubricFor(e)?.title || e.taskLabel}</td><td class="mono">#{e.tooth}</td><td class="n">{e.self?.grade ?? '–'}</td><td class="n">{e.ai?.score ?? '–'}</td><td class="n">{e.review?.grade ?? '–'}</td><td>{e.review?.status || e.status}</td></tr>)}</tbody></table></div>}
    {tab === 'att' && <div class="list">{(att.rows || []).map((a) => <div class="item"><div class="grow">{a.type === 'lecture' ? 'Lecture' : labTitle(a, false)} · {fmtDate(a.date)} {fmtTime(a.at)}{a.reason && <div class="faint">{a.reason}</div>}</div><Pill kind={{ confirmed: 'good', recorded: 'warn', rejected: 'bad' }[a.status]}>{a.status}</Pill></div>)}</div>}
    {tab === 'msg' && <Thread studentUid={s.uid} section={s.section} />}
    {rev && <ReviewSheet id={rev} onClose={() => setRev(null)} />}
  </Sheet>;
}
