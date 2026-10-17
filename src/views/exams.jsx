// Practical exams across the year (dates set by the Head of Department, roughly every 2–3 weeks).
// exams/{examId}: { no, title, week, max, released }
// examMarks/{examId}_{uid}: one mark per student per exam: { examId, examNo, uid, code, name, section, present, grade, max, released }
// Marks come from the supervisors' paper mark sheets (Import mark sheet) and are visible to students only after release.
import { useState } from 'preact/hooks';
import * as XLSX from 'xlsx';
import { me, store, today, audit, canEditCourse, canSeeExams } from '../lib/logic.js';
import { L, useQuery, Sheet, Pill, Empty, Confirm, Kpi, toast, fmtDate } from '../lib/ui.jsx';
import { exportXlsx, readAllSheets } from '../lib/export.js';
import { PRACTICAL_WEEKS } from '../data/course.js';
import { labDatesForWeek } from '../lib/demo-seed.js';

const SECTIONS = Array.from({ length: 18 }, (_, i) => i + 1);
const markId = (examId, uid) => `${examId}_${uid}`;
const normName = (s) => String(s || '').replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, '').toLowerCase();
const r1 = (x) => Math.round(x * 10) / 10;
const passMark = (max) => max * 0.6; // course pass mark is 60 %

function examDate(exam, section) {
  const w = PRACTICAL_WEEKS.find((x) => x.w === Number(exam.week));
  const d = w ? labDatesForWeek(w, section)[0] : null;
  return d ? `${fmtDate(d.date, { weekday: 'short', day: 'numeric', month: 'short' })} · ${d.start}–${d.end}` : '';
}

// ---------- Course Director / leadership ----------
export function Exams() {
  const u = me();
  if (!canSeeExams(u)) return <Empty>Exam marks are confidential.</Empty>;
  return <ExamsInner />;
}

