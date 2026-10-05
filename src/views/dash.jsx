import { useEffect, useState } from 'preact/hooks';
import { me, store, today, isDemo } from '../lib/logic.js';
import { computeStats, computeCompliance, COMPLIANCE_PARTS } from '../lib/stats.js';
import { L, useDoc, Kpi, Pill, Bar, Empty, MiniChart, fmtDT, fmtDate, toast, Band } from '../lib/ui.jsx';
import { exportXlsx } from '../lib/export.js';
import { PRACTICAL_WEEKS, COURSE } from '../data/course.js';
import { RUBRICS, rubricById } from '../data/rubrics.js';
import { useProjects, lab2Time } from './projects.jsx';
import { SurveyResults } from './survey.jsx';

// Loads statistics: live mode reads the nightly aggregate (one document); demo mode computes on the fly.
function useStats() {
  const [st, setSt] = useState(null);
  const [err, setErr] = useState(null);
  const [local, setLocal] = useState(false);
  const agg = useDoc('reports', 'latest');
  const load = async () => {
    const S = store();
    const [students, sessions, attendance, entries, cfg] = await Promise.all([S.query('users', [['role', '==', 'student']]), S.query('sessions', []), S.query('attendance', []), S.query('entries', []), S.get('config', 'course')]);
    const paperwork = await S.query('paperwork', []).catch(() => []);
    setSt(computeStats({ students, sessions, attendance, entries, paperwork, weeks: PRACTICAL_WEEKS, config: cfg || {}, today: today() }));
    setLocal(true);
  };
  useEffect(() => { if (isDemo()) load().catch((e) => setErr(e.message)); }, []);
  // Live: use the nightly aggregate; if there is none yet, compute it on this device.
  useEffect(() => { if (!isDemo() && agg === null && !local) load().catch((e) => setErr(e.message)); }, [agg]);
  if (!isDemo()) {
    const use = local && st ? st : agg ? agg.stats : agg === null ? (st || null) : undefined;
    return { st: use, err, refresh: async () => {
      try { await store().call('refreshStats', {}); setLocal(false); toast('Dashboard refreshed'); }
      catch (e) { try { await load(); toast('Dashboard refreshed on this device'); } catch (x) { toast('Refresh failed: ' + x.message); } }
    } };
  }
  return { st, refresh: () => load().then(() => toast('Dashboard refreshed')), err };
}

const kindPct = (v, good = 85, warn = 75) => (v == null ? '' : v >= good ? 'good' : v >= warn ? 'warn' : 'bad');


// Staff platform-compliance KPI (Course Director, HoD, Vice Dean).
const KPI_COL = { signed: '#2a78d6', attendance: '#eb6834', grading: '#1baf7a', defects: '#eda100', timely: '#e87ba4' };
function ComplianceKpi() {
  const [k, setK] = useState(null);
  useEffect(() => { (async () => {
    try {
      const [staff, entries, attendance] = await Promise.all([store().query('roster', [['role', 'in', ['demonstrator', 'lecturer']]]), store().query('entries', []), store().query('attendance', [['type', '==', 'lab']])]);
      setK(computeCompliance({ staff: staff.map((x) => ({ ...x, email: x.email || x.id })), entries, attendance }));
    } catch (x) { setK({ error: x.message }); }
  })(); }, []);
  return <section class="card"><div class="row between"><h2>Staff platform compliance (KPI)</h2>{k && !k.error && <span class="kpi" style={{ padding: '4px 12px' }}><span class="v mono">{k.mean}</span>/100</span>}</div>
    <p class="faint">Signed in 15 · confirms lab attendance 25 · grades teeth on the platform 30 · marks defects when grade &lt; 10 20 · grades during the section 10. Measures platform use, not teaching quality.</p>
    {!k ? <p class="faint">Loading…</p> : k.error ? <p class="faint">Could not load: {k.error}</p> : <>
      <p>{k.active} of {k.rows.length} staff actively using the platform (score ≥ 40) · {k.notSignedIn} not signed in yet.</p>
      <div class="row" style={{ gap: 12, flexWrap: 'wrap', fontSize: '.85rem' }}>{COMPLIANCE_PARTS.map(([key, label]) => <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: KPI_COL[key], marginInlineEnd: 4 }} />{label}</span>)}</div>
      <div class="list" style={{ marginTop: 8 }}>{k.rows.map((r) => <div class="item" style={{ alignItems: 'center' }}>
        <div style={{ width: 200, flexShrink: 0 }}><b>{r.name}</b>{r.role === 'lecturer' && <span class="faint"> (Sup.)</span>}<div class="faint" style={{ fontSize: '.8rem' }}>{r.confirmed} check-ins · {r.graded} teeth</div></div>
        <div class="grow" style={{ display: 'flex', height: 14, background: 'var(--line, #eee)', borderRadius: 4, overflow: 'hidden' }}>{COMPLIANCE_PARTS.map(([key]) => r.parts[key] > 0 && <div title={`${key}: ${r.parts[key]}`} style={{ width: r.parts[key] + '%', background: KPI_COL[key], borderInlineEnd: '2px solid var(--surface, #fff)' }} />)}</div>
        <b class="mono" style={{ width: 36, textAlign: 'end' }}>{r.score}</b></div>)}</div></>}
  </section>;
}

