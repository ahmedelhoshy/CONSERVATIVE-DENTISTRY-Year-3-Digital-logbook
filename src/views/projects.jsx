// Group projects (Lab 2): each of the 18 groups has one project, supervised by one lecturer and one demonstrator.
// The platform keeps only the group number, the project title, the two supervisors and the group's Lab 2 time.
import { useState } from 'preact/hooks';
import * as XLSX from 'xlsx';
import { me, store, canEditCourse } from '../lib/logic.js';
import { L, useQuery, Sheet, Pill, toast } from '../lib/ui.jsx';
import { LAB_SLOTS } from '../data/course.js';

const GROUPS = Array.from({ length: 18 }, (_, i) => i + 1);
const DAY = { Sat: ['Saturday', 'السبت'], Sun: ['Sunday', 'الأحد'], Mon: ['Monday', 'الإثنين'], Tue: ['Tuesday', 'الثلاثاء'], Wed: ['Wednesday', 'الأربعاء'], Thu: ['Thursday', 'الخميس'] };
// Lab 2 of each section is the project / discussion lab (group number = section number).
export function lab2Time(g) {
  const s = (LAB_SLOTS[g] || [])[1];
  return s ? L(`${DAY[s[0]][0]} ${s[1]}–${s[2]}`, `${DAY[s[0]][1]} ${s[1]}–${s[2]}`) : '—';
}

export function useProjects() {
  const q = useQuery('projects', []);
  const by = {}; for (const p of q.rows || []) by[p.group] = p;
  return by;
}

// Card on the student's home page.
export function MyProject({ section }) {
  const by = useProjects();
  if (!section) return null;
  const p = by[section];
  return <section class="card"><div class="row between"><h2>{L('My group project', 'مشروع مجموعتي')}</h2><Pill kind="info">{L(`Group ${section}`, `المجموعة ${section}`)}</Pill></div>
    {p && p.title ? <div class="list"><div class="item"><div class="grow"><b dir="auto">{p.title}</b>
      <div class="faint" dir="auto">{L('Supervisors', 'الإشراف')}: {[p.lecturer, p.demonstrator].filter(Boolean).join(' · ') || '—'}</div>
      <div class="faint">{L('Project lab (Lab 2)', 'لاب المشروع (لاب ٢)')}: {lab2Time(section)}</div></div></div></div>
      : <p class="faint">{L('Your project and supervisors will appear here once the course director adds them.', 'سيظهر مشروعك والمشرفون هنا بعد أن يضيفهم مدير المقرر.')}</p>}
  </section>;
}

