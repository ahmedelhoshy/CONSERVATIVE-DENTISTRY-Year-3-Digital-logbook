import { useState } from 'preact/hooks';
import { me, store, today, audit, isDemo, currentWeek, compressImage } from '../lib/logic.js';
import { L, useQuery, useDoc, Pill, Sheet, Empty, Confirm, fmtDate, fmtDT, toast , labTitle } from '../lib/ui.jsx';
import { exportXlsx, readRosterFile, parseRoster, readAllSheets, parsePastAttendance } from '../lib/export.js';
import { LECTURES, PRACTICAL_WEEKS, LAB_SLOTS, LAB_SLOT_NOTES, weekForDate } from '../data/course.js';
import { SECTION_OF, PTYPE_OF, ATLAS_CATS, CAT_LECTURE } from '../lib/materials.js';
import { labDatesForWeek } from '../lib/demo-seed.js';
import { SessionPanel } from './staff.jsx';

// ---------------- Sessions ----------------
export function SessionsAdmin() {
  const [week, setWeek] = useState(currentWeek().w);
  const w = PRACTICAL_WEEKS.find((x) => x.w === Number(week));
  const q = useQuery('sessions', [['date', '>=', w.from], ['date', '<=', w.to]], { orderBy: 'date' });
  const [open, setOpen] = useState(null);
  const [adding, setAdding] = useState(false);
  const [gen, setGen] = useState(false);
  const [past, setPast] = useState(false);
  const rows = (q.rows || []).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  return <>
    <section class="hero"><h1>Sessions</h1><p class="muted">Lectures and labs with their attendance windows. Generate the whole term from the timetable once, then adjust single sessions.</p></section>
    <div class="row"><label class="fld" style={{ maxWidth: 360 }}>Practical week<select id="sa-week" value={week} onChange={(e) => setWeek(e.target.value)}>{PRACTICAL_WEEKS.map((x) => <option value={x.w}>Week {x.w} · {fmtDate(x.from, { day: 'numeric', month: 'short' })} — {x.topic.slice(0, 48)}</option>)}</select></label>
      <button class="btn" style={{ alignSelf: 'flex-end' }} onClick={() => setAdding(true)}>+ Add session</button><button class="btn" style={{ alignSelf: 'flex-end' }} onClick={() => setGen(true)}>Generate term from timetable</button><button class="btn" style={{ alignSelf: 'flex-end' }} onClick={() => setPast(true)}>Import registers & grades</button></div>
    <p class="faint">{w.topic} · {w.req} requirement(s){w.exam ? ' · practical exam week' : ''}</p>
    <div class="tablewrap"><table><thead><tr><th>Date</th><th>Time</th><th>Session</th><th>Status</th></tr></thead><tbody>
      {rows.map((s) => <tr class="click" onClick={() => setOpen(s.id)}><td>{fmtDate(s.date)}</td><td class="mono">{s.start}–{s.end}</td><td>{s.type === 'lecture' ? `Lecture ${s.lectureNo} — ${s.title}` : labTitle(s)}</td><td><Pill kind={s.status === 'open' ? 'good' : s.status === 'closed' ? '' : 'info'}>{s.status}</Pill></td></tr>)}
    </tbody></table></div>
    {!rows.length && <Empty>No sessions in this week yet. Use “Generate term from timetable”.</Empty>}
    {LAB_SLOT_NOTES.map((n) => <p class="faint">⚠ {n}</p>)}
    {open && <SessionPanel id={open} onClose={() => setOpen(null)} />}
    {adding && <AddSession onClose={() => setAdding(false)} />}
    {past && <ImportPast onClose={() => setPast(false)} />}
    {gen && <Confirm text="Create all lecture and lab sessions for term 1 from the curriculum and timetable? Existing sessions are kept." yes="Generate" onNo={() => setGen(false)} onYes={async () => { const n = await generateTerm(); setGen(false); toast(`${n} sessions created`); }} />}
  </>;
}