export function Dashboard({ go } = {}) {
  const u = me();
  const { st, refresh } = useStats();
  const [secSort, setSecSort] = useState('section');
  if (st === undefined || (isDemo() && !st)) return <p>Loading dashboard…</p>;
  if (!st) return <><section class="hero"><h1>Dashboard</h1></section><Empty>No aggregate yet. It is produced every evening at 19:00. {['director', 'hod', 'admin'].includes(u.role) && <button class="btn sm" onClick={refresh}>Build it now</button>}</Empty></>;
  const T = st.totals;
  const lead = { director: 'Course Director', admin: 'Course Director', hod: 'Head of Department', vicedean: 'Vice Dean for Student Affairs', dean: 'Dean of the Faculty' }[u.role];
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
    {['director', 'admin', 'hod'].includes(u.role) && <SurveyResults />}
    {['director', 'admin', 'hod', 'vicedean'].includes(u.role) && !isDemo() && <ComplianceKpi />}
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
    <ProjectsCard go={go} />
    {full && <div class="grid2">
      <section class="card"><h2>Demonstrator workload</h2><div class="tablewrap"><table><thead><tr><th>Demonstrator</th><th>Sections</th><th class="n">Reviews</th><th class="n">Median turnaround</th></tr></thead><tbody>{st.demonstrators.map((d) => <tr><td>{d.name}</td><td class="mono">{d.sections}</td><td class="n">{d.reviews}</td><td class="n">{d.medianHours != null ? d.medianHours + ' h' : '–'}</td></tr>)}</tbody></table></div><p class="faint">A workload measure, not a measure of teaching quality.</p></section>
      <section class="card"><h2>Grading agreement</h2>
        <div class="kpis"><Kpi label="Self-grade within ±1 of official" value={T.selfWithin1 != null ? T.selfWithin1 + '%' : '–'} kind="info" sub="Student calibration" /><Kpi label="Prep Lens within ±1 of official" value={T.aiWithin1 != null ? T.aiWithin1 + '%' : '–'} kind="info" sub={`${T.aiCompared} teeth compared (research)`} /></div>
        <p class="faint">Research indicator only. Prep Lens never assigns grades; the pilot showed limited agreement (Gemini within ±1 in 52 % of 23 photos).</p></section>
    </div>}
    {full && <CriterionVariation dist={st.critDist} />}
    <PrepLensValidation />
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
  const leaderOnly = ['vicedean', 'dean'].includes(u.role);
  const range = `${from} to ${to}`;
  const inRange = (d) => d >= from && d <= to;
  const secF = (x) => sec === 'all' || x.section === Number(sec);
  const filt = `Section: ${sec === 'all' ? 'all' : sec}`;
  const run = async (key, fn) => { setBusy(key); try { const name = await fn(); toast(name ? `Downloaded ${name}` : 'Done'); } catch (e) { toast('Export failed: ' + e.message); } setBusy(''); };
  const reports = [
    ['lecture', '1. Lecture attendance by session and student', async () => { const a = (await S.query('attendance', [['type', '==', 'lecture']])).filter((x) => inRange(x.date) && secF(x)); return exportXlsx({ title: 'Lecture attendance by session and student', range, filters: filt, columns: [{ label: 'Date', key: 'date' }, { label: 'Session', key: 'sid' }, { label: 'Student number', key: 'code' }, { label: 'Name', key: 'name', w: 30 }, { label: 'Section', key: 'section' }, { label: 'Status', key: 'status' }, { label: 'Check-in', get: (r) => fmtDT(r.at) }, { label: 'Decided by', key: 'byName' }, { label: 'Reason', key: 'reason' }], rows: a.sort((x, y) => (x.date + x.code).localeCompare(y.date + y.code)), definitions: { status: 'recorded = submitted, awaiting staff; confirmed = counted; rejected = not counted. Students without a row have no check-in.' } }); }],
    ['lab', '2. Lab attendance by session and section', async () => { const a = (await S.query('attendance', [['type', '==', 'lab']])).filter((x) => inRange(x.date) && secF(x)); return exportXlsx({ title: 'Lab attendance by session and section', range, filters: filt, columns: [{ label: 'Date', key: 'date' }, { label: 'Week', key: 'week' }, { label: 'Section', key: 'section' }, { label: 'Student number', key: 'code' }, { label: 'Name', key: 'name', w: 30 }, { label: 'Status', key: 'status' }, { label: 'Method', key: 'method' }, { label: 'Confirmed by', key: 'byName' }], rows: a.sort((x, y) => (x.date + x.section + x.code).localeCompare(y.date + y.section + y.code)) }); }],
    ['logbook', '3. Student longitudinal logbook', async () => { const e = (await S.query('entries', [])).filter((x) => !x.practice && x.status !== 'draft' && inRange(x.date) && secF(x)); return exportXlsx({ title: 'Student longitudinal logbook', range, filters: filt, columns: [{ label: 'Student number', key: 'code' }, { label: 'Name', key: 'name', w: 30 }, { label: 'Section', key: 'section' }, { label: 'Week', key: 'week' }, { label: 'Date', key: 'date' }, { label: 'Exercise', get: (r) => rubricById[r.rubricId]?.title || r.taskLabel, w: 34 }, { label: 'Tooth', key: 'tooth' }, { label: 'Self grade', get: (r) => r.self?.grade }, { label: 'Official grade', get: (r) => r.review?.grade }, { label: 'Status', get: (r) => r.review?.status || r.status }, { label: 'Demonstrator', get: (r) => r.review?.byName }, { label: 'Feedback', get: (r) => r.review?.feedback, w: 40 }], rows: e.sort((x, y) => (x.code + x.week).localeCompare(y.code + y.week)) }); }],
    ['completion', '4. Practical task completion and missing work', async () => { const [st, e, pw] = await Promise.all([S.query('users', [['role', '==', 'student']]), S.query('entries', []), S.query('paperwork', []).catch(() => [])]); const due = PRACTICAL_WEEKS.filter((w) => w.to < to && w.to >= from).reduce((a, w) => a + w.req, 0); const rows = st.filter(secF).map((s) => { const mine = e.filter((x) => x.uid === s.uid && !x.practice && inRange(x.date)); const done = mine.filter((x) => x.review?.status === 'Completed').length + pw.filter((p) => p.uid === s.uid && PRACTICAL_WEEKS.some((w) => w.w === p.week && w.to < to && w.to >= from)).reduce((a, p) => a + (Number(p.teeth) || 0), 0); return { ...s, done, due, missing: Math.max(0, due - done), waiting: mine.filter((x) => x.status === 'submitted').length, redo: mine.filter((x) => x.status === 'redo').length }; }); return exportXlsx({ title: 'Practical task completion and missing work', range, filters: filt, columns: [{ label: 'Student number', key: 'code' }, { label: 'Name', key: 'name', w: 30 }, { label: 'Section', key: 'section' }, { label: 'Completed', key: 'done' }, { label: 'Due', key: 'due' }, { label: 'Missing', key: 'missing' }, { label: 'Awaiting review', key: 'waiting' }, { label: 'To correct', key: 'redo' }], rows }); }],
    ['rubric', '5. Rubric results and grade distribution', async () => { const e = (await S.query('entries', [])).filter((x) => x.review && inRange(x.date) && secF(x)); const rows = []; for (const x of e) for (const [cid, band] of Object.entries(x.review.picks || {})) rows.push({ code: x.code, section: x.section, week: x.week, rubric: rubricById[x.rubricId]?.title, criterion: rubricById[x.rubricId]?.criteria.find((c) => c.id === cid)?.name, self: x.self?.picks?.[cid] || '', ai: x.ai?.criteria?.[cid]?.band || (x.ai ? 'n/a' : ''), official: band, grade: x.review.grade }); return exportXlsx({ title: 'Rubric results and grade distribution', range, filters: filt, columns: [{ label: 'Student number', key: 'code' }, { label: 'Section', key: 'section' }, { label: 'Week', key: 'week' }, { label: 'Rubric', key: 'rubric', w: 34 }, { label: 'Criterion', key: 'criterion', w: 28 }, { label: 'Self band', key: 'self' }, { label: 'Prep Lens band', key: 'ai' }, { label: 'Official band', key: 'official' }, { label: 'Official grade', key: 'grade' }], rows, definitions: { self: 'A 9–10 · B 7.5–8.5 · C 6–7 · D below 6', ai: 'n/a = not assessable from photo' } }); }],
    ['workload', '6. Demonstrator workload and turnaround', async () => { const e = (await S.query('entries', [])).filter((x) => x.review && inRange(x.date) && secF(x)); const m = {}; for (const x of e) { const k = x.review.byName; m[k] = m[k] || { name: k, reviews: 0, hours: [], redo: 0 }; m[k].reviews++; if (x.status === 'redo') m[k].redo++; const sub = x.submittedAt || x.self?.at || x.createdAt; if (sub) m[k].hours.push((x.review.at - sub) / 3600e3); } const rows = Object.values(m).map((d) => { const hs = d.hours.sort((a, b) => a - b); return { ...d, median: hs.length ? Math.round(hs[Math.floor(hs.length / 2)] * 10) / 10 : '' }; }); return exportXlsx({ title: 'Demonstrator assessment workload and turnaround time', range, filters: filt, columns: [{ label: 'Demonstrator', key: 'name', w: 28 }, { label: 'Reviews', key: 'reviews' }, { label: 'Asked to correct', key: 'redo' }, { label: 'Median turnaround (h)', key: 'median' }], rows }); }],
    ['risk', '7. Students requiring follow-up', async () => { const [students, sessions, attendance, entries, cfg] = await Promise.all([S.query('users', [['role', '==', 'student']]), S.query('sessions', []), S.query('attendance', []), S.query('entries', []), S.get('config', 'course')]); const paperwork = await S.query('paperwork', []).catch(() => []); const st = computeStats({ students, sessions, attendance, entries, paperwork, weeks: PRACTICAL_WEEKS, config: cfg || {}, today: to }); return exportXlsx({ title: 'Students requiring follow-up', range, filters: filt, columns: [{ label: 'Student number', key: 'code' }, { label: 'Name', key: 'name', w: 30 }, { label: 'Section', key: 'section' }, { label: 'Lecture att. %', key: 'lecAtt' }, { label: 'Lab att. %', key: 'labAtt' }, { label: 'Done', key: 'done' }, { label: 'Due', key: 'due' }, { label: 'Mean grade', key: 'meanGrade' }, { label: 'Reasons', get: (r) => r.reasons.join('; '), w: 50 }], rows: st.atRisk.filter(secF) }); }],
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

// ---------------- Prep Lens validation (research) ----------------
// Agreement between Prep Lens, student self-assessment and the demonstrator's official grade, computed on demand.
const BANDV = { A: 3, B: 2, C: 1, D: 0 };
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
function agree(pairs) { // [[x (rater), y (demonstrator)]]
  const n = pairs.length; if (n < 2) return { n };
  const d = pairs.map(([x, y]) => x - y); const bias = avg(d);
  const sd = Math.sqrt(d.reduce((a, v) => a + (v - bias) ** 2, 0) / (n - 1));
  const mx = avg(pairs.map((p) => p[0])), my = avg(pairs.map((p) => p[1]));
  const vx = avg(pairs.map((p) => (p[0] - mx) ** 2)), vy = avg(pairs.map((p) => (p[1] - my) ** 2)), cov = avg(pairs.map((p) => (p[0] - mx) * (p[1] - my)));
  const r = vx && vy ? cov / Math.sqrt(vx * vy) : null;
  const ccc = (vx + vy + (mx - my) ** 2) ? (2 * cov) / (vx + vy + (mx - my) ** 2) : null;
  const f = (x, k = 2) => (x == null ? null : Math.round(x * 10 ** k) / 10 ** k);
  return { n, bias: f(bias), sd: f(sd), lo: f(bias - 1.96 * sd), hi: f(bias + 1.96 * sd), mae: f(avg(d.map(Math.abs))), r: f(r), ccc: f(ccc), within1: Math.round((d.filter((v) => Math.abs(v) <= 1).length / n) * 100) };
}
function kappaW(pairs) { // quadratic weighted kappa for 4 ordered bands
  const n = pairs.length; if (n < 2) return null;
  const O = Array.from({ length: 4 }, () => [0, 0, 0, 0]); for (const [a, b] of pairs) O[a][b]++;
  const ra = O.map((r) => r.reduce((x, y) => x + y, 0)), cb = [0, 1, 2, 3].map((j) => O.reduce((x, r) => x + r[j], 0));
  let num = 0, den = 0;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const w = ((i - j) ** 2) / 9; num += w * O[i][j]; den += w * (ra[i] * cb[j]) / n; }
  return den ? Math.round((1 - num / den) * 100) / 100 : null;
}
function PrepLensValidation() {
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const S = store();
      const [entries, research] = await Promise.all([S.query('entries', []), S.query('research', []).catch(() => [])]);
      const rs = {}; for (const r of research) rs[r.entryId || r.id] = r;
      const lab = entries.filter((e) => !e.practice && e.source !== 'paper' && e.review && typeof e.review.grade === 'number');
      const aiScore = (e) => (rs[e.id]?.score ?? e.ai?.score ?? null);
      const aiPairs = lab.filter((e) => aiScore(e) != null).map((e) => [aiScore(e), e.review.grade]);
      const selfPairs = lab.filter((e) => typeof e.self?.grade === 'number' && !e.self.afterReview).map((e) => [e.self.grade, e.review.grade]);
      const crit = {}; const allBand = [];
      for (const e of lab) {
        const rub = rubricById[e.rubricId]; if (!rub || !e.review.picks) continue;
        for (const c of rub.criteria) {
          const k = `${rub.id}|${c.id}`; const x = crit[k] = crit[k] || { rubric: rub.title, name: c.name, n: 0, assessable: 0, exact: 0, adjacent: 0 };
          const dem = e.review.picks[c.id]; if (!dem || !e.ai?.criteria) continue;
          x.n++; const a = e.ai.criteria[c.id];
          if (a?.assessable && a.band) { x.assessable++; const dv = Math.abs(BANDV[a.band] - BANDV[dem]); if (dv === 0) x.exact++; if (dv <= 1) x.adjacent++; allBand.push([BANDV[a.band], BANDV[dem]]); }
        }
      }
      const practice = entries.filter((e) => e.practice);
      const checks = entries.reduce((a, e) => a + ((e.aiHistory || []).length || (e.ai ? 1 : 0)), 0);
      const rows = lab.map((e, i) => ({ case: i + 1, section: e.section, exercise: rubricById[e.rubricId]?.title || '', week: e.week, prompt: e.ai?.promptVersion || '', ai: aiScore(e), self: e.self?.grade ?? null, demonstrator: e.review.grade, depthMm: e.ai?.depthMm ?? null, probeMm: e.probeMm ?? null, checksBeforeSubmit: (e.aiHistory || []).length }));
      setRes({ ai: agree(aiPairs), self: agree(selfPairs), kappa: kappaW(allBand), bandN: allBand.length, bandExact: allBand.length ? Math.round((allBand.filter(([a, b]) => a === b).length / allBand.length) * 100) : null,
        crit: Object.values(crit).filter((x) => x.n), practiceTeeth: practice.length, practiceStudents: new Set(practice.map((e) => e.uid)).size, checks, rows, at: Date.now() });
    } catch (e) { toast('Could not compute: ' + e.message); }
    setBusy(false);
  };
  const A = res?.ai || {}, Sf = res?.self || {};
  const line = (x) => (x.n >= 2 ? `n = ${x.n} · bias ${x.bias > 0 ? '+' : ''}${x.bias} (95 % limits ${x.lo} to ${x.hi}) · MAE ${x.mae} · r ${x.r ?? '–'} · Lin's CCC ${x.ccc ?? '–'} · within ±1: ${x.within1} %` : `n = ${x.n || 0} — not enough paired teeth yet`);
  return <section class="card"><div class="row between"><div><h2>Prep Lens validation study</h2><p class="faint">Agreement of Prep Lens and student self-assessment with the demonstrator's official grade of the physical tooth, for publication and for stakeholders. Practice teeth are excluded from agreement. Student names and numbers are never included.</p></div>
    <div class="row noprint"><button class="btn" disabled={busy} onClick={run}>{busy ? 'Calculating…' : res ? 'Recalculate' : 'Calculate'}</button>{res && <button class="btn" onClick={() => exportXlsx({ title: 'Prep Lens validation dataset (anonymised)', columns: [{ label: 'Case', key: 'case' }, { label: 'Section', key: 'section' }, { label: 'Exercise', key: 'exercise', w: 34 }, { label: 'Week', key: 'week' }, { label: 'Prompt version', key: 'prompt' }, { label: 'Prep Lens score (research, not shown to students)', key: 'ai' }, { label: 'Student self-grade', key: 'self' }, { label: 'Demonstrator official grade', key: 'demonstrator' }, { label: 'Prep Lens depth from probe photo (mm)', key: 'depthMm' }, { label: 'Student probe reading (mm)', key: 'probeMm' }, { label: 'Prep Lens checks before submission', key: 'checksBeforeSubmit' }], rows: res.rows, definitions: { ai: 'Prep Lens 0–10 estimate from photos, stored for research only.', demonstrator: 'Reference standard: demonstrator inspection of the physical tooth.' } })}>Export anonymised dataset</button>}</div></div>
    {res && <>
      <div class="kpis">
        <Kpi label="Prep Lens vs demonstrator" value={A.n >= 2 ? `${A.within1}%` : '–'} kind="info" sub={A.n >= 2 ? `within ±1 point · ${A.n} teeth` : 'needs graded teeth'} />
        <Kpi label="Self vs demonstrator" value={Sf.n >= 2 ? `${Sf.within1}%` : '–'} kind="info" sub={Sf.n >= 2 ? `within ±1 point · ${Sf.n} teeth` : 'needs graded teeth'} />
        <Kpi label="Criterion band agreement" value={res.bandExact != null ? `${res.bandExact}%` : '–'} kind="info" sub={res.kappa != null ? `exact · weighted κ ${res.kappa} · ${res.bandN} ratings` : 'no paired ratings yet'} />
        <Kpi label="Self-training use" value={res.checks} kind="good" sub={`Prep Lens checks · ${res.practiceTeeth} practice teeth by ${res.practiceStudents} students`} />
      </div>
      <p><b>Prep Lens:</b> {line(A)}</p><p><b>Self-assessment:</b> {line(Sf)}</p>
      {res.crit.length > 0 && <div class="tablewrap"><table><thead><tr><th>Exercise · criterion</th><th class="n">Paired</th><th class="n">Assessable from photo</th><th class="n">Exact band</th><th class="n">Within 1 band</th></tr></thead><tbody>{res.crit.map((c) => <tr><td>{c.rubric} · <b>{c.name}</b></td><td class="n">{c.n}</td><td class="n">{Math.round((c.assessable / c.n) * 100)}%</td><td class="n">{c.assessable ? Math.round((c.exact / c.assessable) * 100) + '%' : '–'}</td><td class="n">{c.assessable ? Math.round((c.adjacent / c.assessable) * 100) + '%' : '–'}</td></tr>)}</tbody></table></div>}
      <p class="faint">Bias = mean (rater − demonstrator); negative means the rater scores lower. Limits of agreement follow Bland–Altman. Lin's CCC measures agreement on the same scale (1 = perfect). Weighted κ uses quadratic weights over the four rubric bands. Calculated {fmtDT(res.at)}.</p>
    </>}
  </section>;
}

// Group projects (Lab 2): group, title and supervisors at a glance.
function ProjectsCard({ go }) {
  const by = useProjects();
  const gs = Array.from({ length: 18 }, (_, i) => i + 1);
  const filled = gs.filter((g) => by[g] && by[g].title).length;
  return <section class="card"><div class="row between"><h2>Group projects</h2><div class="row"><Pill kind={filled === 18 ? 'good' : 'warn'}>{filled}/18 assigned</Pill>{go && <button class="btn sm noprint" onClick={() => go('projects')}>Open</button>}</div></div>
    <div class="tablewrap"><table><thead><tr><th class="n">Group</th><th>Project</th><th>Supervisors</th><th>Lab 2</th></tr></thead>
      <tbody>{gs.map((g) => <tr><td class="n mono">{g}</td><td dir="auto">{by[g]?.title || <span class="faint">not assigned</span>}</td><td dir="auto" class="faint">{[by[g]?.lecturer, by[g]?.demonstrator].filter(Boolean).join(' · ') || '—'}</td><td class="faint">{lab2Time(g)}</td></tr>)}</tbody></table></div></section>;
}