function ExamsInner() {
  const u = me();
  const edit = canEditCourse(u) && canSeeExams(u);
  const exams = useQuery('exams', [], { orderBy: 'no' });
  const list = (exams.rows || []).slice().sort((a, b) => a.no - b.no);
  const [sel, setSel] = useState(null);
  const exam = list.find((e) => e.id === sel) || list[list.length - 1] || null;
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [release, setRelease] = useState(false);
  const [sec, setSec] = useState('all');
  const marks = useQuery('examMarks', exam ? [['examId', '==', exam.id]] : null, {}, [exam && exam.id]);
  const studs = useQuery('users', [['role', '==', 'student']]);
  const students = (studs.rows || []).filter((s) => s.section);
  const byUid = {}; for (const m of marks.rows || []) byUid[m.uid] = m;

  const summary = SECTIONS.map((s) => {
    const st = students.filter((x) => x.section === s);
    const ms = st.map((x) => byUid[x.uid]).filter(Boolean);
    const graded = ms.filter((m) => m.present && typeof m.grade === 'number');
    const mean = graded.length ? r1(graded.reduce((a, m) => a + m.grade, 0) / graded.length) : null;
    return { section: s, students: st.length, entered: ms.length, present: ms.filter((m) => m.present).length, absent: ms.filter((m) => !m.present).length, graded: graded.length, mean, pass: graded.length ? Math.round((graded.filter((m) => m.grade >= passMark(exam?.max || 5)).length / graded.length) * 100) : null };
  });
  const tot = summary.reduce((a, s) => ({ students: a.students + s.students, entered: a.entered + s.entered, present: a.present + s.present, absent: a.absent + s.absent, graded: a.graded + s.graded }), { students: 0, entered: 0, present: 0, absent: 0, graded: 0 });
  const allGraded = (marks.rows || []).filter((m) => m.present && typeof m.grade === 'number');
  const totMean = allGraded.length ? r1(allGraded.reduce((a, m) => a + m.grade, 0) / allGraded.length) : null;
  const rows = students.filter((s) => sec === 'all' || s.section === Number(sec)).sort((a, b) => a.section - b.section || String(a.code).localeCompare(String(b.code)))
    .map((s) => { const m = byUid[s.uid]; return { code: s.code, name: s.name, section: s.section, att: m ? (m.present ? 'Present' : 'Absent') : 'Not entered', grade: m && m.present && typeof m.grade === 'number' ? m.grade : '' }; });

  const doExport = () => exportXlsx({ title: `${exam.title} — marks`, filters: sec === 'all' ? 'All sections' : `Section ${sec}`, columns: [{ label: 'Student number', key: 'code' }, { label: 'Name', key: 'name', w: 34 }, { label: 'Section', key: 'section' }, { label: 'Attendance', key: 'att' }, { label: `Grade (out of ${exam.max})`, key: 'grade' }], rows, definitions: { grade: `Exam mark out of ${exam.max}; blank = absent or not entered` } });

  return <>
    <section class="hero"><h1>Exams</h1><p class="muted">Practical exams through the year. Supervisors fill the mark sheet in the exam lab; the Course Director imports it here. Marks are confidential: only the Course Director, the Head of Department, the Vice Dean and Dr. Yomna Sayed can see them, and students do not see marks on the platform.</p></section>
    <div class="row">
      {list.length > 0 && <label class="fld" style={{ maxWidth: 360 }}>Exam<select id="ex-sel" value={exam?.id} onChange={(e) => setSel(e.target.value)}>{list.map((e) => <option value={e.id}>{e.title}</option>)}</select></label>}
      {edit && <button class="btn" style={{ alignSelf: 'flex-end' }} onClick={() => setAdding(true)}>+ New exam</button>}
      {edit && exam && <button class="btn" style={{ alignSelf: 'flex-end' }} onClick={() => blankSheet(exam, students)}>Download blank mark sheet</button>}
      {edit && exam && <button class="btn primary" style={{ alignSelf: 'flex-end' }} onClick={() => setImporting(true)}>Import mark sheet</button>}
    </div>
    {!exams.rows ? <p class="faint">Loading…</p> : !exam ? <Empty>No exams yet.{edit ? ' Tap “+ New exam” to add the first practical exam.' : ''}</Empty> : <>
      <p class="faint">Week {exam.week} · out of {exam.max} · pass mark {passMark(exam.max)} (60 %) · <Pill kind="info">Confidential: visible only to the Course Director, Head of Department, Vice Dean and Dr. Yomna Sayed</Pill>
</p>
      <div class="kpis">
        <Kpi label="Marks entered" value={`${tot.entered}/${tot.students}`} kind={tot.entered >= tot.students && tot.students ? 'good' : 'warn'} sub="Students with attendance or a mark" />
        <Kpi label="Present · absent" value={`${tot.present} · ${tot.absent}`} kind="info" />
        <Kpi label="Mean mark" value={totMean == null ? '–' : `${totMean} / ${exam.max}`} kind={totMean == null ? '' : totMean >= passMark(exam.max) ? 'good' : 'bad'} sub={`Pass mark ${passMark(exam.max)} (60 %)`} />
      </div>
      <div class="tablewrap"><table><thead><tr><th>Section</th><th>Exam lab</th><th class="n">Students</th><th class="n">Entered</th><th class="n">Absent</th><th class="n">Mean</th><th class="n">Passed</th></tr></thead><tbody>
        {summary.map((s) => <tr class="click" onClick={() => setSec(String(s.section))}><td>Section {s.section}</td><td class="faint">{examDate(exam, s.section)}</td><td class="n">{s.students}</td><td class="n">{s.entered ? s.entered : <Pill kind="warn">not yet</Pill>}</td><td class="n">{s.entered ? s.absent : '–'}</td><td class="n">{s.mean ?? '–'}</td><td class="n">{s.pass == null ? '–' : `${s.pass} %`}</td></tr>)}
      </tbody></table></div>
      <div class="row"><label class="fld" style={{ maxWidth: 220 }}>Students<select id="ex-sec" value={sec} onChange={(e) => setSec(e.target.value)}><option value="all">All sections</option>{SECTIONS.map((s) => <option value={s}>Section {s}</option>)}</select></label>
        <button class="btn" style={{ alignSelf: 'flex-end' }} onClick={doExport}>Export (Excel)</button></div>
      <div class="tablewrap"><table><thead><tr><th>Number</th><th>Name</th><th class="n">Sec.</th><th>Attendance</th><th class="n">Mark</th></tr></thead><tbody>
        {rows.map((r) => <tr><td class="mono">{r.code}</td><td dir="auto">{r.name}</td><td class="n">{r.section}</td><td>{r.att === 'Not entered' ? <span class="faint">—</span> : <Pill kind={r.att === 'Present' ? 'good' : 'bad'}>{r.att}</Pill>}</td><td class="n">{r.grade === '' ? '–' : <b style={r.grade < passMark(exam.max) ? { color: 'var(--bad)' } : null}>{r.grade}</b>}</td></tr>)}
      </tbody></table></div>
    </>}
    {adding && <NewExam next={(list[list.length - 1]?.no || 0) + 1} onClose={() => setAdding(false)} onCreated={(id) => { setAdding(false); setSel(id); }} />}
    {importing && exam && <ImportMarks exam={exam} students={students} onClose={() => setImporting(false)} />}
    {release && <Confirm text={exam.released ? `Hide ${exam.title} marks from students?` : `Release ${exam.title} marks? Every student will see their own mark and attendance for this exam.`} yes={exam.released ? 'Hide' : 'Release'} onNo={() => setRelease(false)} onYes={async () => { await setReleased(exam, !exam.released); setRelease(false); }} />}
  </>;
}

