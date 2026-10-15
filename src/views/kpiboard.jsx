// Student KPI board: one engagement score (0–100) per student from four pillars, shown for the whole course and by section.
// Attendance 25 · Practical work on the platform 25 · Using the platform 25 · Learning resources 25.
import { useEffect, useState } from 'preact/hooks';
import { store, today } from '../lib/logic.js';
import { Kpi, Pill, Bar, Empty } from '../lib/ui.jsx';
import { exportXlsx } from '../lib/export.js';
import { PRACTICAL_WEEKS } from '../data/course.js';

export const TRACK_FROM = '2026-10-16'; // pages visited and resources opened are recorded from this day
export const TRACK_FULL = '2026-10-23'; // after one week of tracking they count in the score; before that the score uses the other parts only
const PILLARS = [
  ['att', 'Attendance', '#2a78d6', 'Labs 12.5 (share of labs held attended) + lectures 12.5'],
  ['prac', 'Practical work', '#1baf7a', 'Teeth uploaded with photos vs due 15 · self-assessed most uploads 5 · any self-training tooth 2.5 · Prep Lens used 2.5'],
  ['use', 'Using the platform', '#eb6834', 'Signed in 5 · active days in the last 14 (6+ days = full) 12 · AI assistant used 3 · survey answered 5'],
  ['res', 'Learning resources', '#e87ba4', 'Lecture slides or question bank 7 · practical videos/guides 7 · helpful links, atlas or announcement links 4 · games (3 different = full) 7'],
];
const LEVELS = [[70, 'Highly engaged', 'good'], [40, 'Engaged', 'info'], [20, 'Limited', 'warn'], [0, 'Minimal', 'bad']];
const levelOf = (x) => LEVELS.find(([m]) => x >= m);
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const r0 = (x) => (x == null ? null : Math.round(x));

