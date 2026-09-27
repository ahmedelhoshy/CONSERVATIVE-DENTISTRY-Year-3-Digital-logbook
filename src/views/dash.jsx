import { useEffect, useState } from 'preact/hooks';
import { me, store, today, isDemo } from '../lib/logic.js';
import { computeStats } from '../lib/stats.js';
import { L, useDoc, Kpi, Pill, Bar, Empty, MiniChart, fmtDT, fmtDate, toast, Band } from '../lib/ui.jsx';
import { exportXlsx } from '../lib/export.js';
import { PRACTICAL_WEEKS, COURSE } from '../data/course.js';
import { RUBRICS, rubricById } from '../data/rubrics.js';

// Loads statistics: live mode reads the nightly aggregate (one document); demo mode computes on the fly.
function useStats() {
  const [st, setSt] = useState(null);
  const [err, setErr] = useState(null);
  const agg = useDoc('reports', 'latest');
  const load = async () => {
    const S = store();
    const [students, sessions, attendance, entries, cfg] = await Promise.all([S.query('users', [['role', '==', 'student']]), S.query('sessions', []), S.query('attendance', []), S.query('entries', []), S.get('config', 'course')]);
    setSt(computeStats({ students, sessions, attendance, entries, weeks: PRACTICAL_WEEKS, config: cfg || {}, today: today() }));
  };
  useEffect(() => { if (isDemo()) load().catch((e) => setErr(e.message)); }, []);
  if (!isDemo()) return { st: agg ? agg.stats : agg === null ? null : undefined, refresh: async () => { try { await store().call('refreshStats', {}); toast('Dashboard refreshed'); } catch (e) { toast('Refresh failed: ' + e.message); } }, err };
  return { st, refresh: () => load().then(() => toast('Dashboard refreshed')), err };
}

const kindPct = (v, good = 85, warn = 75) => (v == null ? '' : v >= good ? 'good' : v >= warn ? 'warn' : 'bad');