function ImportPast({ onClose }) {
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState('');
  const onFiles = async (e) => {
    const files = [...e.target.files]; if (!files.length) return;
    setBusy('Reading…');
    try {
      const students = await store().query('users', [['role', '==', 'student']]);
      const sheets = []; for (const f of files) sheets.push(...(await readAllSheets(f)).map((x) => ({ ...x, name: f.name + ' · ' + x.name })));
      const r = parsePastAttendance(sheets, students, weekForDate);
      // Never import weeks that have not started yet (e.g. marks typed into the wrong column).
      const t = today(); const future = new Set();
      const started = (x) => { const w = PRACTICAL_WEEKS.find((p) => p.w === x.week); const ok = w && w.from <= t; if (!ok) future.add(`week ${x.week} · section ${x.section}`); return ok; };
      r.records = r.records.filter(started); r.teeth = (r.teeth || []).filter(started); r.grades = (r.grades || []).filter(started);
      r.future = [...future];
      setRes(r);
    } catch (x) { toast('Could not read: ' + x.message); }
    setBusy(''); e.target.value = '';
  };
  const groups = {};
  for (const r of res?.records || []) { const k = `${r.section}|${r.week}`; const g = groups[k] = groups[k] || { section: r.section, week: r.week, present: 0, absent: 0, teeth: 0, withTeeth: 0 }; r.present ? g.present++ : g.absent++; }
  for (const r of res?.grades || []) { const k = `${r.section}|${r.week}`; const g = groups[k] = groups[k] || { section: r.section, week: r.week, present: 0, absent: 0, teeth: 0, withTeeth: 0 }; g.graded = (g.graded || 0) + 1; g.gsum = (g.gsum || 0) + r.grade; }
  for (const r of res?.teeth || []) { const k = `${r.section}|${r.week}`; const g = groups[k] = groups[k] || { section: r.section, week: r.week, present: 0, absent: 0, teeth: 0, withTeeth: 0 }; g.teeth += r.teeth; g.withTeeth++; }
  const list = Object.values(groups).sort((a, b) => a.week - b.week || a.section - b.section);
  const run = async () => {
    const S = store(); let n = 0, sess = 0; const u = me();
    for (const g of list) {
      setBusy(`Week ${g.week} · section ${g.section}…`);
      const w = PRACTICAL_WEEKS.find((x) => x.w === g.week); if (!w) continue;
      const dates = labDatesForWeek(w, g.section); if (!dates.length) continue;
      const recs = res.records.filter((r) => r.section === g.section && r.week === g.week);
      if (!recs.length) continue; // teeth counts only — no attendance for this section-week
      const want = recs.find((r) => r.date)?.date;
      const i = Math.max(0, dates.findIndex((d) => d.date === want));
      const sid = `lab-w${w.w}-s${g.section}-${i + 1}`;
      const d = dates[i];
      const cur = await S.get('sessions', sid);
      const endMs = new Date(`${d.date}T${d.end}:00+03:00`).getTime();
      if (!cur) await S.set('sessions', sid, { type: 'lab', section: g.section, week: w.w, date: d.date, start: d.start, end: d.end, title: w.topic, status: 'closed', closesAt: endMs, req: w.req, source: 'paper' });
      else if (cur.status !== 'closed') await S.update('sessions', sid, { status: 'closed', closesAt: cur.closesAt || endMs, source: 'paper' });
      sess++;
      for (const r of recs.filter((x) => x.present)) {
        const id = `${sid}_${r.st.uid}`;
        if (await S.get('attendance', id)) continue;
        await S.set('attendance', id, { sid, uid: r.st.uid, code: r.st.code || '', name: r.st.name, section: g.section, type: 'lab', date: d.date, week: w.w, at: endMs, status: 'confirmed', method: 'paper', by: u.uid, byName: u.name, decidedAt: Date.now(), reason: 'Imported from paper register' });
        n++;
      }
    }
    let tw = 0;
    for (const r of res.teeth || []) {
      setBusy(`Teeth counts… ${++tw}/${res.teeth.length}`);
      await S.set('paperwork', `w${r.week}_${r.st.uid}`, { uid: r.st.uid, code: r.st.code || '', name: r.st.name, section: r.section, week: r.week, teeth: r.teeth, source: 'paper register', by: u.uid, byName: u.name, at: Date.now() });
    }
    let gn = 0;
    for (const r of res.grades || []) {
      setBusy(`Grades… ${++gn}/${res.grades.length}`);
      const w = PRACTICAL_WEEKS.find((x) => x.w === r.week); const task = w?.tasks.find((t) => t.rubric);
      const id = `paper-w${r.week}-${r.st.uid}-${r.req}`;
      const prev = await S.get('entries', id);
      const review = { grade: r.grade, status: r.grade >= 6 ? 'Completed' : 'Incomplete', feedback: '', picks: null, by: u.uid, byName: `${u.name} (paper sheet)`, at: Date.now(), source: 'paper' };
      if (prev) { if (prev.review?.grade !== r.grade) await S.update('entries', id, { review, updatedAt: Date.now() }); continue; }
      await S.set('entries', id, { uid: r.st.uid, code: r.st.code || '', name: r.st.name, section: r.section, week: r.week, rubricId: task?.rubric || null, taskLabel: task ? '' : (w?.topic || ''), tooth: task?.teeth?.[r.req - 1] || task?.teeth?.[0] || '', date: r.date || w?.from || today(), status: 'reviewed', self: null, ai: null, review, photos: [], createdAt: Date.now(), updatedAt: Date.now(), history: [], practice: false, stage: 'full', source: 'paper', reqNo: r.req });
    }
    await audit('attendance.import', 'past', null, `${n} present records in ${sess} lab sessions; ${tw} weekly teeth counts; ${gn} graded teeth`, 'Imported from paper registers / grade sheets');
    toast(`${n} attendance records, ${tw} teeth counts and ${gn} grades imported`); onClose();
  };
  return <Sheet onClose={onClose}><h2>Import registers and grade sheets</h2>
    <p class="muted">For labs held before the platform. Choose the faculty register (Excel with one tab per section and W1, W2… “Attend” columns: 1 = present, 0 = absent), sheets with “W1 Attend” columns, or exports from the previous platform (CSV). You can choose several files at once. Students are matched by student number, or by name within the section.</p>
    <p class="faint">Grade sheets (Student ID, Requirement 1 grade, Requirement 2 grade, with “Section N” and “Week N” at the top) create one graded tooth per grade; importing a corrected sheet updates the grade. </p><p class="faint">Each week's register is recorded in that section's first lab of the week, which is marked as held. Students marked 0 count as absent; blank cells are skipped. The “Req” column is imported as the number of teeth each student completed that week and counts toward requirements. Existing attendance records are never overwritten; teeth counts are updated to the latest register.</p>
    <label class="btn primary" style={{ alignSelf: 'flex-start' }}>Choose files<input id="past-files" type="file" accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" multiple hidden onChange={onFiles} /></label>
    {busy && <p class="faint">{busy}</p>}
    {res && <>
      <div class="state info"><b>{res.records.filter((r) => r.present).length} present · {res.records.filter((r) => !r.present).length} absent · {list.length} section-weeks</b>{res.future?.length > 0 && <p>Skipped because the week has not started yet: {res.future.join('; ')}. Check that these marks are in the right column.</p>}{res.unmatched.length > 0 && <p>{res.unmatched.length} row(s) not matched to the roster and skipped: {res.unmatched.slice(0, 8).join('; ')}{res.unmatched.length > 8 ? '…' : ''}</p>}</div>
      <div class="tablewrap"><table><thead><tr><th>Week</th><th>Section</th><th>Present</th><th>Absent</th><th>Teeth done (Req)</th><th>Graded teeth</th></tr></thead><tbody>{list.map((g) => <tr><td>{g.week}</td><td>{g.section}</td><td>{g.present}</td><td>{g.absent}</td><td>{g.withTeeth ? `${g.teeth} by ${g.withTeeth} students` : '—'}</td><td>{g.graded ? `${g.graded} · mean ${(g.gsum / g.graded).toFixed(1)}` : '—'}</td></tr>)}</tbody></table></div>
      <div class="row"><button class="btn primary" disabled={!list.length || !!busy} onClick={run}>{busy || 'Import'}</button><button class="btn" onClick={onClose}>Cancel</button></div></>}
  </Sheet>;
}