export function computeStudentKpi({ students, sessions, attendance, entries, plays, surveys, activity, usage, t }) {
  const withRec = new Set(attendance.map((a) => a.sid));
  const held = (s) => (s.status === 'open' || s.status === 'closed' || withRec.has(s.id)) && (s.date < t || (s.date === t && s.status === 'closed'));
  const labs = sessions.filter((s) => s.type === 'lab' && held(s));
  const lecs = sessions.filter((s) => s.type === 'lecture' && s.attendanceRequired !== false && held(s));
  const conf = {}; for (const a of attendance) if (a.status === 'confirmed') (conf[a.uid] = conf[a.uid] || new Set()).add(a.sid);
  const labsBySec = {}; for (const s of labs) (labsBySec[s.section] = labsBySec[s.section] || []).push(s.id);
  const due = PRACTICAL_WEEKS.filter((w) => w.to < t).reduce((a, w) => a + (w.req || 0), 0);
  const ents = {}; for (const e of entries) (ents[e.uid] = ents[e.uid] || []).push(e);
  const games = {}; for (const p of plays) (games[String(p.uid)] = games[String(p.uid)] || new Set()).add(p.game);
  const answered = new Set(surveys.filter((x) => x.role === 'student').map((x) => String(x.uid)));
  const since = new Date(Date.parse(t + 'T12:00:00Z') - 13 * 864e5).toISOString().slice(0, 10);
  const act = {};
  for (const a of activity) {
    const x = (act[String(a.uid)] = act[String(a.uid)] || { days: new Set(), recent: new Set(), opens: {} });
    x.days.add(a.day); if (a.day >= since) x.recent.add(a.day);
    for (const [k, v] of Object.entries(a.opens || {})) x.opens[k] = (x.opens[k] || 0) + Object.keys(v || {}).length;
  }
  const tracked = t >= TRACK_FULL;
  const asked = {}; for (const d of usage) for (const [uid, n] of Object.entries(d.users || {})) asked[uid] = (asked[uid] || 0) + n;

  const rows = students.map((s) => {
    const uid = String(s.uid || s.code);
    const mine = conf[uid] || new Set();
    const myLabs = labsBySec[s.section] || [];
    const labPres = myLabs.filter((id) => mine.has(id)).length, lecPres = lecs.filter((l) => mine.has(l.id)).length;
    const E = ents[uid] || [];
    const real = E.filter((e) => !e.practice && e.source !== 'paper' && (e.photos || []).length && e.status !== 'draft');
    const selfN = real.filter((e) => e.self && e.self.grade != null).length;
    const practice = E.filter((e) => e.practice && (e.photos || []).length).length;
    const lens = E.filter((e) => e.ai).length;
    const A = act[uid] || { days: new Set(), recent: new Set(), opens: {} };
    const o = A.opens, gN = (games[uid] || new Set()).size;
    const labP = myLabs.length ? labPres / myLabs.length : null, lecP = lecs.length ? lecPres / lecs.length : null;
    const att = 12.5 * (labP ?? 1) + 12.5 * (lecP ?? 1);
    const prac = 15 * (due ? Math.min(real.length / due, 1) : 1) + (real.length && selfN / real.length >= 0.5 ? 5 : 0) + (practice ? 2.5 : 0) + (lens ? 2.5 : 0);
    const use = (s.lastLogin ? 5 : 0) + (tracked ? 12 * Math.min(A.recent.size / 6, 1) : 0) + (asked[uid] ? 3 : 0) + (answered.has(uid) ? 5 : 0);
    const res = ((o.lecture || 0) + (o.qbank || 0) + (o.material || 0) ? 7 : 0) + (o.practical ? 7 : 0) + ((o.link || 0) + (o.atlas || 0) + (o.announcement || 0) ? 4 : 0) + 7 * Math.min(Math.max(gN, o.game ? 1 : 0) / 3, 1);
    const score = Math.round((100 * (att + prac + use + (tracked ? res : 0))) / (tracked ? 100 : 63));
    return { uid, code: s.code, name: s.name, section: s.section, score, level: levelOf(score)[1], kind: levelOf(score)[2],
      att: r0(att * 4), prac: r0(prac * 4), use: r0((use * 100) / (tracked ? 25 : 13)), res: r0(res * 4),
      labPct: labP == null ? null : r0(labP * 100), lecPct: lecP == null ? null : r0(lecP * 100), uploads: real.length, due, selfN, practice, lens,
      signedIn: !!s.lastLogin, activeDays: A.days.size, recentDays: A.recent.size, asked: asked[uid] || 0, survey: answered.has(uid),
      lectureOpens: (o.lecture || 0) + (o.qbank || 0) + (o.material || 0), practicalOpens: o.practical || 0, linkOpens: (o.link || 0) + (o.atlas || 0) + (o.announcement || 0), games: gN };
  });
  const part = (list) => ({ n: list.length, score: r0(avg(list.map((r) => r.score))), att: r0(avg(list.map((r) => r.att))), prac: r0(avg(list.map((r) => r.prac))), use: r0(avg(list.map((r) => r.use))), res: r0(avg(list.map((r) => r.res))), low: list.filter((r) => r.score < 40).length });
  const secs = []; for (let k = 1; k <= 18; k++) { const L = rows.filter((r) => r.section === k); if (L.length) secs.push({ section: k, ...part(L) }); }
  const pctOf = (f) => (rows.length ? Math.round((100 * rows.filter(f).length) / rows.length) : 0);
  const facts = {
    signedIn: pctOf((r) => r.signedIn), active7: pctOf((r) => r.recentDays > 0), lab: r0(avg(rows.filter((r) => r.labPct != null).map((r) => r.labPct))), lec: r0(avg(rows.filter((r) => r.lecPct != null).map((r) => r.lecPct))),
    uploaded: pctOf((r) => r.uploads > 0), selfAss: pctOf((r) => r.selfN > 0), practice: pctOf((r) => r.practice > 0), lens: pctOf((r) => r.lens > 0),
    assistant: pctOf((r) => r.asked > 0), survey: pctOf((r) => r.survey), lectures: pctOf((r) => r.lectureOpens > 0), practical: pctOf((r) => r.practicalOpens > 0), links: pctOf((r) => r.linkOpens > 0), games: pctOf((r) => r.games > 0),
  };
  const dist = LEVELS.map(([m, l, k]) => ({ label: l, kind: k, n: rows.filter((r) => r.level === l).length }));
  return { tracked, rows, secs, all: part(rows), facts, dist, labsHeld: labs.length, lecsHeld: lecs.length, due };
}

const Stack = ({ r }) => <div style={{ display: 'flex', height: 12, minWidth: 120, background: 'var(--line, #eee)', borderRadius: 4, overflow: 'hidden' }}>{PILLARS.map(([k, , c]) => <div title={`${k}: ${r[k]}%`} style={{ width: (r[k] || 0) / 4 + '%', background: c, borderInlineEnd: '1px solid var(--surface, #fff)' }} />)}</div>;

