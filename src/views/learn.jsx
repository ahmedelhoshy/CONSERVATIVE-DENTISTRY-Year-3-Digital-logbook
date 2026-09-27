import { useState } from 'preact/hooks';
import { today, me } from '../lib/logic.js';
import { L, useQuery, Pill, Empty, fmtDate, Band } from '../lib/ui.jsx';
import { LECTURES, ORIENTATION_EXERCISES } from '../data/course.js';
import { RUBRICS, GENERAL_GRADING, GRADING_NOTE } from '../data/rubrics.js';
import ATLAS from '../data/atlas.json';

export function Learn() {
  const [tab, setTab] = useState('lectures');
  const tabs = [['lectures', L('Lectures', 'المحاضرات')], ['practical', L('Videos & skills', 'فيديوهات ومهارات')], ['atlas', L('Atlas', 'الأطلس')], ['rubrics', L('Rubrics', 'الروبركس')]];
  return <>
    <section class="hero"><h1>{L('Learning resources', 'المواد التعليمية')}</h1><p class="muted">{L('Lecture slides, question banks, demonstration videos, the faculty-validated atlas and the official rubrics.', 'المحاضرات وبنوك الأسئلة وفيديوهات الشرح والأطلس المعتمد والروبركس الرسمية.')}</p></section>
    <div class="seg" role="tablist" style={{ alignSelf: 'flex-start', flexWrap: 'wrap' }}>{tabs.map(([k, l]) => <button role="tab" class={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
    {tab === 'lectures' && <Lectures />}
    {tab === 'practical' && <Practical />}
    {tab === 'atlas' && <Atlas />}
    {tab === 'rubrics' && <Rubrics />}
  </>;
}

function Lectures() {
  const mats = useQuery('materials', [['kind', '==', 'lecture']]);
  const t = today();
  const byNo = {}; for (const m of mats.rows || []) byNo[m.lectureNo] = m;
  return <div class="stack">{LECTURES.map((l) => { const m = byNo[l.n]; const past = l.date <= t; return <section class="card">
    <div class="row between"><div><span class="eyebrow">{L('Lecture', 'محاضرة')} {l.n} · {fmtDate(l.date)}</span><h3>{m?.title?.replace(/^Lecture \d+ — /, '') || l.title}</h3><p class="faint">{l.lecturer}</p></div>
      {m?.url ? <a class="btn primary" href={m.url} target="_blank" rel="noopener">{L('Open slides', 'افتح المحاضرة')}</a> : <Pill>{past ? L('Slides not uploaded yet', 'لم تُرفع بعد') : L('Upcoming', 'قادمة')}</Pill>}</div>
    {m?.qbank && <details><summary>{L('Question bank', 'بنك الأسئلة')}</summary><ol style={{ margin: '8px 0 0', paddingInlineStart: 20 }} dir="auto">{m.qbank.split('\n').filter(Boolean).map((q) => <li>{q}</li>)}</ol><p class="faint">{L('Answer in your notebook and bring unclear points to the next session.', 'أجب في كشكولك وناقش النقاط غير الواضحة في اللقاء التالي.')}</p></details>}
    {l.note && <p class="faint">{l.note}</p>}
  </section>; })}</div>;
}

function Practical() {
  const mats = useQuery('materials', [['kind', 'in', ['video', 'link', 'skill']]]);
  const rows = (mats.rows || []).sort((a, b) => (a.order || 0) - (b.order || 0));
  return <div class="stack">
    <section class="card"><h2>{L('Orientation: manual-control exercises', 'التهيئة: تدريبات التحكم اليدوي')}</h2><ol class="steps">{ORIENTATION_EXERCISES.map((x) => <li><div><b>{x.title}</b><div class="faint">{L('Demonstrator checks', 'يتحقق المعيد من')}: {x.checks.join(' · ')}</div></div></li>)}</ol></section>
    <section class="card"><h2>{L('Demonstration videos and links', 'فيديوهات الشرح والروابط')}</h2><div class="list">{rows.length ? rows.map((m) => <div class="item"><div class="grow"><b>{m.title}</b>{m.body && <p class="muted" style={{ fontSize: '.88rem' }}>{m.body}</p>}<div class="faint">{{ video: L('Demonstration video', 'فيديو شرح'), link: L('Recommended link', 'رابط مقترح'), skill: L('Practical skill', 'مهارة عملية') }[m.kind]}</div></div>{m.url && <a class="btn" href={m.url} target="_blank" rel="noopener">{L('Open', 'افتح')}</a>}</div>) : <Empty>{L('No videos added yet.', 'لم تُضف فيديوهات بعد.')}</Empty>}</div></section>
  </div>;
}

export function Atlas() {
  const cats = [...new Set(ATLAS.map((a) => a.category))];
  const [cat, setCat] = useState('all');
  const [big, setBig] = useState(null);
  const list = ATLAS.filter((a) => cat === 'all' || a.category === cat);
  return <section class="stack">
    <p class="muted">{L('Faculty-validated reference photographs. Match each example to your assigned tooth and preparation design. The atlas shows approved examples; it does not grade work.', 'صور مرجعية معتمدة من الكلية. طابق كل مثال مع السن والتحضير المطلوب. الأطلس لا يعطي درجات.')}</p>
    <div class="row"><select id="atlas-cat" value={cat} onChange={(e) => setCat(e.target.value)} style={{ maxWidth: 320 }}><option value="all">{L('All categories', 'كل الفئات')} ({ATLAS.length})</option>{cats.map((c) => <option value={c}>{c} ({ATLAS.filter((a) => a.category === c).length})</option>)}</select></div>
    <div class="atlas">{list.map((a) => <figure onClick={() => setBig(a)}><img loading="lazy" src={`./atlas/${a.id}.jpg`} alt={`${a.caption} — ${a.category}`} /><figcaption><b class="mono">{a.id}</b><span class="faint">{a.caption}</span></figcaption></figure>)}</div>
    {big && <div class="lightbox" onClick={() => setBig(null)} role="dialog" aria-label={big.caption}><div><img src={`./atlas/${big.id}.jpg`} alt={big.caption} /><div class="cap"><b>{big.id}</b> · {big.caption} · {big.category}</div></div></div>}
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
