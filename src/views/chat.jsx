import { useState, useEffect, useRef } from 'preact/hooks';
import { me, sendMessage, askAssistant, store } from '../lib/logic.js';
import { L, useQuery, Empty, Pill, ago, toast } from '../lib/ui.jsx';

export function ChatHub() {
  const [tab, setTab] = useState('assistant');
  return <>
    <section class="hero"><h1>{L('Help', 'مساعدة')}</h1><p class="muted">{L('Ask the course assistant about procedures and rubrics, or message your demonstrators.', 'اسأل المساعد التعليمي عن الخطوات والروبركس، أو راسل المعيدين.')}</p></section>
    <div class="seg" style={{ alignSelf: 'flex-start' }}><button class={tab === 'assistant' ? 'on' : ''} onClick={() => setTab('assistant')}>{L('Course assistant', 'المساعد التعليمي')}</button><button class={tab === 'dem' ? 'on' : ''} onClick={() => setTab('dem')}>{L('My demonstrators', 'المعيدون')}</button></div>
    {tab === 'assistant' ? <Assistant embedded /> : <Thread studentUid={me().uid} section={me().section} />}
  </>;
}

export function Thread({ studentUid, section }) {
  const u = me();
  const msgs = useQuery('messages', [['uid', '==', studentUid]], { orderBy: 'at' });
  const [text, setText] = useState('');
  const end = useRef(null);
  useEffect(() => { end.current && end.current.scrollIntoView({ block: 'nearest' }); }, [msgs.rows && msgs.rows.length]);
  useEffect(() => { for (const m of msgs.rows || []) if (!m.read && m.from !== u.uid) store().update('messages', m.id, { read: true }).catch(() => {}); }, [msgs.rows && msgs.rows.length]);
  const send = async (e) => { e.preventDefault(); if (!text.trim()) return; await sendMessage(studentUid, section, text); setText(''); };
  return <section class="card">
    <div class="chat">{(msgs.rows || []).length ? msgs.rows.map((m) => <div class={'bubble' + (m.from === u.uid ? ' me' : '')}><span dir="auto">{m.text}</span><div class="meta">{m.fromName} · {ago(m.at)}</div></div>) : <Empty>{u.role === 'student' ? L('No messages yet. Your demonstrators for this section will see what you send.', 'لا توجد رسائل. سيرى معيدو السكشن ما ترسله.') : L('No messages.', 'لا توجد رسائل.')}</Empty>}<div ref={end} /></div>
    <form class="row" onSubmit={send}><input id="thread-input" value={text} onInput={(e) => setText(e.target.value)} placeholder={L('Write a message', 'اكتب رسالة')} style={{ flex: 1, minWidth: 180 }} dir="auto" /><button class="btn primary" disabled={!text.trim()}>{L('Send', 'إرسال')}</button></form>
    {u.role === 'student' && <p class="faint">{L('For questions about your work. Do not share passwords, phone numbers or medical information.', 'للأسئلة المتعلقة بعملك. لا تشارك كلمات مرور أو أرقام هواتف أو بيانات طبية.')}</p>}
  </section>;
}

