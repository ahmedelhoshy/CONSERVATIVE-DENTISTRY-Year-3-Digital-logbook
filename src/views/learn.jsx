import { useState } from 'preact/hooks';
import { today, me, currentWeek } from '../lib/logic.js';
import { SECTION_OF, PTYPE_OF, ATLAS_CATS } from '../lib/materials.js';
import { L, useQuery, Pill, Empty, fmtDate, Band } from '../lib/ui.jsx';
import { LECTURES, ORIENTATION_EXERCISES, PRACTICAL_WEEKS } from '../data/course.js';
import { RUBRICS, GENERAL_GRADING, GRADING_NOTE } from '../data/rubrics.js';
import ATLAS from '../data/atlas.json';

export function Learn() {
  const [tab, setTab] = useState('lectures');
  const mats = useQuery('materials', []);
  const rows = mats.rows || [];
  const tabs = [['lectures', L('Lectures', 'المحاضرات')], ['practical', L('Practical', 'العملي')], ['links', L('Helpful links', 'روابط مفيدة')], ['atlas', L('Atlas', 'الأطلس')], ['rubrics', L('Rubrics', 'الروبركس')]];
  return <>
    <section class="hero"><h1>{L('Learning resources', 'المواد التعليمية')}</h1><p class="muted">{L('Lectures with their question banks, practical material by week, helpful links, the atlas of reference pictures and the official rubrics.', 'المحاضرات وبنوك الأسئلة، والعملي حسب الأسبوع، وروابط مفيدة، وأطلس الصور المرجعية، والروبركس الرسمية.')}</p></section>
    <div class="seg" role="tablist" style={{ alignSelf: 'flex-start', flexWrap: 'wrap' }}>{tabs.map(([k, l]) => <button role="tab" class={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
    {tab === 'lectures' && <Lectures rows={rows.filter((m) => SECTION_OF(m) === 'lecture')} pics={rows.filter((m) => SECTION_OF(m) === 'atlas' && m.lectureNo)} />}
    {tab === 'practical' && <Practical rows={rows.filter((m) => SECTION_OF(m) === 'practical')} />}
    {tab === 'links' && <Links rows={rows.filter((m) => SECTION_OF(m) === 'link')} />}
    {tab === 'atlas' && <Atlas uploaded={rows.filter((m) => SECTION_OF(m) === 'atlas')} />}
    {tab === 'rubrics' && <Rubrics />}
  </>;
}

const openBtn = (m, label) => m.url && <a class="btn" href={m.url} target="_blank" rel="noopener">{label || L('Open', 'افتح')}</a>;

function Lectures({ rows, pics = [] }) {
  const t = today();
  const [big, setBig] = useState(null);
  const byNo = {}; for (const m of rows) (byNo[m.lectureNo || 0] = byNo[m.lectureNo || 0] || []).push(m);
  const general = byNo[0] || [];
  return <div class="stack">
    {general.length > 0 && <section class="card"><h2>{L('Course material', 'مواد المقرر')}</h2><div class="list">{general.map((m) => <div class="item"><div class="grow"><b dir="auto">{m.title}</b>{m.body && <p class="muted" dir="auto">{m.body}</p>}</div>{openBtn(m)}</div>)}</div></section>}
    {LECTURES.map((l) => { const ms = byNo[l.n] || []; const past = l.date <= t; const main = ms[0]; return <section class="card">
      <div class="row between"><div><span class="eyebrow">{L('Lecture', 'محاضرة')} {l.n} · {fmtDate(l.date)}</span><h3>{main?.title?.replace(/^Lecture \d+ — /, '') || l.title}</h3><p class="faint">{l.lecturer}</p></div>
        {main?.url ? <a class="btn primary" href={main.url} target="_blank" rel="noopener">{L('Open lecture', 'افتح المحاضرة')}</a> : <Pill>{past ? L('Slides not uploaded yet', 'لم تُرفع بعد') : L('Upcoming', 'قادمة')}</Pill>}</div>
      {ms.slice(1).map((m) => <div class="row between"><span dir="auto">{m.title}</span>{openBtn(m)}</div>)}
      {ms.filter((m) => m.qbank).map((m) => <details><summary>{L('Question bank', 'بنك الأسئلة')}</summary><ol style={{ margin: '8px 0 0', paddingInlineStart: 20 }} dir="auto">{m.qbank.split('\n').filter(Boolean).map((q) => <li>{q}</li>)}</ol><p class="faint">{L('Answer in your notebook and bring unclear points to the next session.', 'أجب في كشكولك وناقش النقاط غير الواضحة في اللقاء التالي.')}</p></details>)}
      {pics.some((p) => p.lectureNo === l.n) && <details open={l.date <= t}><summary>{L('Pictures', 'صور')} ({pics.filter((p) => p.lectureNo === l.n).length})</summary><div class="atlas" style={{ marginTop: 8 }}>{pics.filter((p) => p.lectureNo === l.n).map((p) => <figure onClick={() => setBig(p)}><img loading="lazy" src={p.url} alt={p.title} /><figcaption><b>{p.category}</b><span class="faint" dir="auto">{p.title}</span></figcaption></figure>)}</div></details>}
      {l.note && <p class="faint">{l.note}</p>}
    </section>; })}
    {big && <div class="lightbox" onClick={() => setBig(null)} role="dialog" aria-label={big.title}><div><img src={big.url} alt={big.title} /><div class="cap" dir="auto">{big.title} · {big.category}</div></div></div>}</div>;
}

const PTYPE_L = () => ({ video: L('Demonstration video', 'فيديو شرح'), guide: L('Practical guide', 'دليل عملي'), link: L('Practical link', 'رابط عملي') });
function Practical({ rows }) {
  const cur = currentWeek().w;
  const byW = {}; for (const m of rows.sort((a, b) => (a.order || 0) - (b.order || 0))) (byW[m.week || 0] = byW[m.week || 0] || []).push(m);
  const pl = PTYPE_L();
  const list = (ms) => <div class="list">{ms.map((m) => <div class="item"><div class="grow"><b dir="auto">{m.title}</b>{m.body && <p class="muted" style={{ fontSize: '.88rem' }} dir="auto">{m.body}</p>}<div class="faint">{pl[PTYPE_OF(m)]}</div></div>{openBtn(m)}</div>)}</div>;
  const weeks = PRACTICAL_WEEKS.filter((w) => byW[w.w] || w.w === cur);
  return <div class="stack">
    {(byW[0] || []).length > 0 && <section class="card"><h2>{L('For all practical weeks', 'لكل أسابيع العملي')}</h2>{list(byW[0])}</section>}
    {weeks.map((w) => <section class={'card' + (w.w === cur ? ' lead' : '')}><span class="eyebrow">{L(`Week ${w.w}`, `الأسبوع ${w.w}`)} · {fmtDate(w.from, { day: 'numeric', month: 'short' })}{w.w === cur ? ' · ' + L('this week', 'هذا الأسبوع') : ''}</span><h3>{w.topic}</h3>
      {byW[w.w] ? list(byW[w.w]) : <p class="faint">{L('No material added for this week yet.', 'لم تُضف مواد لهذا الأسبوع بعد.')}</p>}</section>)}
    <section class="card"><h2>{L('Orientation: manual-control exercises', 'التهيئة: تدريبات التحكم اليدوي')}</h2><ol class="steps">{ORIENTATION_EXERCISES.map((x) => <li><div><b>{x.title}</b><div class="faint">{L('Demonstrator checks', 'يتحقق المعيد من')}: {x.checks.join(' · ')}</div></div></li>)}</ol></section>
  </div>;
}

function Links({ rows }) {
  const ms = rows.sort((a, b) => (a.order || 0) - (b.order || 0));
  return <section class="card"><h2>{L('Helpful links', 'روابط مفيدة')}</h2><div class="list">{ms.length ? ms.map((m) => <div class="item"><div class="grow"><b dir="auto">{m.title}</b>{m.body && <p class="muted" style={{ fontSize: '.88rem' }} dir="auto">{m.body}</p>}</div>{openBtn(m)}</div>) : <Empty>{L('No links added yet.', 'لم تُضف روابط بعد.')}</Empty>}</div></section>;
}

const atlasSrc = (id) => (window.__ATLAS && window.__ATLAS[id]) || `./atlas/${id}.jpg`;

export function Atlas({ uploaded = [] }) {
  const up = uploaded.map((m) => ({ id: m.id, src: m.url, caption: m.title, category: m.category, dept: true }))
    .sort((a, b) => ATLAS_CATS.indexOf(a.category) - ATLAS_CATS.indexOf(b.category));
  const fac = ATLAS.map((a) => ({ ...a, src: atlasSrc(a.id), category: L('Faculty atlas', 'أطلس الكلية') + ' · ' + a.category }));
  const all = [...up, ...fac];
  const cats = [...new Set(all.map((a) => a.category))];
  const [cat, setCat] = useState('all');
  const [big, setBig] = useState(null);
  const list = all.filter((a) => cat === 'all' || a.category === cat);
  return <section class="stack">
    <p class="muted">{L('Reference pictures of each cavity class. Match each example to your assigned tooth and preparation design. The atlas shows approved examples; it does not grade work.', 'صور مرجعية لكل نوع من التحضيرات. طابق كل مثال مع السن والتحضير المطلوب. الأطلس لا يعطي درجات.')}</p>
    <div class="row"><select id="atlas-cat" value={cat} onChange={(e) => setCat(e.target.value)} style={{ maxWidth: 360 }}><option value="all">{L('All pictures', 'كل الصور')} ({all.length})</option>{cats.map((c) => <option value={c}>{c} ({all.filter((a) => a.category === c).length})</option>)}</select></div>
    <div class="atlas">{list.map((a) => <figure onClick={() => setBig(a)}><img loading="lazy" src={a.src} alt={`${a.caption} — ${a.category}`} /><figcaption><b class={a.dept ? '' : 'mono'}>{a.dept ? a.category : a.id}</b><span class="faint" dir="auto">{a.caption}</span></figcaption></figure>)}</div>
    {big && <div class="lightbox" onClick={() => setBig(null)} role="dialog" aria-label={big.caption}><div><img src={big.src} alt={big.caption} /><div class="cap" dir="auto">{big.caption} · {big.category}</div></div></div>}
  </section>;
}

export function Rubrics() {
  const [id, setId] = useState(RUBRICS[0].id);
  const r = RUBRICS.find((x) => x.id === id);
  return <section class="stack">
    <select id="rubric-pick" value={id} onChange={(e) => setId(e.target.value)} style={{ maxWidth: 460 }}>{[1, 2].map((t) => <optgroup label={t === 1 ? 'First term — cavity preparations' : 'Second term — restorations'}>{RUBRICS.filter((x) => x.term === t).map((x) => <option value={x.id}>{x.title}</option>)}</optgroup>)}</select>
    {r.needsConfirmation && <p class="faint">{r.source}</p>}
    <div class="tablewrap"><table><thead><tr><th>{L('Criterion', 'المعيار')}</th>{r.bands.map((b) => <th><Band k={b.key} /> {b.label}</th>)}<th>{L('From a photo', 'من الصورة')}</th></tr></thead>
      <tbody>{r.criteria.map((c) => <tr><td><b>{c.name}</b><div class="faint">{c.group}{c.weight ? ` · ${c.weight} mark(s)` : ''}</div></td>{c.bands.map((d) => <td>{d}</td>)}<td>{{ yes: <Pill kind="good">visible</Pill>, partial: <Pill kind="warn">partly</Pill>, no: <Pill>tooth only</Pill> }[c.photo]}</td></tr>)}</tbody></table></div>
    <details><summary>{L('General grading system', 'نظام التقييم العام')}</summary><div class="list">{GENERAL_GRADING.map((g) => <div class="item"><b class="mono" style={{ minWidth: 64 }}>{g.grade}</b><span>{g.text}</span></div>)}</div><p class="faint">{GRADING_NOTE}</p></details>
  </section>;
}