export function StudentKpiBoard() {
  const [k, setK] = useState(null);
  const [sort, setSort] = useState('section');
  const [open, setOpen] = useState(false);
  useEffect(() => { (async () => {
    try {
      const S = store();
      const [students, sessions, attendance, entries, plays, surveys, activity, usage] = await Promise.all([
        S.query('roster', [['role', '==', 'student']]), S.query('sessions', []), S.query('attendance', []), S.query('entries', []),
        S.query('plays', []).catch(() => []), S.query('surveys', []).catch(() => []), S.query('activity', []).catch(() => []), S.query('usage', []).catch(() => [])]);
      setK(computeStudentKpi({ students, sessions, attendance, entries, plays, surveys, activity, usage, t: today() }));
    } catch (x) { setK({ error: x.message }); }
  })(); }, []);
  if (!k) return <section class="card"><h2>Student KPI board</h2><p class="faint">Loading…</p></section>;
  if (k.error) return <section class="card"><h2>Student KPI board</h2><p class="faint">Could not load: {k.error}</p></section>;
  const F = k.facts, A = k.all;
  const secs = [...k.secs].sort((a, b) => (sort === 'section' ? a.section - b.section : (a[sort] ?? 0) - (b[sort] ?? 0)));
  const low = [...k.rows].sort((a, b) => a.score - b.score).slice(0, 25);
  const exp = () => exportXlsx({ title: 'Student KPI board', filters: `All sections · ${k.labsHeld} labs and ${k.lecsHeld} lectures counted · resources tracked from ${TRACK_FROM}`,
    columns: [{ label: 'Student number', key: 'code' }, { label: 'Name', key: 'name', w: 32 }, { label: 'Section', key: 'section' }, { label: 'Score /100', key: 'score' }, { label: 'Level', key: 'level', w: 15 },
      { label: 'Attendance %', key: 'att' }, { label: 'Practical %', key: 'prac' }, { label: 'Platform use %', key: 'use' }, { label: 'Resources %', key: 'res' },
      { label: 'Lab attendance %', key: 'labPct' }, { label: 'Lecture attendance %', key: 'lecPct' }, { label: 'Teeth uploaded', key: 'uploads' }, { label: 'Due', key: 'due' }, { label: 'Self-assessed', key: 'selfN' }, { label: 'Self-training teeth', key: 'practice' }, { label: 'Prep Lens checks', key: 'lens' },
      { label: 'Signed in', get: (r) => (r.signedIn ? 'yes' : 'no') }, { label: 'Active days (14 d)', key: 'recentDays' }, { label: 'AI assistant questions', key: 'asked' }, { label: 'Survey', get: (r) => (r.survey ? 'yes' : 'no') },
      { label: 'Lecture material opened', key: 'lectureOpens' }, { label: 'Practical material opened', key: 'practicalOpens' }, { label: 'Links / atlas opened', key: 'linkOpens' }, { label: 'Different games', key: 'games' }],
    rows: [...k.rows].sort((a, b) => a.section - b.section || String(a.code).localeCompare(String(b.code))),
    definitions: Object.fromEntries(PILLARS.map(([key, l, , d]) => [key, `${l} (25 points, shown as %): ${d}`])) });
  return <section class="card"><div class="row between"><h2>Student KPI board</h2><span class="kpi" style={{ padding: '4px 12px' }}><span class="v mono">{A.score}</span>/100</span></div>
    <p class="faint">One engagement score per student from four pillars of 25 points each: attendance, practical work on the platform, using the platform, and learning resources. It describes participation, not a grade. Pages visited and resources opened are recorded from 16 Oct. {k.tracked ? 'They are now part of the score.' : 'Until 23 Oct the score uses attendance, practical work and the parts of platform use already recorded (sign-in, AI assistant, survey); learning resources are shown but not yet scored.'}</p>
    <div class="kpis">{PILLARS.map(([key, label, c]) => <Kpi label={label} value={key === 'res' && !k.tracked ? 'from 23 Oct' : A[key] + '%'} kind={key === 'res' && !k.tracked ? 'info' : A[key] >= 70 ? 'good' : A[key] >= 40 ? 'info' : 'warn'} sub={<span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: c, marginInlineEnd: 4 }} />course average</span>} />)}</div>
    <div class="row" style={{ gap: 8, flexWrap: 'wrap', margin: '6px 0 10px' }}>{k.dist.map((d) => <Pill kind={d.kind}>{d.label}: {d.n}</Pill>)}</div>
    <div class="tablewrap"><table><thead><tr><th>Indicator</th><th class="n">Students</th><th>Indicator</th><th class="n">Students</th></tr></thead><tbody>
      {[[['Lab attendance (average)', F.lab], ['Lecture attendance (average)', F.lec]], [['Signed in at least once', F.signedIn], ['Active in the last 14 days', F.active7]], [['Uploaded a requirement tooth', F.uploaded], ['Self-assessed a tooth', F.selfAss]], [['Self-training tooth (home/lab)', F.practice], ['Used Prep Lens', F.lens]], [['Opened lecture slides / question bank', F.lectures], ['Opened practical videos / guides', F.practical]], [['Opened helpful links / atlas', F.links], ['Played a game', F.games]], [['Used the AI assistant', F.assistant], ['Answered the survey', F.survey]]].map(([a, b]) =>
        <tr><td>{a[0]}</td><td class="n"><div class="row" style={{ gap: 6, flexWrap: 'nowrap', justifyContent: 'flex-end' }}><Bar value={a[1]} /><span class="mono">{a[1] ?? '–'}%</span></div></td><td>{b[0]}</td><td class="n"><div class="row" style={{ gap: 6, flexWrap: 'nowrap', justifyContent: 'flex-end' }}><Bar value={b[1]} /><span class="mono">{b[1] ?? '–'}%</span></div></td></tr>)}
    </tbody></table></div>
    <div class="row between" style={{ marginTop: 12 }}><h3>By section</h3><div class="row" style={{ gap: 6 }}><div class="seg">{[['section', 'Section'], ['score', 'Score'], ['att', 'Attend.'], ['prac', 'Practical'], ['use', 'Platform'], ['res', 'Resources']].map(([key, l]) => <button class={sort === key ? 'on' : ''} onClick={() => setSort(key)}>{l}</button>)}</div><button class="btn sm noprint" onClick={exp}>Export (Excel)</button></div></div>
    <div class="row" style={{ gap: 12, flexWrap: 'wrap', fontSize: '.85rem', margin: '4px 0' }}>{PILLARS.map(([key, label, c]) => <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: c, marginInlineEnd: 4 }} />{label}</span>)}</div>
    <div class="tablewrap"><table><thead><tr><th>Sec.</th><th class="n">Students</th><th>Pillars</th><th class="n">Score</th><th class="n">Attend.</th><th class="n">Practical</th><th class="n">Platform</th><th class="n">Resources</th><th class="n">Below 40</th></tr></thead><tbody>
      {secs.map((s) => <tr><td class="mono">S{s.section}</td><td class="n">{s.n}</td><td><Stack r={s} /></td><td class="n"><b>{s.score}</b></td><td class="n">{s.att}%</td><td class="n">{s.prac}%</td><td class="n">{s.use}%</td><td class="n">{s.res}%</td><td class="n" style={{ color: s.low ? 'var(--warn)' : '' }}>{s.low}</td></tr>)}
    </tbody></table></div>
    <details style={{ marginTop: 10 }} open={open} onToggle={(e) => setOpen(e.currentTarget.open)}><summary>Lowest 25 students (for follow-up)</summary>
      {open && (low.length ? <div class="tablewrap"><table><thead><tr><th>Student</th><th>Sec.</th><th class="n">Score</th><th>Pillars</th><th>Level</th></tr></thead><tbody>{low.map((r) => <tr><td><b dir="auto">{r.name}</b> <span class="mono faint">{r.code}</span></td><td class="mono">S{r.section}</td><td class="n">{r.score}</td><td><Stack r={r} /></td><td><Pill kind={r.kind}>{r.level}</Pill></td></tr>)}</tbody></table></div> : <Empty>No students.</Empty>)}</details>
    <details style={{ marginTop: 6 }}><summary>How the score is calculated</summary><ul class="faint" style={{ margin: '6px 0 0', paddingInlineStart: 18 }}>{PILLARS.map(([, l, , d]) => <li><b>{l} (25):</b> {d}</li>)}<li>Items that do not apply yet (no labs or lectures held, no requirement due) count as full. Levels: Highly engaged 70+, Engaged 40–69, Limited 20–39, Minimal below 20.</li></ul></details>
  </section>;
}