export function Messages() {
  const u = me();
  const scope = u.role === 'director' || u.role === 'admin' ? [] : [['section', 'in', (u.sections && u.sections.length ? u.sections : [0]).slice(0, 10)]];
  const msgs = useQuery('messages', scope, { orderBy: 'at', desc: true, limit: 400 });
  const [open, setOpen] = useState(null);
  const threads = {};
  for (const m of msgs.rows || []) { const t = threads[m.uid] = threads[m.uid] || { uid: m.uid, section: m.section, last: m, unread: 0, name: null }; if (m.fromRole === 'student') t.name = m.fromName; if (!m.read && m.fromRole === 'student') t.unread++; }
  const list = Object.values(threads).sort((a, b) => b.last.at - a.last.at);
  if (open) return <><button class="btn ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setOpen(null)}>← {L('All conversations', 'كل المحادثات')}</button><h2>{open.name || open.uid} <span class="faint">· Section {open.section}</span></h2><Thread studentUid={open.uid} section={open.section} /></>;
  return <>
    <section class="hero"><h1>{L('Messages', 'الرسائل')}</h1><p class="muted">{u.role === 'director' ? 'All sections.' : `Sections ${(u.sections || []).join(', ')}.`} Students message their section's demonstrators here.</p></section>
    <section class="card"><div class="list">{list.length ? list.map((t) => <div class="item click" onClick={() => setOpen(t)}><div class="grow"><b>{t.name || t.uid}</b> <span class="faint">· Section {t.section}</span><div class="muted" style={{ fontSize: '.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} dir="auto">{t.last.fromRole !== 'student' ? '↪ ' : ''}{t.last.text}</div></div><div class="stack" style={{ alignItems: 'flex-end', gap: 4 }}><span class="faint">{ago(t.last.at)}</span>{t.unread > 0 && <Pill kind="warn">{t.unread} new</Pill>}</div></div>) : <Empty>No messages yet.</Empty>}</div></section>
  </>;
}

const STARTERS = [
  ['What should I bring to the next lab?', 'ماذا أحضر معي في اللاب القادم؟'],
  ['How do I take the Prep Lens photo?', 'كيف ألتقط صورة Prep Lens؟'],
  ['What makes a Class II composite preparation 9–10?', 'ما مواصفات تحضير Class II composite للدرجة ٩–١٠؟'],
  ['How is attendance recorded?', 'كيف يُسجل الحضور؟'],
];

export function Assistant({ embedded }) {
  const [hist, setHist] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const ask = async (q) => {
    const hh = [...hist, { role: 'user', text: q }]; setHist(hh); setText(''); setBusy(true);
    try { const r = await askAssistant(hh); setHist([...hh, { role: 'assistant', text: r.text }]); }
    catch (e) { setHist([...hh, { role: 'assistant', text: L('The assistant is unavailable right now. Ask your demonstrator, or try again later.', 'المساعد غير متاح الآن. اسأل المعيد أو حاول لاحقًا.'), err: true }]); }
    setBusy(false);
  };
  return <>
    {!embedded && <section class="hero"><h1>{L('Course assistant', 'المساعد التعليمي')}</h1><p class="muted">Answers from the approved course material. It never records attendance, gives grades or approves requirements.</p></section>}
    <section class="card">
      <div class="chat">{hist.length ? hist.map((m) => <div class={'bubble' + (m.role === 'user' ? ' me' : '')} dir="auto">{m.text}</div>) : <div class="stack"><p class="muted">{L('Try one of these:', 'جرّب أحد هذه الأسئلة:')}</p><div class="row">{STARTERS.map(([en, ar]) => <button class="btn sm" onClick={() => ask(L(en, ar))}>{L(en, ar)}</button>)}</div></div>}
        {busy && <div class="bubble faint">{L('Thinking…', 'جارٍ التفكير…')}</div>}</div>
      <form class="row" onSubmit={(e) => { e.preventDefault(); text.trim() && ask(text.trim()); }}><input id="assistant-input" value={text} onInput={(e) => setText(e.target.value)} placeholder={L('Ask about procedures, instruments, rubrics…', 'اسأل عن الخطوات والأدوات والروبركس…')} style={{ flex: 1, minWidth: 180 }} dir="auto" /><button class="btn primary" disabled={busy || !text.trim()}>{L('Ask', 'اسأل')}</button></form>
      <p class="faint">{L('Educational guidance only. Follow your demonstrator and the approved rubric if an answer conflicts, and report it to the Course Director. Do not enter personal or medical information.', 'إرشاد تعليمي فقط. اتبع المعيد والروبرك المعتمد عند التعارض وأبلغ مدير المقرر. لا تُدخل بيانات شخصية أو طبية.')}</p>
    </section>
  </>;
}