export function Dashboard() {
  const u = me();
  const { st, refresh } = useStats();
  const [secSort, setSecSort] = useState('section');
  if (st === undefined || (isDemo() && !st)) return <p>Loading dashboard…</p>;
  if (!st) return <><section class="hero"><h1>Dashboard</h1></section><Empty>No aggregate yet. It is produced every evening at 19:00. {['director', 'hod', 'admin'].includes(u.role) && <button class="btn sm" onClick={refresh}>Build it now</button>}</Empty></>;
  const T = st.totals;
  const lead = { director: 'Course Director', admin: 'Course Director', hod: 'Head of Department', vicedean: 'Vice Dean for Student Affairs' }[u.role];
  const full = ['director', 'admin', 'hod'].includes(u.role);
  const secs = [...st.sections].sort((a, b) => (secSort === 'section' ? a.section - b.section : (a[secSort] ?? 999) - (b[secSort] ?? 999)));
  const issues = [
    ...st.sections.filter((s) => s.overdue > 0).map((s) => ({ what: `${s.overdue} review(s) overdue > 48 h`, where: `Section ${s.section}`, who: 'Section demonstrators', kind: 'bad' })),
    ...st.sections.filter((s) => s.labAttendance != null && s.labAttendance < 80).map((s) => ({ what: `Lab attendance ${s.labAttendance}%`, where: `Section ${s.section}`, who: 'Course Director', kind: 'warn' })),
    ...st.sections.filter((s) => s.gradeDiff != null && Math.abs(s.gradeDiff) >= 0.6).map((s) => ({ what: `Grades ${s.gradeDiff > 0 ? 'above' : 'below'} course mean by ${Math.abs(s.gradeDiff)}`, where: `Section ${s.section}`, who: 'Head of Department (calibration)', kind: 'info' })),
    ...(T.pendingAttendance ? [{ what: `${T.pendingAttendance} check-ins awaiting staff confirmation`, where: 'All sessions', who: 'Lecturers / demonstrators', kind: 'warn' }] : []),
  ];
  return <>
    <section class="row between"><div class="hero"><span class="eyebrow">{lead} dashboard · {COURSE.year}</span><h1>{L('Course overview', 'نظرة عامة على المقرر')}</h1>
      <p class="faint">Period: term start – {fmtDate(st.today, { day: 'numeric', month: 'short', year: 'numeric' })} · Last updated {fmtDT(st.generatedAt)}{isDemo() ? ' (demo, computed live)' : ' · refreshes daily 19:00'}</p></div>
      {full && <button class="btn noprint" onClick={refresh}>Refresh now</button>}</section>
    <div class="kpis">
      <Kpi label="Students enrolled" value={T.enrolled} kind="info" sub="18 sections" />
      <Kpi label="Lecture attendance" value={T.lectureAttendance != null ? T.lectureAttendance + '%' : '–'} kind={kindPct(T.lectureAttendance)} sub={`${T.lecturesHeld} lectures counted`} />
      <Kpi label="Lab attendance" value={T.labAttendance != null ? T.labAttendance + '%' : '–'} kind={kindPct(T.labAttendance)} sub={`${T.labsHeld} labs held`} />
      <Kpi label="Requirements completed" value={T.completion != null ? T.completion + '%' : '–'} kind={kindPct(T.completion, 90, 75)} sub="of requirements due so far" />
      <Kpi label="Students at risk" value={T.atRisk} kind={T.atRisk ? 'bad' : 'good'} sub="attendance, grade or work" />
      <Kpi label="Overdue reviews" value={T.overdue} kind={T.overdue ? 'warn' : 'good'} sub="waiting > 48 h" />
    </div>
    <div class="grid2">
      <section class="card"><h2>Lab attendance by week</h2><MiniChart data={st.trend.map((w) => ({ x: 'W' + w.week, y: w.labAttendance }))} xKey="x" yKey="y" /></section>
      <section class="card"><h2>Teeth submitted by week</h2><MiniChart kind="bar" unit="" max={Math.max(10, ...st.trend.map((w) => w.teeth)) } data={st.trend.map((w) => ({ x: 'W' + w.week, y: w.teeth }))} xKey="x" yKey="y" /><p class="faint">{T.teeth} teeth submitted · {T.reviewed} reviewed · mean official grade {T.meanGrade ?? '–'} · pass rate {T.passRate ?? '–'}%</p></section>
    </div>
    <section class="card"><div class="row between"><h2>Issues requiring action</h2><Pill kind={issues.length ? 'warn' : 'good'}>{issues.length} open</Pill></div>
      {issues.length ? <div class="tablewrap"><table><thead><tr><th>Issue</th><th>Where</th><th>Responsible</th><th>Status</th></tr></thead><tbody>{issues.map((i) => <tr><td>{i.what}</td><td>{i.where}</td><td>{i.who}</td><td><Pill kind={i.kind}>open</Pill></td></tr>)}</tbody></table></div> : <Empty>No open issues.</Empty>}</section>
    <section class="card"><div class="row between"><h2>Sections compared</h2><div class="seg">{[['section', 'Section'], ['labAttendance', 'Attendance'], ['completion', 'Completion'], ['meanGrade', 'Grade']].map(([k, l]) => <button class={secSort === k ? 'on' : ''} onClick={() => setSecSort(k)}>{l}</button>)}</div></div>
      <div class="tablewrap"><table><thead><tr><th>Sec.</th><th class="n">Students</th><th>Lab attendance</th><th class="n">Lecture</th><th>Completion</th>{full && <th class="n">Mean grade</th>}{full && <th class="n">vs course</th>}<th class="n">Waiting</th><th class="n">Overdue</th></tr></thead><tbody>
        {secs.map((s) => <tr><td class="mono">S{s.section}</td><td class="n">{s.students}</td><td><div class="row" style={{ gap: 6, flexWrap: 'nowrap' }}><Bar value={s.labAttendance} kind={kindPct(s.labAttendance)} /><span class="mono">{s.labAttendance ?? '–'}%</span></div></td><td class="n">{s.lectureAttendance ?? '–'}%</td><td><div class="row" style={{ gap: 6, flexWrap: 'nowrap' }}><Bar value={s.completion} kind={kindPct(s.completion, 90, 75)} /><span class="mono">{s.completion ?? '–'}%</span></div></td>{full && <td class="n">{s.meanGrade ?? '–'}</td>}{full && <td class="n" style={{ color: s.gradeDiff != null && Math.abs(s.gradeDiff) >= 0.6 ? 'var(--warn)' : '' }}>{s.gradeDiff == null ? '–' : (s.gradeDiff > 0 ? '+' : '') + s.gradeDiff}</td>}<td class="n">{s.pending}</td><td class="n" style={{ color: s.overdue ? 'var(--bad)' : '' }}>{s.overdue}</td></tr>)}
      </tbody></table></div></section>
    <section class="card"><div class="row between"><h2>Students needing attention</h2><button class="btn sm noprint" onClick={() => exportXlsx({ title: 'Students requiring follow-up', filters: `Absence limit ${25}%; grade < 6; requirements < 70 % of due`, columns: [{ label: 'Student number', key: 'code' }, { label: 'Name', key: 'name', w: 32 }, { label: 'Section', key: 'section' }, { label: 'Lecture attendance %', key: 'lecAtt' }, { label: 'Lab attendance %', key: 'labAtt' }, { label: 'Requirements done', key: 'done' }, { label: 'Requirements due', key: 'due' }, { label: 'Mean grade', key: 'meanGrade' }, { label: 'Reasons', get: (r) => r.reasons.join('; '), w: 50 }], rows: st.atRisk })}>Export (Excel)</button></div>
      {st.atRisk.length ? <div class="tablewrap"><table><thead><tr><th>Student</th><th>Sec.</th><th>Reasons</th></tr></thead><tbody>{st.atRisk.slice(0, 60).map((r) => <tr><td><b>{r.name}</b> <span class="mono faint">{r.code}</span></td><td class="mono">S{r.section}</td><td>{r.reasons.map((x) => <Pill kind="bad">{x}</Pill>)}</td></tr>)}</tbody></table></div> : <Empty>No students flagged.</Empty>}</section>
    {full && <div class="grid2">
      <section class="card"><h2>Demonstrator workload</h2><div class="tablewrap"><table><thead><tr><th>Demonstrator</th><th>Sections</th><th class="n">Reviews</th><th class="n">Median turnaround</th></tr></thead><tbody>{st.demonstrators.map((d) => <tr><td>{d.name}</td><td class="mono">{d.sections}</td><td class="n">{d.reviews}</td><td class="n">{d.medianHours != null ? d.medianHours + ' h' : '–'}</td></tr>)}</tbody></table></div><p class="faint">A workload measure, not a measure of teaching quality.</p></section>
      <section class="card"><h2>Grading agreement</h2>
        <div class="kpis"><Kpi label="Self-grade within ±1 of official" value={T.selfWithin1 != null ? T.selfWithin1 + '%' : '–'} kind="info" sub="Student calibration" /><Kpi label="Prep Lens within ±1 of official" value={T.aiWithin1 != null ? T.aiWithin1 + '%' : '–'} kind="info" sub={`${T.aiCompared} teeth compared (research)`} /></div>
        <p class="faint">Research indicator only. Prep Lens never assigns grades; the pilot showed limited agreement (Gemini within ±1 in 52 % of 23 photos).</p></section>
    </div>}
    {full && <CriterionVariation dist={st.critDist} />}
  </>;
}