async function generateTerm() {
  const S = store(); let n = 0;
  for (const L1 of LECTURES) {
    const id = `lec-${L1.n}`;
    if (!(await S.get('sessions', id))) { await S.set('sessions', id, { type: 'lecture', lectureNo: L1.n, title: L1.title, lecturer: L1.lecturer, date: L1.date, start: '12:00', end: '13:00', status: 'scheduled', attendanceRequired: L1.attendanceRequired !== false }); n++; }
  }
  for (const w of PRACTICAL_WEEKS) for (let sec = 1; sec <= 18; sec++) {
    const dates = labDatesForWeek(w, sec);
    for (let i = 0; i < dates.length; i++) {
      const id = `lab-w${w.w}-s${sec}-${i + 1}`;
      if (!(await S.get('sessions', id))) { await S.set('sessions', id, { type: 'lab', section: sec, week: w.w, date: dates[i].date, start: dates[i].start, end: dates[i].end, title: i === 0 ? w.topic : 'Discussion and group project (no requirement)', labNo: i + 1, status: 'scheduled', req: i === 0 ? w.req : 0 }); n++; }
    }
  }
  await audit('sessions.generate', 'term-1', null, `${n} created`, 'Generated from curriculum and timetable');
  return n;
}

function AddSession({ onClose }) {
  const [f, setF] = useState({ type: 'lab', date: today(), start: '10:00', end: '12:00', section: 1, lectureNo: '', title: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    const wk = PRACTICAL_WEEKS.find((w) => f.date >= w.from && f.date <= w.to);
    const data = { type: f.type, date: f.date, start: f.start, end: f.end, title: f.title || (f.type === 'lab' ? wk?.topic || 'Lab' : 'Lecture'), status: 'scheduled', week: wk ? wk.w : null };
    if (f.type === 'lab') data.section = Number(f.section); else { data.lectureNo = Number(f.lectureNo) || null; data.attendanceRequired = true; }
    const id = await store().add('sessions', data);
    await audit('sessions.add', id, null, JSON.stringify(data), 'Added manually');
    toast('Session added'); onClose();
  };
  return <Sheet onClose={onClose}><h2>Add session</h2>
    <div class="grid2"><label class="fld">Type<select id="as-type" value={f.type} onChange={set('type')}><option value="lab">Lab</option><option value="lecture">Lecture</option></select></label>
      {f.type === 'lab' ? <label class="fld">Section<select id="as-sec" value={f.section} onChange={set('section')}>{Array.from({ length: 18 }, (_, i) => <option value={i + 1}>Section {i + 1}</option>)}</select></label> : <label class="fld">Lecture number<input id="as-lec" type="number" value={f.lectureNo} onInput={set('lectureNo')} /></label>}
      <label class="fld">Date<input id="as-date" type="date" value={f.date} onInput={set('date')} /></label>
      <div class="row"><label class="fld" style={{ flex: 1 }}>Start<input id="as-start" type="time" value={f.start} onInput={set('start')} /></label><label class="fld" style={{ flex: 1 }}>End<input id="as-end" type="time" value={f.end} onInput={set('end')} /></label></div></div>
    <label class="fld">Title<input id="as-title" value={f.title} onInput={set('title')} placeholder="e.g. Make-up lab" /></label>
    <div class="row"><button class="btn primary" onClick={save}>Add</button><button class="btn" onClick={onClose}>Cancel</button></div></Sheet>;
}

// ---------------- Materials ----------------
// Four sections, each shown to students in its own tab: lectures, practical (by week), helpful links, atlas pictures.
const PTYPES = { video: 'Demonstration video', guide: 'Practical guide / handout', link: 'Practical link' };
const weekLabel = (w) => { const x = PRACTICAL_WEEKS.find((p) => p.w === Number(w)); return x ? `Week ${x.w} — ${x.topic}` : 'General (all weeks)'; };

export function Content() {
  const q = useQuery('materials', []);
  const [edit, setEdit] = useState(null);
  const [upload, setUpload] = useState(false);
  const rows = q.rows || [];
  const by = (s) => rows.filter((m) => SECTION_OF(m) === s);
  const lecNos = new Set(by('lecture').map((m) => m.lectureNo));
  const t = today();
  const missing = LECTURES.filter((l) => l.date <= t && !lecNos.has(l.n));
  const lec = by('lecture').sort((a, b) => (a.lectureNo || 0) - (b.lectureNo || 0) || (a.order || 0) - (b.order || 0));
  const prac = by('practical').sort((a, b) => (a.week || 99) - (b.week || 99) || (a.order || 0) - (b.order || 0));
  const links = by('link').sort((a, b) => (a.order || 0) - (b.order || 0));
  const atlas = by('atlas').sort((a, b) => (a.lectureNo || 99) - (b.lectureNo || 99) || ATLAS_CATS.indexOf(a.category) - ATLAS_CATS.indexOf(b.category) || (a.order || 0) - (b.order || 0));
  const item = (m, sub) => <div class="item"><div class="grow"><b dir="auto">{m.title}</b><div class="faint">{sub} · updated {fmtDate(m.updatedAt, { day: 'numeric', month: 'short' })}</div>{m.url ? <a class="faint" href={m.url} target="_blank" rel="noopener">{m.url.slice(0, 70)}</a> : !m.body && <Pill kind="bad">No link</Pill>}</div><button class="btn sm" onClick={() => setEdit(m)}>Edit</button></div>;
  const head = (title, sub, btn, onAdd) => <div class="row between"><div><h2>{title}</h2><p class="faint">{sub}</p></div><button class="btn primary" onClick={onAdd}>{btn}</button></div>;
  return <>
    <section class="hero"><h1>Learning materials</h1><p class="muted">Students see four separate tabs: <b>Lectures</b>, <b>Practical</b> (by week), <b>Helpful links</b> and the <b>Atlas</b>. Paste share links (Google Drive, OneDrive, YouTube); replacing a link keeps the same entry, so students never see a broken item. If something is in the wrong section, open it and change “Section”.</p></section>
    {missing.length > 0 && <div class="state pending"><b>{missing.length} past lecture(s) without slides</b><p>{missing.map((l) => `Lecture ${l.n}`).join(', ')}</p></div>}
    <section class="card">{head('1 · Lectures', 'Slides and question bank for each lecture.', '+ Add lecture material', () => setEdit({ kind: 'lecture' }))}
      <div class="list">{lec.length ? lec.map((m) => item(m, m.lectureNo ? `Lecture ${m.lectureNo}${m.qbank ? ' · question bank' : ''}` : 'Course-wide lecture material')) : <Empty>No lecture material yet.</Empty>}</div></section>
    <section class="card">{head('2 · Practical', 'Demonstration videos, lab guides and links, filed under the practical week.', '+ Add practical material', () => setEdit({ kind: 'practical', ptype: 'video', week: currentWeek().w }))}
      <div class="list">{prac.length ? prac.map((m) => item(m, `${PTYPES[PTYPE_OF(m)]} · ${m.week ? 'week ' + m.week : 'all weeks'}`)) : <Empty>No practical material yet.</Empty>}</div></section>
    <section class="card">{head('3 · Helpful links', 'Textbooks, references and websites for the whole course.', '+ Add helpful link', () => setEdit({ kind: 'link' }))}
      <div class="list">{links.length ? links.map((m) => item(m, 'Helpful link')) : <Empty>No links yet.</Empty>}</div></section>
    <section class="card">{head('4 · Atlas pictures', `Reference pictures students see in the Atlas tab, grouped by topic or cavity class; pictures linked to a lecture also appear under that lecture. ${atlas.length} uploaded + 36 faculty atlas images.`, '+ Upload pictures', () => setUpload(true))}
      {atlas.length ? <div class="atlas">{atlas.map((a) => <figure onClick={() => setEdit(a)}><img loading="lazy" src={a.url} alt={a.title} /><figcaption><b>{a.category}{a.lectureNo ? ` · L${a.lectureNo}` : ''}</b><span class="faint" dir="auto">{a.title}</span></figcaption></figure>)}</div> : <Empty>No pictures uploaded yet. Upload several at once and choose the cavity class.</Empty>}</section>
    {edit && <MaterialSheet m={edit} onClose={() => setEdit(null)} />}
    {upload && <AtlasUpload onClose={() => setUpload(false)} />}
  </>;
}
export function driveFix(url) {
  // Turn Google Drive "view" links into "preview" links that open cleanly on phones.
  const m = /drive\.google\.com\/file\/d\/([^/]+)/.exec(url || '');
  return m ? `https://drive.google.com/file/d/${m[1]}/preview` : url;
}
function MaterialSheet({ m, onClose }) {
  const init = { title: '', url: '', qbank: '', body: '', lectureNo: '', order: 0, week: '', category: ATLAS_CATS[0], ...m };
  init.section = SECTION_OF(init); init.ptype = PTYPE_OF(init);
  const [f, setF] = useState(init);
  const [del, setDel] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const sec = f.section;
  const save = async () => {
    if (sec !== 'atlas' && f.url && !/^https:\/\//.test(f.url)) { toast('Links must start with https://'); return; }
    const base = { title: f.title.trim(), order: Number(f.order) || 0, updatedAt: Date.now(), updatedBy: me().name };
    let data;
    if (sec === 'atlas') data = { ...base, kind: 'atlas', category: (f.category || 'Other').trim(), lectureNo: Number(f.lectureNo) || null };
    else data = { ...base, kind: sec, url: driveFix((f.url || '').trim()), body: f.body || '',
      qbank: sec === 'lecture' ? f.qbank || '' : '', lectureNo: sec === 'lecture' ? Number(f.lectureNo) || null : null,
      week: sec === 'practical' ? Number(f.week) || null : null, ptype: sec === 'practical' ? f.ptype : null };
    if (m.id) await store().update('materials', m.id, data); else await store().add('materials', data);
    await audit('materials.save', m.id || data.title, m.url || null, data.url || data.category, sec);
    toast('Saved — students see it now'); onClose();
  };
  return <Sheet onClose={onClose}><h2>{m.id ? 'Edit material' : 'Add material'}</h2>
    {sec === 'atlas' ? <><img src={f.url} alt="" style={{ maxWidth: '100%', borderRadius: 12 }} />
      <TopicPicker id="mt-cat" category={f.category} lectureNo={f.lectureNo} onChange={(category, lectureNo) => setF({ ...f, category, lectureNo: lectureNo || '' })} />
      <label class="fld">Also show under lecture<select id="mt-alec" value={f.lectureNo || ''} onChange={set('lectureNo')}><option value="">No — Atlas only</option>{LECTURES.map((l) => <option value={l.n}>Lecture {l.n} — {l.title}</option>)}</select></label>
      <label class="fld">Caption<input id="mt-title" value={f.title} onInput={set('title')} dir="auto" /></label></>
    : <>
      <div class="grid2"><label class="fld">Section (student tab)<select id="mt-sec" value={sec} onChange={set('section')}><option value="lecture">Lectures</option><option value="practical">Practical</option><option value="link">Helpful links</option></select></label>
        {sec === 'lecture' && <label class="fld">Lecture<select id="mt-lec" value={f.lectureNo || ''} onChange={(e) => { const l = LECTURES.find((x) => x.n === Number(e.target.value)); setF({ ...f, lectureNo: e.target.value, title: f.title || (l ? `Lecture ${l.n} — ${l.title}` : '') }); }}><option value="">Course-wide (not one lecture)</option>{LECTURES.map((l) => <option value={l.n}>Lecture {l.n} — {l.title}</option>)}</select></label>}
        {sec === 'practical' && <label class="fld">Practical week<select id="mt-week" value={f.week || ''} onChange={set('week')}><option value="">All weeks (general)</option>{PRACTICAL_WEEKS.map((w) => <option value={w.w}>Week {w.w} — {w.topic.slice(0, 60)}</option>)}</select></label>}
        {sec === 'link' && <label class="fld">Order<input id="mt-order" type="number" value={f.order} onInput={set('order')} /></label>}</div>
      {sec === 'practical' && <label class="fld">Type<select id="mt-ptype" value={f.ptype} onChange={set('ptype')}>{Object.entries(PTYPES).map(([k, v]) => <option value={k}>{v}</option>)}</select></label>}
      <label class="fld">Title<input id="mt-title" value={f.title} onInput={set('title')} dir="auto" /></label>
      <label class="fld">Link (https://…)<input id="mt-url" type="url" value={f.url} onInput={set('url')} placeholder="https://drive.google.com/file/d/…/view" /></label>
      <p class="faint">Google Drive: set sharing to “Anyone with the link — Viewer”. View links are converted to preview links automatically.</p>
      {sec === 'lecture' && <label class="fld">Question bank (one question per line)<textarea id="mt-qbank" value={f.qbank} onInput={set('qbank')} dir="auto" /></label>}
      {sec !== 'lecture' && <label class="fld">Short note for students (optional)<textarea id="mt-body" value={f.body} onInput={set('body')} dir="auto" /></label>}
    </>}
    <div class="row"><button class="btn primary" disabled={!f.title.trim() && sec !== 'atlas'} onClick={save}>Save</button><button class="btn" onClick={onClose}>Cancel</button>{m.id && <button class="btn danger" onClick={() => setDel(true)}>Delete</button>}</div>
    {del && <Confirm text={`Delete “${f.title || 'this picture'}”? Students will no longer see it.`} yes="Delete" onNo={() => setDel(false)} onYes={async () => { await store().del('materials', m.id); await audit('materials.delete', m.id, f.title, null, ''); onClose(); }} />}
  </Sheet>;
}

// Topic picker for atlas pictures: every lecture topic, then the practical cavity classes, then a free topic.
const PRACT_CATS = ATLAS_CATS.filter((c) => !CAT_LECTURE[c]);
function topicKey(category, lectureNo) {
  const n = Number(lectureNo) || null;
  if (n && (LECTURES.find((l) => l.n === n)?.title === category || CAT_LECTURE[category] === n)) return 'L:' + n;
  if (PRACT_CATS.includes(category)) return 'P:' + category;
  return category ? 'O' : 'L:2';
}
function TopicPicker({ id, category, lectureNo, onChange }) {
  const [other, setOther] = useState(() => topicKey(category, lectureNo) === 'O');
  const key = other ? 'O' : topicKey(category, lectureNo);
  const pick = (v) => {
    setOther(v === 'O');
    if (v.startsWith('L:')) { const l = LECTURES.find((x) => x.n === Number(v.slice(2))); onChange(l.title, String(l.n)); }
    else if (v.startsWith('P:')) onChange(v.slice(2), ''); // cavity classes: not linked to a lecture unless chosen below
    else onChange('', '');
  };
  return <><label class="fld">Topic<select id={id} value={key} onChange={(e) => pick(e.target.value)}>
      <optgroup label="Lecture topics">{LECTURES.map((l) => <option value={'L:' + l.n}>Lecture {l.n} — {l.title}</option>)}</optgroup>
      <optgroup label="Practical — cavity preparations">{PRACT_CATS.map((c) => <option value={'P:' + c}>{c}</option>)}</optgroup>
      <option value="O">Other topic (type below)…</option></select></label>
    {key === 'O' && <label class="fld">Other topic<input id={id + '-other'} value={category} onInput={(e) => onChange(e.target.value, lectureNo)} placeholder="e.g. Rubber dam isolation" dir="auto" /></label>}</>;
}

function AtlasUpload({ onClose }) {
  const [files, setFiles] = useState([]);
  const [cat, setCat] = useState(LECTURES.find((l) => l.n === 2).title);
  const [lec, setLec] = useState('2');
  const [caps, setCaps] = useState({});
  const [busy, setBusy] = useState(0);
  const [errors, setErrors] = useState(null);
  const go = async () => {
    setErrors(null);
    const S = store(); let ok = 0; const bad = [];
    for (let i = 0; i < files.length; i++) {
      setBusy(i + 1);
      const f = files[i];
      try {
        if (/heic|heif/i.test(f.type) || /\.hei[cf]$/i.test(f.name)) throw Object.assign(new Error('iPhone HEIC format — export or save it as JPG first'), { code: 'heic' });
        let blob;
        try { blob = (await compressImage(f, 1600, 0.85)).blob; } catch (e) { throw new Error('this browser cannot open the picture — save it as JPG or PNG'); }
        const path = `atlas/${Date.now()}_${i}.jpg`;
        const url = await S.putFile(path, blob);
        await S.add('materials', { kind: 'atlas', category: (cat || 'Other').trim(), lectureNo: Number(lec) || null, title: (caps[i] ?? f.name.replace(/\.[^.]+$/, '')).trim(), url, path, order: Date.now() + i, updatedAt: Date.now(), updatedBy: me().name });
        ok++;
      } catch (e) {
        const code = String(e.code || '');
        const why = code.includes('unauthorized') ? 'storage refused the upload (permission)' : code.includes('quota') ? 'storage quota exceeded' : code.includes('retry-limit') || code.includes('network') ? 'network problem — try again' : e.message;
        bad.push(`${f.name}: ${why}`); console.error('atlas upload', f.name, e);
      }
    }
    setBusy(0);
    if (ok) await audit('atlas.upload', cat, null, `${ok} picture(s)`, '');
    if (!bad.length) { toast(`${ok} picture(s) added to the Atlas`); onClose(); }
    else setErrors({ ok, bad });
  };
  return <Sheet onClose={onClose}><h2>Upload Atlas pictures</h2>
    <p class="muted">Choose one or more photos (JPG/PNG). They are resized on this computer before upload. Students see them in Learn → Atlas under the topic you choose, and under the lecture if you link one. Choose a lecture topic or a cavity class; lecture topics also appear under that lecture.</p>
    <TopicPicker id="au-cat" category={cat} lectureNo={lec} onChange={(category, lectureNo) => { setCat(category); setLec(lectureNo || ''); }} />
    <label class="fld">Also show under lecture<select id="au-lec" value={lec || ''} onChange={(e) => setLec(e.target.value)}><option value="">No — Atlas only</option>{LECTURES.map((l) => <option value={l.n}>Lecture {l.n} — {l.title}</option>)}</select></label>
    <label class="btn" style={{ alignSelf: 'flex-start' }}>Choose pictures<input id="au-files" type="file" accept="image/*" multiple hidden onChange={(e) => { setFiles([...e.target.files]); setCaps({}); }} /></label>
    {files.length > 0 && <div class="list">{files.map((f, i) => <div class="item"><div class="grow"><input value={caps[i] ?? f.name.replace(/\.[^.]+$/, '')} onInput={(e) => setCaps({ ...caps, [i]: e.target.value })} dir="auto" aria-label="Caption" /></div><span class="faint">{Math.round(f.size / 1024)} KB</span></div>)}</div>}
    {errors && <div class="state failed"><b>{errors.ok} uploaded · {errors.bad.length} failed</b><ul style={{ margin: '6px 0 0', paddingInlineStart: 18 }}>{errors.bad.map((x) => <li>{x}</li>)}</ul><p class="faint">Send a screenshot of this box to the course technical support if the reason is not clear.</p></div>}
    <div class="row"><button class="btn primary" disabled={!files.length || busy || !String(cat || '').trim()} onClick={go}>{busy ? `Uploading ${busy} of ${files.length}…` : `Upload ${files.length || ''} picture(s)`}</button><button class="btn" onClick={onClose} disabled={!!busy}>Cancel</button></div>
  </Sheet>;
}

// ---------------- Announcements ----------------
export function Announcements() {
  const q = useQuery('announcements', [], { orderBy: 'publishAt', desc: true });
  const [edit, setEdit] = useState(null);
  return <>
    <section class="hero"><h1>Announcements</h1><p class="muted">Posted announcements appear on students' home screen immediately (or at the scheduled time).</p></section>
    <button class="btn primary" style={{ alignSelf: 'flex-start' }} onClick={() => setEdit({})}>+ New announcement</button>
    <section class="card"><div class="list">{(q.rows || []).map((a) => <div class="item"><div class="grow"><b dir="auto">{a.title}</b> {a.pinned && <Pill kind="gold">Pinned</Pill>} {a.imageUrl && <Pill>Picture</Pill>} {a.publishAt > Date.now() && !isDemo() && <Pill kind="info">Scheduled</Pill>}<div class="faint">{{ students: 'All students', staff: 'Staff only', all: 'Everyone', sections: `Sections ${(a.sections || []).join(', ')}` }[a.audience]} · {fmtDT(a.publishAt)} · {a.byName}</div><p class="muted" style={{ fontSize: '.88rem', whiteSpace: 'pre-wrap' }} dir="auto">{a.body}</p></div><button class="btn sm" onClick={() => setEdit(a)}>Edit</button></div>)}</div></section>
    {edit && <AnnSheet a={edit} onClose={() => setEdit(null)} />}
  </>;
}
function AnnSheet({ a, onClose }) {
  const [f, setF] = useState({ title: '', body: '', audience: 'students', sections: [], pinned: false, when: '', ...a });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const [pic, setPic] = useState(null); // newly chosen picture (File)
  const [busy, setBusy] = useState(false);
  const preview = pic ? URL.createObjectURL(pic) : f.imageUrl;
  const save = async () => {
    setBusy(true);
    try {
      const publishAt = f.when ? new Date(f.when).getTime() : a.publishAt || Date.now();
      const data = { title: f.title.trim(), body: f.body.trim(), audience: f.audience, sections: f.audience === 'sections' ? f.sections.map(Number) : [], pinned: !!f.pinned, publishAt, by: me().uid, byName: me().name, imageUrl: f.imageUrl || null, imagePath: f.imagePath || null };
      if (pic) {
        if (/heic|heif/i.test(pic.type) || /\.hei[cf]$/i.test(pic.name)) throw new Error('iPhone HEIC picture — save it as JPG first');
        let blob; try { blob = (await compressImage(pic, 1600, 0.85)).blob; } catch (e) { throw new Error('this browser cannot open the picture — save it as JPG or PNG'); }
        const path = `announcements/${Date.now()}.jpg`;
        data.imageUrl = await store().putFile(path, blob); data.imagePath = path;
      }
      if (a.id) await store().update('announcements', a.id, data); else await store().add('announcements', data);
      toast('Announcement saved'); onClose();
    } catch (e) {
      const code = String(e.code || '');
      toast('Not saved: ' + (code.includes('unauthorized') ? 'storage refused the picture (permission)' : e.message));
      console.error(e);
    }
    setBusy(false);
  };
  return <Sheet onClose={onClose}><h2>{a.id ? 'Edit announcement' : 'New announcement'}</h2>
    <label class="fld">Title<input id="an-title" value={f.title} onInput={set('title')} dir="auto" /></label>
    <label class="fld">Message<textarea id="an-body" value={f.body} onInput={set('body')} dir="auto" style={{ minHeight: 120 }} /></label>
    <div class="grid2"><label class="fld">Audience<select id="an-aud" value={f.audience} onChange={set('audience')}><option value="students">All students</option><option value="sections">Selected sections</option><option value="staff">Staff only</option><option value="all">Everyone</option></select></label>
      <label class="fld">Publish at (empty = now)<input id="an-when" type="datetime-local" value={f.when} onInput={set('when')} /></label></div>
    {f.audience === 'sections' && <div class="row">{Array.from({ length: 18 }, (_, i) => i + 1).map((s) => <label class="pill" style={{ cursor: 'pointer' }}><input type="checkbox" checked={f.sections.includes(s)} onChange={(e) => setF({ ...f, sections: e.target.checked ? [...f.sections, s] : f.sections.filter((x) => x !== s) })} /> S{s}</label>)}</div>}
    <div class="stack"><span class="eyebrow">Picture (optional)</span>
      {preview && <img src={preview} alt="" style={{ maxWidth: '100%', maxHeight: 320, objectFit: 'contain', borderRadius: 12, alignSelf: 'flex-start' }} />}
      <div class="row"><label class="btn">{preview ? 'Change picture' : 'Add picture'}<input id="an-pic" type="file" accept="image/*" hidden onChange={(e) => { if (e.target.files[0]) setPic(e.target.files[0]); e.target.value = ''; }} /></label>
        {preview && <button class="btn" onClick={() => { setPic(null); setF({ ...f, imageUrl: null, imagePath: null }); }}>Remove picture</button>}</div></div>
    <label class="row"><input id="an-pin" type="checkbox" checked={f.pinned} onChange={(e) => setF({ ...f, pinned: e.target.checked })} /> Pin to the top</label>
    <div class="row"><button class="btn primary" disabled={busy || !f.title.trim() || !(f.body.trim() || preview)} onClick={save}>{busy ? 'Publishing…' : 'Publish'}</button><button class="btn" onClick={onClose}>Cancel</button>{a.id && <button class="btn danger" onClick={async () => { await store().del('announcements', a.id); onClose(); }}>Delete</button>}</div></Sheet>;
}

// ---------------- People ----------------
export function People() {
  const staff = useQuery('users', [['role', '!=', 'student']]);
  const [preview, setPreview] = useState(null);
  const [edit, setEdit] = useState(null);
  const counts = useQuery('users', [['role', '==', 'student']]);
  const onFile = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { setPreview(parseRoster(await readRosterFile(f))); } catch (x) { toast('Could not read that file: ' + x.message); }
    e.target.value = '';
  };
  const importNow = async () => {
    const S = store(); let n = 0, noSec = 0;
    const existing = new Set((counts.rows || []).map((x) => x.email));
    for (const s of preview.students) {
      if (!s.email) continue;
      const rec = { uid: s.code, code: s.code, name: s.name, email: s.email, status: s.status, role: 'student' };
      // A blank section never erases one already set; new students without a section start as "not assigned".
      if (s.section) rec.section = s.section; else if (!existing.has(s.email)) { rec.section = null; noSec++; }
      await S.set('users', s.email, rec, { merge: true }); n++;
    }
    await audit('roster.import', 'students', null, `${n} students (${noSec} without section)`, 'Roster import');
    toast(`${n} students imported${noSec ? ` · ${noSec} without a section yet` : ''}`); setPreview(null);
  };
  const byRole = (r) => (staff.rows || []).filter((x) => x.role === r);
  return <>
    <section class="hero"><h1>People and permissions</h1><p class="muted">Only emails on this list can sign in. Students see only their own records; each staff role sees what it needs.</p></section>
    <section class="card"><div class="row between"><div><h2>Students</h2><p class="faint">{(counts.rows || []).length} on the roster{(counts.rows || []).some((x) => !x.section) ? ` · ${(counts.rows || []).filter((x) => !x.section).length} without a section` : ''}</p></div>
      <label class="btn primary">Import roster (Excel)<input id="roster-file" type="file" accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" hidden onChange={onFile} /></label></div>
      <p class="faint">Columns needed: student number (الكود), name (الاسم), university email, and section (1–18; may be left blank for now). Arabic or English headers are recognised. The file stays on your computer; only the rows are saved.</p>
      {preview && <div class="stack"><div class="state info"><b>{preview.students.length} students found</b><p>{(() => { const noEm = preview.students.filter((s) => !s.email), noSec = preview.students.filter((s) => s.email && !s.section); return <>{noEm.length ? `${noEm.length} rows have no email and will be skipped: ${noEm.slice(0, 6).map((s) => s.code).join(', ')}${noEm.length > 6 ? '…' : ''}. ` : ''}{noSec.length ? `${noSec.length} students have no section yet: they can sign in, check in to lectures and use the library now; lab check-in and tooth submissions open once you re-import the file with sections (a blank section never erases one already set).` : ''}{!noEm.length && !noSec.length ? 'All rows have email and section.' : ''}</>; })()}</p></div>
        <div class="row"><button class="btn primary" disabled={!preview.students.some((s) => s.email)} onClick={importNow}>Import {preview.students.filter((s) => s.email).length} students</button><button class="btn" onClick={() => setPreview(null)}>Cancel</button></div></div>}
    </section>
    <SignIns students={counts.rows || []} staff={staff.rows || []} />
    <section class="card"><div class="row between"><h2>Staff</h2><button class="btn" onClick={() => setEdit({ role: 'demonstrator', sections: Array.from({ length: 18 }, (_, i) => i + 1), lectures: [] })}>+ Add staff</button></div>
      {['director', 'dean', 'hod', 'vicedean', 'lecturer', 'demonstrator', 'admin'].map((r) => byRole(r).length > 0 && <div class="stack"><span class="eyebrow">{{ dean: 'Dean of the Faculty', director: 'Course Director', hod: 'Head of Department', vicedean: 'Vice Dean — Student Affairs', lecturer: 'Lecturers', demonstrator: 'Demonstrators', admin: 'Administrators' }[r]}</span>
        <div class="list">{byRole(r).map((s) => <div class="item"><div class="grow"><b>{s.name}</b><div class="faint">{s.email}{s.sections?.length ? ` · sections ${s.sections.join(', ')}` : ''}{s.lectures?.length ? ` · lectures ${s.lectures.join(', ')}` : ''} · {s.lastLogin ? `last sign-in ${fmtDT(s.lastLogin)}` : 'not signed in yet'}</div></div><button class="btn sm" onClick={() => setEdit(s)}>Edit</button></div>)}</div></div>)}
    </section>
    {edit && <StaffSheet s={edit} onClose={() => setEdit(null)} />}
  </>;
}
// Who has signed in: recorded on each person's roster entry at sign-in (refreshed at most every 6 hours).
function SignIns({ students, staff }) {
  const [sec, setSec] = useState(0);
  const inS = students.filter((x) => x.lastLogin), inT = staff.filter((x) => x.lastLogin);
  const bySec = Array.from({ length: 18 }, (_, i) => { const all = students.filter((x) => x.section === i + 1); return { s: i + 1, all: all.length, in: all.filter((x) => x.lastLogin).length }; });
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const list = sec ? students.filter((x) => x.section === sec).sort((a, b) => (b.lastLogin || 0) - (a.lastLogin || 0)) : [];
  const exportNot = () => exportXlsx({ title: 'Not signed in yet', fileName: 'Not_signed_in', columns: [
    { label: 'Student number', get: (r) => r.code }, { label: 'Name', get: (r) => r.name, w: 34 }, { label: 'Section', get: (r) => r.section ?? '' }, { label: 'Email', get: (r) => r.email, w: 36 },
  ], rows: students.filter((x) => !x.lastLogin).sort((a, b) => (a.section || 99) - (b.section || 99) || String(a.code).localeCompare(String(b.code))) });
  return <section class="card" id="signins"><div class="row between"><div><h2>Who has signed in</h2>
      <p class="faint">Students {inS.length} / {students.length} ({pct(inS.length, students.length)}%) · Staff {inT.length} / {staff.length}</p></div>
      <button class="btn" onClick={exportNot}>Download students not signed in (Excel)</button></div>
    <div class="tablewrap"><table><thead><tr><th>Section</th>{bySec.map((x) => <th class="n click" onClick={() => setSec(sec === x.s ? 0 : x.s)} style={{ cursor: 'pointer', textDecoration: sec === x.s ? 'underline' : '' }}>{x.s}</th>)}</tr></thead>
      <tbody><tr><td class="faint">Signed in</td>{bySec.map((x) => <td class="n mono" style={{ color: x.all && x.in === x.all ? 'var(--good, #2e8b57)' : '' }}>{x.in}/{x.all}</td>)}</tr></tbody></table></div>
    <p class="faint">Tap a section number to see its students.</p>
    {sec > 0 && <div class="list">{list.map((x) => <div class="item"><div class="grow"><b dir="auto">{x.name}</b> <span class="mono faint">{x.code}</span></div>{x.lastLogin ? <Pill kind="good">{fmtDT(x.lastLogin)}</Pill> : <Pill kind="warn">not yet</Pill>}</div>)}</div>}
  </section>;
}
function StaffSheet({ s, onClose }) {
  const [f, setF] = useState({ name: '', email: '', ...s, sections: s.sections || [], lectures: s.lectures || [] });
  const save = async () => {
    const email = f.email.trim().toLowerCase();
    if (!/@/.test(email)) { toast('Enter a valid email'); return; }
    const data = { uid: email, name: f.name.trim(), email, role: f.role, sections: f.sections.map(Number), lectures: f.lectures.map(Number) };
    await store().set('users', email, data, { merge: true });
    await audit('staff.save', email, s.role || null, `${f.role} ${data.sections.join(',')}`, 'Permissions updated');
    toast('Saved'); onClose();
  };
  const toggle = (k, v) => setF({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] });
  return <Sheet onClose={onClose}><h2>{s.email ? 'Edit staff member' : 'Add staff member'}</h2>
    <div class="grid2"><label class="fld">Name<input id="sf-name" value={f.name} onInput={(e) => setF({ ...f, name: e.target.value })} /></label><label class="fld">University email<input id="sf-email" type="email" value={f.email} disabled={!!s.email} onInput={(e) => setF({ ...f, email: e.target.value })} /></label></div>
    <label class="fld">Role<select id="sf-role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="demonstrator">Demonstrator / TA</option><option value="lecturer">Lecturer / lab supervisor</option><option value="director">Course Director</option><option value="dean">Dean of the Faculty</option><option value="hod">Head of Department</option><option value="vicedean">Vice Dean — Student Affairs</option><option value="admin">Administrator</option></select></label>
    {['demonstrator', 'lecturer'].includes(f.role) && <><div class="row between"><span class="eyebrow">Sections</span><span class="row" style={{ gap: 6 }}><button type="button" class="btn sm" onClick={() => setF({ ...f, sections: Array.from({ length: 18 }, (_, i) => i + 1) })}>All 18</button><button type="button" class="btn sm" onClick={() => setF({ ...f, sections: [] })}>None</button></span></div><div class="row">{Array.from({ length: 18 }, (_, i) => i + 1).map((x) => <label class="pill" style={{ cursor: 'pointer' }}><input type="checkbox" checked={f.sections.includes(x)} onChange={() => toggle('sections', x)} /> S{x}</label>)}</div></>}
    {f.role === 'lecturer' && <><span class="eyebrow">Lectures</span><div class="row">{LECTURES.map((l) => <label class="pill" style={{ cursor: 'pointer' }}><input type="checkbox" checked={f.lectures.includes(l.n)} onChange={() => toggle('lectures', l.n)} /> L{l.n}</label>)}</div></>}
    <div class="row"><button class="btn primary" disabled={!f.name.trim() || !f.email.trim()} onClick={save}>Save</button><button class="btn" onClick={onClose}>Cancel</button></div></Sheet>;
}

// ---------------- Settings ----------------
export function Settings() {
  const c = useDoc('config', 'course');
  const [f, setF] = useState(null);
  if (c === undefined) return <p>Loading…</p>;
  const v = f || { absenceLimitPct: 25, minTeethPerLab: 2, aiEnabled: true, aiDailyLimit: 1500, reportRecipients: [], ...(c || {}) };
  const set = (k, val) => setF({ ...v, [k]: val });
  const save = async () => { await store().set('config', 'course', { ...v, reportRecipients: (typeof v.reportRecipients === 'string' ? v.reportRecipients.split(/[\s,;]+/) : v.reportRecipients).filter(Boolean) }, { merge: true }); await audit('settings.save', 'config/course', null, null, ''); toast('Settings saved'); setF(null); };
  return <>
    <section class="hero"><h1>Settings</h1><p class="muted">Course rules, daily reports and Prep Lens limits.</p></section>
    <section class="card"><h2>Course rules</h2><div class="grid2">
      <label class="fld">Absence limit before a student is flagged (%)<input id="set-abs" type="number" value={v.absenceLimitPct} onInput={(e) => set('absenceLimitPct', Number(e.target.value))} /></label>
      <label class="fld">Default minimum teeth per lab<input id="set-min" type="number" value={v.minTeethPerLab} onInput={(e) => set('minTeethPerLab', Number(e.target.value))} /></label></div>
      <p class="faint">Pass mark: 60 % (6/10). Weekly requirements follow the practical schedule.</p></section>
    <section class="card"><h2>Daily report</h2><p class="muted">Every day at 9:00 Cairo time a summary of the previous day is emailed to these addresses. The dashboards refresh at 19:00.</p>
      <label class="fld">Recipients (one per line)<textarea id="set-rcpt" value={Array.isArray(v.reportRecipients) ? v.reportRecipients.join('\n') : v.reportRecipients} onInput={(e) => set('reportRecipients', e.target.value)} /></label>
      {c?.lastReportAt && <p class="faint">Last report sent {fmtDT(c.lastReportAt)}.</p>}</section>
    <section class="card"><h2>Prep Lens (AI feedback)</h2>
      <label class="row"><input id="set-ai" type="checkbox" checked={v.aiEnabled} onChange={(e) => set('aiEnabled', e.target.checked)} /> Prep Lens feedback is on</label>
      <label class="fld">Daily limit (photos)<input id="set-ailim" type="number" value={v.aiDailyLimit} onInput={(e) => set('aiDailyLimit', Number(e.target.value))} /></label>
      <p class="faint">When the limit is reached students still complete the rubric self-assessment; only the AI comments pause until the next day. Used today: {c?.aiUsedToday ?? 0}.</p></section>
    <button class="btn primary" style={{ alignSelf: 'flex-start' }} disabled={!f} onClick={save}>Save settings</button>
  </>;
}

// ---------------- Audit ----------------
export function AuditLog() {
  const q = useQuery('audit', [], { orderBy: 'at', desc: true, limit: 300 });
  const rows = q.rows || [];
  return <>
    <section class="hero"><h1>Audit log</h1><p class="muted">Every correction to attendance or grades, permission change and content change, with who, when and why.</p></section>
    <button class="btn" style={{ alignSelf: 'flex-start' }} onClick={() => exportXlsx({ title: 'Data corrections and audit history', columns: [{ label: 'When', get: (r) => fmtDT(r.at) }, { label: 'By', key: 'byName' }, { label: 'Role', key: 'byRole' }, { label: 'Action', key: 'action' }, { label: 'Record', key: 'target', w: 30 }, { label: 'Before', key: 'before' }, { label: 'After', key: 'after' }, { label: 'Reason', key: 'reason', w: 40 }], rows })}>Export (Excel)</button>
    <div class="tablewrap"><table><thead><tr><th>When</th><th>By</th><th>Action</th><th>Change</th><th>Reason</th></tr></thead><tbody>{rows.map((r) => <tr><td>{fmtDT(r.at)}</td><td>{r.byName}</td><td class="mono">{r.action}</td><td class="faint">{r.before ?? '–'} → {r.after ?? '–'}</td><td>{r.reason}</td></tr>)}</tbody></table></div>
    {!rows.length && <Empty>No entries yet.</Empty>}
  </>;
}