// Page for staff and leadership; the course director and administrators can edit.
export function Projects() {
  const by = useProjects();
  const edit = canEditCourse(me());
  const [open, setOpen] = useState(null);
  const filled = GROUPS.filter((g) => by[g] && by[g].title).length;
  const exportX = () => {
    const rows = [['Group', 'Project title', 'Lecturer', 'Demonstrator', 'Lab 2 (project lab)'], ...GROUPS.map((g) => [g, by[g]?.title || '', by[g]?.lecturer || '', by[g]?.demonstrator || '', lab2Time(g)])];
    const wb = XLSX.utils.book_new(); const ws = XLSX.utils.aoa_to_sheet(rows); ws['!cols'] = [{ wch: 8 }, { wch: 48 }, { wch: 28 }, { wch: 28 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Projects'); XLSX.writeFile(wb, 'Group_projects.xlsx');
  };
  const importX = async (ev) => {
    const f = ev.target.files[0]; if (!f) return;
    try {
      const wb = XLSX.read(await f.arrayBuffer());
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
      const hi = rows.findIndex((r) => r.some((c) => /group/i.test(String(c))));
      const H = rows[hi].map((c) => String(c).toLowerCase());
      const col = (re) => H.findIndex((h) => re.test(h));
      const cg = col(/group/), ct = col(/project|title/), cl = col(/lecturer/), cd = col(/demonstrator/);
      let n = 0;
      for (const r of rows.slice(hi + 1)) {
        const g = Number(String(r[cg]).replace(/\D/g, '')); if (!g || g > 18) continue;
        await store().set('projects', 'g' + g, { group: g, title: String(r[ct] || '').trim(), lecturer: cl >= 0 ? String(r[cl] || '').trim() : '', demonstrator: cd >= 0 ? String(r[cd] || '').trim() : '', updatedAt: Date.now(), updatedBy: me().name });
        n++;
      }
      toast(`${n} group project(s) imported`);
    } catch (e) { toast('Not imported: ' + e.message); }
    ev.target.value = '';
  };
  return <>
    <section class="hero"><h1>{L('Group projects', 'مشاريع المجموعات')}</h1>
      <p class="muted">{L('Lab 2 each week is for discussion and project preparation. Each of the 18 groups has one project, supervised by one lecturer and one demonstrator.', 'لاب ٢ كل أسبوع للمناقشة وتحضير المشروع. لكل مجموعة من الـ١٨ مشروع واحد بإشراف محاضر ومعيد.')}</p></section>
    <div class="row">{edit && <><label class="btn primary">Import from Excel<input type="file" accept=".xlsx,.xls,.csv" onChange={importX} hidden /></label></>}<button class="btn" onClick={exportX}>{edit && filled === 0 ? 'Download template (Excel)' : 'Download (Excel)'}</button><span class="faint">{filled} / 18 {L('groups filled', 'مجموعة مكتملة')}</span></div>
    <section class="card"><div class="tablewrap"><table><thead><tr><th class="n">{L('Group', 'المجموعة')}</th><th>{L('Project', 'المشروع')}</th><th>{L('Lecturer', 'المحاضر')}</th><th>{L('Demonstrator', 'المعيد')}</th><th>{L('Project lab (Lab 2)', 'لاب المشروع')}</th>{edit && <th></th>}</tr></thead>
      <tbody>{GROUPS.map((g) => { const p = by[g] || {}; return <tr><td class="n mono">{g}</td><td dir="auto">{p.title || <span class="faint">—</span>}</td><td dir="auto">{p.lecturer || <span class="faint">—</span>}</td><td dir="auto">{p.demonstrator || <span class="faint">—</span>}</td><td class="faint">{lab2Time(g)}</td>{edit && <td><button class="btn sm" onClick={() => setOpen(g)}>Edit</button></td>}</tr>; })}</tbody></table></div>
      <p class="faint">{L('Group number = section number. Students see their own group\'s project on their home page.', 'رقم المجموعة = رقم السكشن. يرى كل طالب مشروع مجموعته في الصفحة الرئيسية.')}</p></section>
    {open && <EditProject g={open} p={by[open] || {}} onClose={() => setOpen(null)} />}
  </>;
}

function EditProject({ g, p, onClose }) {
  const [f, setF] = useState({ title: p.title || '', lecturer: p.lecturer || '', demonstrator: p.demonstrator || '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => { await store().set('projects', 'g' + g, { group: g, title: f.title.trim(), lecturer: f.lecturer.trim(), demonstrator: f.demonstrator.trim(), updatedAt: Date.now(), updatedBy: me().name }); toast('Saved'); onClose(); };
  return <Sheet onClose={onClose} label="Edit project"><h2>Group {g}</h2><p class="faint">Project lab (Lab 2): {lab2Time(g)}</p>
    <label class="fld">Project title<input id="pj-title" dir="auto" value={f.title} onInput={set('title')} /></label>
    <div class="grid2"><label class="fld">Lecturer<input id="pj-lec" dir="auto" value={f.lecturer} onInput={set('lecturer')} /></label>
      <label class="fld">Demonstrator<input id="pj-dem" dir="auto" value={f.demonstrator} onInput={set('demonstrator')} /></label></div>
    <div class="row"><button class="btn primary" onClick={save}>Save</button><button class="btn" onClick={onClose}>Cancel</button></div></Sheet>;
}