function CriterionVariation({ dist }) {
  const ids = [...new Set(Object.keys(dist).map((k) => k.split('|')[0]))];
  const [rid, setRid] = useState(ids[0] || RUBRICS[0].id);
  const rub = rubricById[rid];
  if (!rub) return null;
  return <section class="card"><div class="row between"><div><h2>Grading consistency by criterion</h2><p class="faint">Share of teeth given the top band (9–10) for each criterion, per section. Large differences between sections suggest calibration is needed.</p></div>
    <select id="cv-rubric" value={rid} onChange={(e) => setRid(e.target.value)} style={{ maxWidth: 320 }}>{ids.map((i) => <option value={i}>{rubricById[i]?.title}</option>)}</select></div>
    <div class="tablewrap"><table><thead><tr><th>Criterion</th>{Array.from({ length: 18 }, (_, i) => <th class="n">S{i + 1}</th>)}</tr></thead><tbody>
      {rub.criteria.map((c) => { const d = dist[`${rid}|${c.id}`] || {}; return <tr><td>{c.name}</td>{Array.from({ length: 18 }, (_, i) => { const x = d[i + 1]; const n = x ? x.A + x.B + x.C + x.D : 0; const p = n ? Math.round((x.A / n) * 100) : null; return <td class="n" style={{ background: p == null ? '' : `color-mix(in srgb, var(--good) ${Math.round(p * 0.55)}%, transparent)` }}>{p == null ? '·' : p}</td>; })}</tr>; })}
    </tbody></table></div></section>;
}

