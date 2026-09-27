import { useState } from 'preact/hooks';
import { me, store, today, audit, isDemo, currentWeek } from '../lib/logic.js';
import { L, useQuery, useDoc, Pill, Sheet, Empty, Confirm, fmtDate, fmtDT, toast } from '../lib/ui.jsx';
import { exportXlsx, readRosterFile, parseRoster } from '../lib/export.js';
import { LECTURES, PRACTICAL_WEEKS, LAB_SLOTS, LAB_SLOT_NOTES } from '../data/course.js';
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
  const rows = (q.rows || []).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  return <>
    <section class="hero"><h1>Sessions</h1><p class="muted">Lectures and labs with their attendance windows. Generate the whole term from the timetable once, then adjust single sessions.</p></section>
    <div class="row"><label class="fld" style={{ maxWidth: 360 }}>Practical week<select id="sa-week" value={week} onChange={(e) => setWeek(e.target.value)}>{PRACTICAL_WEEKS.map((x) => <option value={x.w}>Week {x.w} · {fmtDate(x.from, { day: 'numeric', month: 'short' })} — {x.topic.slice(0, 48)}</option>)}</select></label>
      <button class="btn" style={{ alignSelf: 'flex-end' }} onClick={() => setAdding(true)}>+ Add session</button><button class="btn" style={{ alignSelf: 'flex-end' }} onClick={() => setGen(true)}>Generate term from timetable</button></div>
    <p class="faint">{w.topic} · {w.req} requirement(s){w.exam ? ' · practical exam week' : ''}</p>
    <div class="tablewrap"><table><thead><tr><th>Date</th><th>Time</th><th>Session</th><th>Status</th></tr></thead><tbody>
      {rows.map((s) => <tr class="click" onClick={() => setOpen(s.id)}><td>{fmtDate(s.date)}</td><td class="mono">{s.start}–{s.end}</td><td>{s.type === 'lecture' ? `Lecture ${s.lectureNo} — ${s.title}` : `Lab · Section ${s.section}`}</td><td><Pill kind={s.status === 'open' ? 'good' : s.status === 'closed' ? '' : 'info'}>{s.status}</Pill></td></tr>)}
    </tbody></table></div>
    {!rows.length && <Empty>No sessions in this week yet. Use “Generate term from timetable”.</Empty>}
    {LAB_SLOT_NOTES.map((n) => <p class="faint">⚠ {n}</p>)}
    {open && <SessionPanel id={open} onClose={() => setOpen(null)} />}
    {adding && <AddSession onClose={() => setAdding(false)} />}
    {gen && <Confirm text="Create all lecture and lab sessions for term 1 from the curriculum and timetable? Existing sessions are kept." yes="Generate" onNo={() => setGen(false)} onYes={async () => { const n = await generateTerm(); setGen(false); toast(`${n} sessions created`); }} />}
  </>;
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
      if (!(await S.get('sessions', id))) { await S.set('sessions', id, { type: 'lab', section: sec, week: w.w, date: dates[i].date, start: dates[i].start, end: dates[i].end, title: w.topic, status: 'scheduled', req: w.req }); n++; }
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
export function Content() {
  const q = useQuery('materials', [], { orderBy: 'order' });
  const [edit, setEdit] = useState(null);
  const rows = q.rows || [];
  const lecNos = new Set(rows.filter((m) => m.kind === 'lecture').map((m) => m.lectureNo));
  const t = today();
  const missing = LECTURES.filter((l) => l.date <= t && !lecNos.has(l.n));
  return <>
    <section class="hero"><h1>Learning materials</h1><p class="muted">Paste the share link of each file (Google Drive, OneDrive, YouTube). Replacing a link keeps the same entry, so students never see a broken item.</p></section>
    {missing.length > 0 && <div class="state pending"><b>{missing.length} past lecture(s) without slides</b><p>{missing.map((l) => `Lecture ${l.n}`).join(', ')}</p></div>}
    <button class="btn primary" style={{ alignSelf: 'flex-start' }} onClick={() => setEdit({ kind: 'lecture', order: rows.length + 1 })}>+ Add material</button>
    <section class="card"><div class="list">{rows.map((m) => <div class="item"><div class="grow"><b>{m.title}</b><div class="faint">{m.kind}{m.lectureNo ? ` · lecture ${m.lectureNo}` : ''}{m.qbank ? ' · question bank' : ''} · updated {fmtDate(m.updatedAt, { day: 'numeric', month: 'short' })}</div>{m.url ? <a class="faint" href={m.url} target="_blank" rel="noopener">{m.url.slice(0, 70)}</a> : m.kind !== 'skill' && <Pill kind="bad">No link</Pill>}</div><button class="btn sm" onClick={() => setEdit(m)}>Edit</button></div>)}</div></section>
    {edit && <MaterialSheet m={edit} onClose={() => setEdit(null)} />}
  </>;
}
export function driveFix(url) {
  // Turn Google Drive "view" links into "preview" links that open cleanly on phones.
  const m = /drive\.google\.com\/file\/d\/([^/]+)/.exec(url || '');
  return m ? `https://drive.google.com/file/d/${m[1]}/preview` : url;
}
function MaterialSheet({ m, onClose }) {
  const [f, setF] = useState({ kind: 'lecture', title: '', url: '', qbank: '', body: '', lectureNo: '', order: 1, ...m });
  const [del, setDel] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    if (f.url && !/^https:\/\//.test(f.url)) { toast('Links must start with https://'); return; }
    const data = { kind: f.kind, title: f.title.trim(), url: driveFix(f.url.trim()), qbank: f.qbank || '', body: f.body || '', lectureNo: f.kind === 'lecture' ? Number(f.lectureNo) || null : null, order: Number(f.order) || 0, updatedAt: Date.now(), updatedBy: me().name };
    if (m.id) await store().update('materials', m.id, data); else await store().add('materials', data);
    await audit('materials.save', m.id || data.title, m.url || null, data.url, '');
    toast('Saved — students see it now'); onClose();
  };
  return <Sheet onClose={onClose}><h2>{m.id ? 'Edit material' : 'Add material'}</h2>
    <div class="grid2"><label class="fld">Kind<select id="mt-kind" value={f.kind} onChange={set('kind')}><option value="lecture">Lecture slides</option><option value="video">Demonstration video</option><option value="link">Helpful link</option><option value="skill">Practical skill</option></select></label>
      {f.kind === 'lecture' ? <label class="fld">Lecture number<select id="mt-lec" value={f.lectureNo} onChange={(e) => { const l = LECTURES.find((x) => x.n === Number(e.target.value)); setF({ ...f, lectureNo: e.target.value, title: f.title || (l ? `Lecture ${l.n} — ${l.title}` : '') }); }}><option value="">Choose</option>{LECTURES.map((l) => <option value={l.n}>Lecture {l.n} — {l.title}</option>)}</select></label> : <label class="fld">Order<input id="mt-order" type="number" value={f.order} onInput={set('order')} /></label>}</div>
    <label class="fld">Title<input id="mt-title" value={f.title} onInput={set('title')} /></label>
    <label class="fld">Link (https://…)<input id="mt-url" type="url" value={f.url} onInput={set('url')} placeholder="https://drive.google.com/file/d/…/view" /></label>
    <p class="faint">Google Drive: set sharing to “Anyone with the link — Viewer”. View links are converted to preview links automatically.</p>
    {f.kind === 'lecture' && <label class="fld">Question bank (one question per line)<textarea id="mt-qbank" value={f.qbank} onInput={set('qbank')} dir="auto" /></label>}
    {f.kind === 'skill' && <label class="fld">Instructions<textarea id="mt-body" value={f.body} onInput={set('body')} dir="auto" /></label>}
    <div class="row"><button class="btn primary" disabled={!f.title.trim()} onClick={save}>Save</button><button class="btn" onClick={onClose}>Cancel</button>{m.id && <button class="btn danger" onClick={() => setDel(true)}>Delete</button>}</div>
    {del && <Confirm text={`Delete “${f.title}”? Students will no longer see it.`} yes="Delete" onNo={() => setDel(false)} onYes={async () => { await store().del('materials', m.id); await audit('materials.delete', m.id, f.title, null, ''); onClose(); }} />}
  </Sheet>;
}

// ---------------- Announcements ----------------
export function Announcements() {
  const q = useQuery('announcements', [], { orderBy: 'publishAt', desc: true });
  const [edit, setEdit] = useState(null);
  return <>
    <section class="hero"><h1>Announcements</h1><p class="muted">Posted announcements appear on students' home screen immediately (or at the scheduled time).</p></section>
    <button class="btn primary" style={{ alignSelf: 'flex-start' }} onClick={() => setEdit({})}>+ New announcement</button>
    <section class="card"><div class="list">{(q.rows || []).map((a) => <div class="item"><div class="grow"><b dir="auto">{a.title}</b> {a.pinned && <Pill kind="gold">Pinned</Pill>} {a.publishAt > Date.now() && !isDemo() && <Pill kind="info">Scheduled</Pill>}<div class="faint">{{ students: 'All students', staff: 'Staff only', all: 'Everyone', sections: `Sections ${(a.sections || []).join(', ')}` }[a.audience]} · {fmtDT(a.publishAt)} · {a.byName}</div><p class="muted" style={{ fontSize: '.88rem', whiteSpace: 'pre-wrap' }} dir="auto">{a.body}</p></div><button class="btn sm" onClick={() => setEdit(a)}>Edit</button></div>)}</div></section>
    {edit && <AnnSheet a={edit} onClose={() => setEdit(null)} />}
  </>;
}
function AnnSheet({ a, onClose }) {
  const [f, setF] = useState({ title: '', body: '', audience: 'students', sections: [], pinned: false, when: '', ...a });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    const publishAt = f.when ? new Date(f.when).getTime() : a.publishAt || Date.now();
    const data = { title: f.title.trim(), body: f.body.trim(), audience: f.audience, sections: f.audience === 'sections' ? f.sections.map(Number) : [], pinned: !!f.pinned, publishAt, by: me().uid, byName: me().name };
    if (a.id) await store().update('announcements', a.id, data); else await store().add('announcements', data);
    toast('Announcement saved'); onClose();
  };
  return <Sheet onClose={onClose}><h2>{a.id ? 'Edit announcement' : 'New announcement'}</h2>
    <label class="fld">Title<input id="an-title" value={f.title} onInput={set('title')} dir="auto" /></label>
    <label class="fld">Message<textarea id="an-body" value={f.body} onInput={set('body')} dir="auto" style={{ minHeight: 120 }} /></label>
    <div class="grid2"><label class="fld">Audience<select id="an-aud" value={f.audience} onChange={set('audience')}><option value="students">All students</option><option value="sections">Selected sections</option><option value="staff">Staff only</option><option value="all">Everyone</option></select></label>
      <label class="fld">Publish at (empty = now)<input id="an-when" type="datetime-local" value={f.when} onInput={set('when')} /></label></div>
    {f.audience === 'sections' && <div class="row">{Array.from({ length: 18 }, (_, i) => i + 1).map((s) => <label class="pill" style={{ cursor: 'pointer' }}><input type="checkbox" checked={f.sections.includes(s)} onChange={(e) => setF({ ...f, sections: e.target.checked ? [...f.sections, s] : f.sections.filter((x) => x !== s) })} /> S{s}</label>)}</div>}
    <label class="row"><input id="an-pin" type="checkbox" checked={f.pinned} onChange={(e) => setF({ ...f, pinned: e.target.checked })} /> Pin to the top</label>
    <div class="row"><button class="btn primary" disabled={!f.title.trim() || !f.body.trim()} onClick={save}>Publish</button><button class="btn" onClick={onClose}>Cancel</button>{a.id && <button class="btn danger" onClick={async () => { await store().del('announcements', a.id); onClose(); }}>Delete</button>}</div></Sheet>;
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
    const S = store(); let n = 0;
    for (const s of preview.students) {
      if (!s.email) continue;
      await S.set('users', s.email, { uid: s.code, code: s.code, name: s.name, email: s.email, section: s.section, status: s.status, role: 'student' }, { merge: true }); n++;
    }
    await audit('roster.import', 'students', null, `${n} students`, 'Roster import');
    toast(`${n} students imported`); setPreview(null);
  };
  const byRole = (r) => (staff.rows || []).filter((x) => x.role === r);
  return <>
    <section class="hero"><h1>People and permissions</h1><p class="muted">Only emails on this list can sign in. Students see only their own records; each staff role sees what it needs.</p></section>
    <section class="card"><div class="row between"><div><h2>Students</h2><p class="faint">{(counts.rows || []).length} on the roster</p></div>
      <label class="btn primary">Import roster (Excel)<input id="roster-file" type="file" accept=".xlsx,.xls,.csv" hidden onChange={onFile} /></label></div>
      <p class="faint">Columns needed: student number (الكود), name (الاسم), university email, and section (1–18). Arabic or English headers are recognised. The file stays on your computer; only the rows are saved.</p>
      {preview && <div class="stack"><div class="state info"><b>{preview.students.length} students found</b><p>{preview.problems.length ? `${preview.problems.length} rows need attention (missing email or section) and will be skipped: ${preview.problems.slice(0, 6).join('; ')}${preview.problems.length > 6 ? '…' : ''}` : 'All rows have email and section.'}</p></div>
        <div class="row"><button class="btn primary" disabled={!preview.students.some((s) => s.email)} onClick={importNow}>Import {preview.students.filter((s) => s.email).length} students</button><button class="btn" onClick={() => setPreview(null)}>Cancel</button></div></div>}
    </section>
    <section class="card"><div class="row between"><h2>Staff</h2><button class="btn" onClick={() => setEdit({ role: 'demonstrator', sections: [], lectures: [] })}>+ Add staff</button></div>
      {['director', 'hod', 'vicedean', 'lecturer', 'demonstrator', 'admin'].map((r) => byRole(r).length > 0 && <div class="stack"><span class="eyebrow">{{ director: 'Course Director', hod: 'Head of Department', vicedean: 'Vice Dean — Student Affairs', lecturer: 'Lecturers', demonstrator: 'Demonstrators', admin: 'Administrators' }[r]}</span>
        <div class="list">{byRole(r).map((s) => <div class="item"><div class="grow"><b>{s.name}</b><div class="faint">{s.email}{s.sections?.length ? ` · sections ${s.sections.join(', ')}` : ''}{s.lectures?.length ? ` · lectures ${s.lectures.join(', ')}` : ''}</div></div><button class="btn sm" onClick={() => setEdit(s)}>Edit</button></div>)}</div></div>)}
    </section>
    {edit && <StaffSheet s={edit} onClose={() => setEdit(null)} />}
  </>;
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
    <label class="fld">Role<select id="sf-role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="demonstrator">Demonstrator / TA</option><option value="lecturer">Lecturer / lab supervisor</option><option value="director">Course Director</option><option value="hod">Head of Department</option><option value="vicedean">Vice Dean — Student Affairs</option><option value="admin">Administrator</option></select></label>
    {['demonstrator', 'lecturer'].includes(f.role) && <><span class="eyebrow">Sections</span><div class="row">{Array.from({ length: 18 }, (_, i) => i + 1).map((x) => <label class="pill" style={{ cursor: 'pointer' }}><input type="checkbox" checked={f.sections.includes(x)} onChange={() => toggle('sections', x)} /> S{x}</label>)}</div></>}
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