async function setReleased(exam, released) {
  const S = store();
  await S.update('exams', exam.id, { released, releasedAt: released ? Date.now() : null });
  const ms = await S.query('examMarks', [['examId', '==', exam.id]]);
  for (const m of ms) if (m.released !== released) await S.update('examMarks', m.id, { released });
  await audit(released ? 'exam.release' : 'exam.hide', exam.id, null, `${ms.length} marks`, '');
  toast(released ? `Released to students (${ms.length} marks)` : 'Hidden from students');
}

function NewExam({ next, onClose, onCreated }) {
  const examWeeks = PRACTICAL_WEEKS.filter((w) => w.exam);
  const t = today();
  const firstUpcoming = examWeeks.find((w) => w.to >= t) || examWeeks[0];
  const [f, setF] = useState({ no: next, title: next === 1 ? 'First practical exam' : `Practical exam ${next}`, week: firstUpcoming?.w || 5, max: 5, task: next === 1 ? 'Class I cavity preparation for composite restoration on lower first molar' : '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    const no = Number(f.no), max = Number(f.max), week = Number(f.week);
    if (!no || !max || !week || !f.title.trim()) { toast('Fill number, title, week and maximum mark.'); return; }
    const id = `exam-${no}`;
    if (await store().get('exams', id)) { toast(`Exam ${no} already exists.`); return; }
    await store().set('exams', id, { no, title: f.title.trim(), task: f.task.trim(), week, max, released: false, createdAt: Date.now(), by: me().uid });
    await audit('exam.create', id, null, `${f.title} · week ${week} · /${max}`, '');
    onCreated(id);
  };
  return <Sheet onClose={onClose}><h2>New exam</h2>
    <div class="row"><label class="fld" style={{ maxWidth: 100 }}>Number<input type="number" value={f.no} onInput={set('no')} /></label>
      <label class="fld grow">Title<input value={f.title} onInput={set('title')} /></label></div>
    <label class="fld">Task<input value={f.task} onInput={set('task')} placeholder="e.g. Class I cavity preparation for composite on lower first molar" /></label>
    <div class="row"><label class="fld">Week<select value={f.week} onChange={set('week')}>{PRACTICAL_WEEKS.map((w) => <option value={w.w}>Week {w.w} · {fmtDate(w.from, { day: 'numeric', month: 'short' })}{w.exam ? ' · exam week' : ''}</option>)}</select></label>
      <label class="fld" style={{ maxWidth: 140 }}>Out of<input type="number" step="0.5" value={f.max} onInput={set('max')} /></label></div>
    <div class="row"><button class="btn primary" onClick={save}>Create</button><button class="btn" onClick={onClose}>Cancel</button></div></Sheet>;
}

// Blank mark sheet: one tab per section with the current roster, in the layout the importer reads.
function blankSheet(exam, students) {
  const wb = XLSX.utils.book_new();
  const ins = [[`${exam.title} — mark sheet (Week ${exam.week}, out of ${exam.max})`], [exam.task || ''], [],
    ['1. Open your section tab. Attendance: 1 = present, 0 = absent.'], [`2. Grade from 0 to ${exam.max} (halves allowed). Leave the grade BLANK for an absent student — do not write 0.`],
    ['3. Do not change student IDs, names, rows or column titles. Sign and send the file to the Course Director on the same day.'], [],
    ['١. افتح تبويب السكشن. الحضور: ١ للحاضر و٠ للغائب.'], [`٢. الدرجة من ٠ إلى ${exam.max} (مسموح بالنص). سيب الدرجة فاضية للغايب ومتكتبش صفر.`], ['٣. متغيّرش الأكواد أو الأسماء أو ترتيب الصفوف أو عناوين الأعمدة. وقّع وابعت الملف لمنسق المقرر في نفس اليوم.']];
  const wi = XLSX.utils.aoa_to_sheet(ins); wi['!cols'] = [{ wch: 110 }];
  XLSX.utils.book_append_sheet(wb, wi, 'Instructions');
  for (const s of SECTIONS) {
    const st = students.filter((x) => x.section === s).sort((a, b) => String(a.code).localeCompare(String(b.code)));
    const aoa = [[`Section ${s} — ${exam.title} (Exam ${exam.no})`], [`Week ${exam.week} · ${examDate(exam, s)} · ${exam.task || ''} · out of ${exam.max}`],
      ['#', 'Student ID', 'Student Name', 'Attendance (1 = present, 0 = absent)', `Exam ${exam.no} grade (0–${exam.max})`, 'Notes'],
      ...st.map((x, i) => [i + 1, String(x.code), x.name, '', '', '']), [], ['Supervisor name:', '', '', 'Signature:'], ['Demonstrator name:', '', '', 'Signature:']];
    const ws = XLSX.utils.aoa_to_sheet(aoa); ws['!cols'] = [{ wch: 5 }, { wch: 13 }, { wch: 40 }, { wch: 18 }, { wch: 14 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, ws, `Section ${s}`);
  }
  XLSX.writeFile(wb, `Exam${exam.no}_Mark_Sheet_All_Sections.xlsx`);
}

// Reads a mark sheet: per tab, a header row with Student ID / Name, an Attendance column and a Grade column.
export function parseMarkSheet(sheets, students, max) {
  const byCode = {}, byName = {};
  for (const s of students) { byCode[String(s.code)] = s; const k = normName(s.name); (byName[k] = byName[k] || []).push(s); }
  const out = {}, unmatched = [], invalid = [];
  for (const sh of sheets) {
    const R = sh.rows.map((r) => r.map((c) => String(c ?? '').trim()));
    const low = R.map((r) => r.map((c) => c.toLowerCase()));
    let sheetSec = null;
    for (const r of R.slice(0, 3)) for (const c of r) { const m = /section\s*(\d+)/i.exec(c); if (m) sheetSec = Number(m[1]); }
    if (!sheetSec) { const m = /(\d+)/.exec(sh.name); if (m && Number(m[1]) <= 18) sheetSec = Number(m[1]); }
    const hi = low.findIndex((r) => r.some((c) => /student ?id|^id$|^code|الكود/.test(c)) && r.some((c) => /grade|mark|درجة/.test(c)));
    if (hi < 0) continue;
    const H = low[hi];
    const codeC = H.findIndex((c) => /student ?id|^id$|^code|الكود/.test(c));
    const nameC = H.findIndex((c) => /student ?name|^name|الاسم/.test(c));
    const attC = H.findIndex((c) => /^attend|حضور/.test(c));
    const gradeC = H.findIndex((c) => /grade|mark|درجة/.test(c));
    for (const r of R.slice(hi + 1)) {
      const code = codeC >= 0 ? (r[codeC] || '').replace(/\D/g, '') : '';
      const name = nameC >= 0 ? r[nameC] : '';
      if (!code && !name) continue;
      const a = attC >= 0 ? r[attC] : '', g = (r[gradeC] || '').replace(',', '.');
      if (a === '' && g === '') continue; // not filled
      let st = code && byCode[code];
      if (!st) { const c = byName[normName(name)] || []; const inSec = c.filter((s) => s.section === sheetSec); st = inSec.length === 1 ? inSec[0] : c.length === 1 ? c[0] : null; }
      if (!st) { unmatched.push(`${code} ${name}`.trim()); continue; }
      const absent = a === '0' || /absent|غائب|غ/.test(a.toLowerCase());
      let grade = null;
      if (!absent && g !== '') {
        grade = Number(g);
        if (!Number.isFinite(grade) || grade < 0 || grade > max) { invalid.push(`${st.code} ${st.name}: "${g}"`); continue; }
      }
      out[st.uid] = { st, present: !absent, grade: absent ? null : grade, sheet: sh.name };
    }
  }
  return { marks: Object.values(out), unmatched: [...new Set(unmatched)], invalid };
}

function ImportMarks({ exam, students, onClose }) {
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState('');
  const onFiles = async (e) => {
    const files = [...e.target.files]; if (!files.length) return;
    setBusy('Reading…');
    try {
      const sheets = []; for (const f of files) sheets.push(...(await readAllSheets(f)));
      setRes(parseMarkSheet(sheets, students, exam.max));
    } catch (x) { toast('Could not read: ' + x.message); }
    setBusy(''); e.target.value = '';
  };
  const bySec = {}; for (const m of res?.marks || []) { const g = bySec[m.st.section] = bySec[m.st.section] || { section: m.st.section, present: 0, absent: 0, graded: 0, sum: 0, noGrade: 0 }; if (m.present) { g.present++; if (m.grade != null) { g.graded++; g.sum += m.grade; } else g.noGrade++; } else g.absent++; }
  const secs = Object.values(bySec).sort((a, b) => a.section - b.section);
  const run = async () => {
    const S = store(); const u = me(); let n = 0;
    for (const m of res.marks) {
      setBusy(`Saving… ${++n}/${res.marks.length}`);
      await S.set('examMarks', markId(exam.id, m.st.uid), { examId: exam.id, examNo: exam.no, uid: m.st.uid, code: m.st.code || '', name: m.st.name, section: m.st.section, present: m.present, grade: m.grade, max: exam.max, released: !!exam.released, source: 'mark sheet', by: u.uid, byName: u.name, at: Date.now() });
    }
    await audit('exam.import', exam.id, null, `${n} marks · sections ${secs.map((s) => s.section).join(', ')}`, 'Imported from supervisors\' mark sheet');
    toast(`${n} marks saved`); onClose();
  };
  return <Sheet onClose={onClose}><h2>Import mark sheet — {exam.title}</h2>
    <p class="muted">Choose the mark sheet filled by the supervisors (one tab per section with Student ID, Student Name, Attendance and Grade). You can choose several files. Students are matched by student number, or by name within the section.</p>
    <p class="faint">Attendance 0 = absent (any grade typed for an absent student is ignored). Rows with neither attendance nor grade are skipped, so a sheet with only some sections filled imports just those. Importing a corrected sheet replaces the earlier mark of the same student.</p>
    <label class="btn primary" style={{ alignSelf: 'flex-start' }}>Choose files<input type="file" multiple hidden onChange={onFiles} /></label>
    {busy && <p class="faint">{busy}</p>}
    {res && <>
      <div class="state info"><b>{res.marks.length} students · {secs.length} section(s)</b>
        {res.invalid.length > 0 && <p>{res.invalid.length} grade(s) outside 0–{exam.max} skipped — correct them in the sheet: {res.invalid.slice(0, 6).join('; ')}{res.invalid.length > 6 ? '…' : ''}</p>}
        {res.unmatched.length > 0 && <p>{res.unmatched.length} row(s) not matched to the roster and skipped: {res.unmatched.slice(0, 6).join('; ')}{res.unmatched.length > 6 ? '…' : ''}</p>}</div>
      <div class="tablewrap"><table><thead><tr><th>Section</th><th class="n">Present</th><th class="n">Absent</th><th class="n">Present, no grade</th><th class="n">Mean</th></tr></thead><tbody>
        {secs.map((g) => <tr><td>Section {g.section}</td><td class="n">{g.present}</td><td class="n">{g.absent}</td><td class="n">{g.noGrade || '–'}</td><td class="n">{g.graded ? r1(g.sum / g.graded) : '–'}</td></tr>)}</tbody></table></div>
      <div class="row"><button class="btn primary" disabled={!res.marks.length || !!busy} onClick={run}>{busy || 'Import'}</button><button class="btn" onClick={onClose}>Cancel</button></div></>}
  </Sheet>;
}

// ---------- one student's exams (staff Student sheet tab) ----------
export function StudentExams({ s }) {
  const exams = useQuery('exams', []);
  const marks = useQuery('examMarks', [['uid', '==', s.uid]]);
  const by = {}; for (const m of marks.rows || []) by[m.examId] = m;
  const list = (exams.rows || []).slice().sort((a, b) => a.no - b.no);
  if (!list.length) return <Empty>No exams yet.</Empty>;
  return <div class="tablewrap"><table><thead><tr><th>Exam</th><th>Week</th><th>Attendance</th><th class="n">Mark</th></tr></thead><tbody>
    {list.map((e) => { const m = by[e.id]; return <tr><td>{e.title}</td><td>{e.week}</td><td>{m ? <Pill kind={m.present ? 'good' : 'bad'}>{m.present ? 'Present' : 'Absent'}</Pill> : <span class="faint">not entered</span>}</td><td class="n">{m && m.present && m.grade != null ? `${m.grade} / ${e.max}` : '–'}</td></tr>; })}
  </tbody></table></div>;
}

// ---------- student: released results ----------
export function MyExams() {
  const u = me();
  const marks = useQuery('examMarks', [['uid', '==', u.uid], ['released', '==', true]]);
  const rows = (marks.rows || []).slice().sort((a, b) => a.examNo - b.examNo);
  if (!rows.length) return null;
  return <section class="card"><h2>{L('My exam results', 'نتائج امتحاناتي')}</h2>
    <div class="list">{rows.map((m) => <div class="item"><div class="grow"><b>{L(`Practical exam ${m.examNo}`, `الامتحان العملي ${m.examNo}`)}</b></div>
      {m.present ? <b class="mono">{m.grade != null ? `${m.grade} / ${m.max}` : '–'}</b> : <Pill kind="bad">{L('Absent', 'غائب')}</Pill>}</div>)}</div></section>;
}