// ---------------- Reports ----------------
export function Reports() {
  const u = me();
  const [busy, setBusy] = useState('');
  const [from, setFrom] = useState(PRACTICAL_WEEKS[0].from);
  const [to, setTo] = useState(today());
  const [sec, setSec] = useState('all');
  const S = store();
  const leaderOnly = u.role === 'vicedean';
  const range = `${from} to ${to}`;
  const inRange = (d) => d >= from && d <= to;
  const secF = (x) => sec === 'all' || x.section === Number(sec);
  const filt = `Section: ${sec === 'all' ? 'all' : sec}`;
  const run = async (key, fn) => { setBusy(key); try { const name = await fn(); toast(name ? `Downloaded ${name}` : 'Done'); } catch (e) { toast('Export failed: ' + e.message); } setBusy(''); };
  const reports = [
    ['lecture', '1. Lecture attendance by session and student', async () => { const a = (await S.query('attendance', [['type', '==', 'lecture']])).filter((x) => inRange(x.date) && secF(x)); return exportXlsx({ title: 'Lecture attendance by session and student', range, filters: filt, columns: [{ label: 'Date', key: 'date' }, { label: 'Session', key: 'sid' }, { label: 'Student number', key: 'code' }, { label: 'Name', key: 'name', w: 30 }, { label: 'Section', key: 'section' }, { label: 'Status', key: 'status' }, { label: 'Check-in', get: (r) => fmtDT(r.at) }, { label: 'Decided by', key: 'byName' }, { label: 'Reason', key: 'reason' }], rows: a.sort((x, y) => (x.date + x.code).localeCompare(y.date + y.code)), definitions: { status: 'recorded = submitted, awaiting staff; confirmed = counted; rejected = not counted. Students without a row have no check-in.' } }); }],
    ['lab', '2. Lab attendance by session and section', async () => { const a = (await S.query('attendance', [['type', '==', 'lab']])).filter((x) => inRange(x.date) && secF(x)); return exportXlsx({ title: 'Lab attendance by session and section', range, filters: filt, columns: [{ label: 'Date', key: 'date' }, { label: 'Week', key: 'week' }, { label: 'Section', key: 'section' }, { label: 'Student number', key: 'code' }, { label: 'Name', key: 'name', w: 30 }, { label: 'Status', key: 'status' }, { label: 'Method', key: 'method' }, { label: 'Confirmed by', key: 'byName' }], rows: a.sort((x, y) => (x.date + x.section + x.code).localeCompare(y.date + y.section + y.code)) }); }],
    ['logbook', '3. Student longitudinal logbook', async () => { const e = (await S.query('entries', [])).filter((x) => x.status !== 'draft' && inRange(x.date) && secF(x)); return exportXlsx({ title: 'Student longitudinal logbook', range, filters: filt, columns: [{ label: 'Student number', key: 'code' }, { label: 'Name', key: 'name', w: 30 }, { label: 'Section', key: 'section' }, { label: 'Week', key: 'week' }, { label: 'Date', key: 'date' }, { label: 'Exercise', get: (r) => rubricById[r.rubricId]?.title || r.taskLabel, w: 34 }, { label: 'Tooth', key: 'tooth' }, { label: 'Self grade', get: (r) => r.self?.grade }, { label: 'Official grade', get: (r) => r.review?.grade }, { label: 'Status', get: (r) => r.review?.status || r.status }, { label: 'Demonstrator', get: (r) => r.review?.byName }, { label: 'Feedback', get: (r) => r.review?.feedback, w: 40 }], rows: e.sort((x, y) => (x.code + x.week).localeCompare(y.code + y.week)) }); }],
    ['completion', '4. Practical task completion and missing work', async () => { const [st, e] = await Promise.all([S.query('users', [['role', '==', 'student']]), S.query('entries', [])]); const due = PRACTICAL_WEEKS.filter((w) => w.to < to && w.to >= from).reduce((a, w) => a + w.req, 0); const rows = st.filter(secF).map((s) => { const mine = e.filter((x) => x.uid === s.uid && inRange(x.date)); const done = mine.filter((x) => x.review?.status === 'Completed').length; return { ...s, done, due, missing: Math.max(0, due - done), waiting: mine.filter((x) => x.status === 'submitted').length, redo: mine.filter((x) => x.status === 'redo').length }; }); return exportXlsx({ title: 'Practical task completion and missing work', range, filters: filt, columns: [{ label: 'Student number', key: 'code' }, { label: 'Name', key: 'name', w: 30 }, { label: 'Section', key: 'section' }, { label: 'Completed', key: 'done' }, { label: 'Due', key: 'due' }, { label: 'Missing', key: 'missing' }, { label: 'Awaiting review', key: 'waiting' }, { label: 'To correct', key: 'redo' }], rows }); }],
    ['rubric', '5. Rubric results and grade distribution', async () => { const e = (await S.query('entries', [])).filter((x) => x.review && inRange(x.date) && secF(x)); const rows = []; for (const x of e) for (const [cid, band] of Object.entries(x.review.picks || {})) rows.push({ code: x.code, section: x.section, week: x.week, rubric: rubricById[x.rubricId]?.title, criterion: rubricById[x.rubricId]?.criteria.find((c) => c.id === cid)?.name, self: x.self?.picks?.[cid] || '', ai: x.ai?.criteria?.[cid]?.band || (x.ai ? 'n/a' : ''), official: band, grade: x.review.grade }); return exportXlsx({ title: 'Rubric results and grade distribution', range, filters: filt, columns: [{ label: 'Student number', key: 'code' }, { label: 'Section', key: 'section' }, { label: 'Week', key: 'week' }, { label: 'Rubric', key: 'rubric', w: 34 }, { label: 'Criterion', key: 'criterion', w: 28 }, { label: 'Self band', key: 'self' }, { label: 'Prep Lens band', key: 'ai' }, { label: 'Official band', key: 'official' }, { label: 'Official grade', key: 'grade' }], rows, definitions: { self: 'A 9–10 · B 7.5–8.5 · C 6–7 · D below 6', ai: 'n/a = not assessable from photo' } }); }],
    ['workload', '6. Demonstrator workload and turnaround', async () => { const e = (await S.query('entries', [])).filter((x) => x.review && inRange(x.date) && secF(x)); const m = {}; for (const x of e) { const k = x.review.byName; m[k] = m[k] || { name: k, reviews: 0, hours: [], redo: 0 }; m[k].reviews++; if (x.status === 'redo') m[k].redo++; const sub = x.submittedAt || x.self?.at || x.createdAt; if (sub) m[k].hours.push((x.review.at - sub) / 3600e3); } const rows = Object.values(m).map((d) => { const hs = d.hours.sort((a, b) => a - b); return { ...d, median: hs.length ? Math.round(hs[Math.floor(hs.length / 2)] * 10) / 10 : '' }; }); return exportXlsx({ title: 'Demonstrator assessment workload and turnaround time', range, filters: filt, columns: [{ label: 'Demonstrator', key: 'name', w: 28 }, { label: 'Reviews', key: 'reviews' }, { label: 'Asked to correct', key: 'redo' }, { label: 'Median turnaround (h)', key: 'median' }], rows }); }],
    ['risk', '7. Students requiring follow-up', async () => { const [students, sessions, attendance, entries, cfg] = await Promise.all([S.query('users', [['role', '==', 'student']]), S.query('sessions', []), S.query('attendance', []), S.query('entries', []), S.get('config', 'course')]); const st = computeStats({ students, sessions, attendance, entries, weeks: PRACTICAL_WEEKS, config: cfg || {}, today: to }); return exportXlsx({ title: 'Students requiring follow-up', range, filters: filt, columns: [{ label: 'Student number', key: 'code' }, { label: 'Name', key: 'name', w: 30 }, { label: 'Section', key: 'section' }, { label: 'Lecture att. %', key: 'lecAtt' }, { label: 'Lab att. %', key: 'labAtt' }, { label: 'Done', key: 'done' }, { label: 'Due', key: 'due' }, { label: 'Mean grade', key: 'meanGrade' }, { label: 'Reasons', get: (r) => r.reasons.join('; '), w: 50 }], rows: st.atRisk.filter(secF) }); }],
    ['audit', '8. Data corrections and audit history', async () => { const a = (await S.query('audit', [], { orderBy: 'at', desc: true })).filter((x) => inRange(new Date(x.at).toISOString().slice(0, 10))); return exportXlsx({ title: 'Data corrections and audit history', range, columns: [{ label: 'When', get: (r) => fmtDT(r.at) }, { label: 'By', key: 'byName' }, { label: 'Action', key: 'action' }, { label: 'Record', key: 'target', w: 30 }, { label: 'Before', key: 'before' }, { label: 'After', key: 'after' }, { label: 'Reason', key: 'reason', w: 40 }], rows: a }); }],
    ['materials', '9. Teaching materials and missing links', async () => { const m = await S.query('materials', []); return exportXlsx({ title: 'Teaching materials and missing links', columns: [{ label: 'Kind', key: 'kind' }, { label: 'Lecture', key: 'lectureNo' }, { label: 'Title', key: 'title', w: 40 }, { label: 'Link', key: 'url', w: 50 }, { label: 'Problem', get: (r) => (!r.url && r.kind !== 'skill' ? 'No link' : '') }, { label: 'Updated', get: (r) => fmtDT(r.updatedAt) }], rows: m }); }],
  ];
  const allowed = leaderOnly ? reports.filter(([k]) => ['completion', 'risk', 'lecture', 'lab'].includes(k)) : u.role === 'hod' ? reports : reports;
  return <>
    <section class="hero"><h1>Reports</h1><p class="muted">Excel exports. Each file starts with its title, period, filters, generation time and who generated it, and has a sheet of column definitions. Files contain student records: keep them within authorised staff.</p></section>
    <section class="card"><div class="grid3"><label class="fld">From<input id="rp-from" type="date" value={from} onInput={(e) => setFrom(e.target.value)} /></label><label class="fld">To<input id="rp-to" type="date" value={to} onInput={(e) => setTo(e.target.value)} /></label><label class="fld">Section<select id="rp-sec" value={sec} onChange={(e) => setSec(e.target.value)}><option value="all">All sections</option>{Array.from({ length: 18 }, (_, i) => <option value={i + 1}>Section {i + 1}</option>)}</select></label></div></section>
    <section class="card"><div class="list">{allowed.map(([k, label, fn]) => <div class="item"><div class="grow"><b>{label}</b></div><button class="btn sm" disabled={!!busy} onClick={() => run(k, fn)}>{busy === k ? 'Preparing…' : 'Excel'}</button></div>)}</div>
      <p class="faint">For a PDF, open the Dashboard and use your browser's Print → Save as PDF; navigation is hidden in print.</p></section>
  </>;
}
