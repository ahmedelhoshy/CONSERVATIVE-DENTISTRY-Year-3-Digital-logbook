import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import './styles.css';
import { demoStore } from './lib/store-demo.js';
import { setStore, setMe, me, isDemo, store, deepLink } from './lib/logic.js';
import { L, useLang, setLang, lang, Icon, toast } from './lib/ui.jsx';
import { COURSE } from './data/course.js';
import { DEMO_TODAY } from './lib/demo-seed.js';
import { StudentHome, Attend, MyLab } from './views/student.jsx';
import { Learn } from './views/learn.jsx';
import { Messages, Assistant, ChatHub } from './views/chat.jsx';
import { Today, ReviewQueue, Students } from './views/staff.jsx';
import { SessionsAdmin, Content, Announcements, People, Settings, AuditLog } from './views/admin.jsx';
import { Dashboard, Reports } from './views/dash.jsx';
import { Projects } from './views/projects.jsx';
import { Login } from './views/login.jsx';
import { firebaseConfig } from './firebase-config.js';

const cfg = firebaseConfig;
const params = new URLSearchParams(location.search);
const wantDemo = !cfg.apiKey || params.has('demo') || window.__DEMO === true;


const NAV = {
  student: [['home', 'Home', 'الرئيسية', 'home'], ['attend', 'Attendance', 'الحضور', 'qr'], ['learn', 'Learn', 'التعلم', 'book'], ['lab', 'My lab', 'اللاب', 'tooth'], ['chat', 'Help', 'مساعدة', 'chat']],
  demonstrator: [['today', 'Today'], ['review', 'Review queue'], ['students', 'My students'], ['projects', 'Projects'], ['messages', 'Messages'], ['learn', 'Materials'], ['assistant', 'Course assistant']],
  lecturer: [['today', 'My sessions'], ['review', 'Review queue'], ['students', 'My students'], ['projects', 'Projects'], ['messages', 'Messages'], ['learn', 'Materials'], ['assistant', 'Course assistant']],
  director: [['dash', 'Dashboard'], ['today', 'Today'], ['sessions', 'Sessions'], ['review', 'Reviews'], ['students', 'Students'], ['projects', 'Projects'], ['content', 'Materials'], ['announce', 'Announcements'], ['messages', 'Messages'], ['reports', 'Reports'], ['people', 'People'], ['settings', 'Settings'], ['audit', 'Audit log']],
  hod: [['dash', 'Dashboard'], ['students', 'Students'], ['projects', 'Projects'], ['review', 'Reviews'], ['messages', 'Messages'], ['reports', 'Reports'], ['audit', 'Audit log']],
  vicedean: [['dash', 'Dashboard'], ['projects', 'Projects'], ['messages', 'Messages'], ['reports', 'Reports']],
};
NAV.admin = NAV.director;
const ROLE_LABEL = { student: 'Student', demonstrator: 'Demonstrator', lecturer: 'Lecturer', director: 'Course Director', hod: 'Head of Department', vicedean: 'Vice Dean — Student Affairs', admin: 'Administrator' };

function View({ route, go }) {
  const u = me();
  const common = { go };
  switch (route) {
    case 'home': return <StudentHome {...common} />;
    case 'attend': return <Attend {...common} />;
    case 'lab': return <MyLab {...common} />;
    case 'learn': return <Learn {...common} />;
    case 'chat': return <ChatHub {...common} />;
    case 'messages': return <Messages {...common} />;
    case 'assistant': return <Assistant {...common} />;
    case 'today': return <Today {...common} />;
    case 'review': return <ReviewQueue {...common} />;
    case 'students': return <Students {...common} />;
    case 'sessions': return <SessionsAdmin {...common} />;
    case 'content': return <Content {...common} />;
    case 'announce': return <Announcements {...common} />;
    case 'people': return <People {...common} />;
    case 'settings': return <Settings {...common} />;
    case 'audit': return <AuditLog {...common} />;
    case 'dash': return <Dashboard {...common} />;
    case 'reports': return <Reports {...common} />;
    case 'projects': return <Projects {...common} />;
    default: return <p>Not found</p>;
  }
}

function DemoBar({ users, onSwitch }) {
  const u = me();
  const opts = [
    ['director', 'Course Director'], ['hod', 'Head of Department'], ['vicedean', 'Vice Dean'], ['lecturer', 'Lecturer'],
    ['demonstrator', 'Demonstrator (sections 1–2)'], ['student', 'Student (section 1)'],
  ];
  return <div class="demo-bar noprint">
    <b>{L('Demo', 'عرض تجريبي')}</b>
    <span class="demo-note">{L(`Fictional students · simulated date ${DEMO_TODAY}`, `طلاب افتراضيون · تاريخ محاكى ${DEMO_TODAY}`)}</span>
    <label class="row" style={{ gap: 6, flexWrap: 'nowrap' }}><span>{L('View as', 'عرض كـ')}</span>
      <select id="demo-role" value={u.role === 'demonstrator' ? 'demonstrator' : u.role} onChange={(e) => onSwitch(e.target.value)}>
        {opts.map(([k, l]) => <option value={k}>{l}</option>)}
      </select></label>
    <button class="btn sm" onClick={() => { demoStore.reset(); toast('Demo data reset'); }}>{L('Reset demo', 'إعادة ضبط')}</button>
  </div>;
}

function Shell({ onSignOut, onSwitch }) {
  useLang();
  const u = me();
  const nav = NAV[u.role] || NAV.student;
  const [route, setRoute] = useState(() => (deepLink.sid && u.role === 'student' ? 'attend' : nav[0][0]));
  const go = (r) => { setRoute(r); window.scrollTo(0, 0); };
  useEffect(() => { if (!nav.find((n) => n[0] === route)) setRoute(nav[0][0]); }, [u.role]);
  const student = u.role === 'student';
  return <div class="app">
    <header class="topbar">
      <img class="crest" src="/cu-logo.png" alt="Faculty of Dentistry, Cairo University" />
      <div class="brand"><b>{L('Conservative Dentistry · Year 3', 'العلاج التحفظي · الفرقة الثالثة')}</b><span>{u.name} · {student ? `${L('Section', 'سكشن')} ${u.section}` : ROLE_LABEL[u.role]}</span></div>
      <div class="spacer" />
      <button class="tb-btn" onClick={() => setLang(lang() === 'ar' ? 'en' : 'ar')}>{lang() === 'ar' ? 'English' : 'عربي'}</button>
      {!isDemo() && <button class="tb-btn" onClick={onSignOut}>{L('Sign out', 'خروج')}</button>}
    </header>
    {isDemo() && <DemoBar onSwitch={onSwitch} />}
    {!student && <nav class="staffnav noprint" aria-label="Sections">{nav.map(([k, l]) => <button class={route === k ? 'on' : ''} onClick={() => go(k)}>{l}</button>)}</nav>}
    <main id="main"><View route={route} go={go} /></main>
    {student && <nav class="tabbar noprint" aria-label="Sections">{nav.map(([k, en, ar, ic]) => <button class={route === k ? 'on' : ''} onClick={() => go(k)}><Icon n={ic} /><span>{L(en, ar)}</span></button>)}</nav>}
  </div>;
}

function DemoApp() {
  const [, setV] = useState(0);
  const pickUser = async (role) => {
    const users = await store().query('users', []);
    let u;
    if (role === 'student') u = users.filter((x) => x.role === 'student' && x.section === 1)[0];
    else if (role === 'demonstrator') u = users.find((x) => x.role === 'demonstrator');
    else u = users.find((x) => x.role === role);
    setMe(u); setV((v) => v + 1);
  };
  useEffect(() => { pickUser(params.get('role') || 'director'); }, []);
  if (!me()) return <main><p>Loading demo…</p></main>;
  return <Shell onSwitch={pickUser} />;
}

function LiveApp() {
  const [state, setState] = useState({ phase: 'loading' });
  useEffect(() => {
    const S = store();
    if (S.auth.isLink()) S.auth.completeLink().then((r) => r.needEmail && setState({ phase: 'needEmail' })).catch((e) => setState({ phase: 'login', error: e.message }));
    return S.auth.onChange(async (fu) => {
      if (!fu) { setMe(null); setState({ phase: 'login' }); return; }
      const email = (fu.email || '').toLowerCase();
      try {
        const r = await S.get('roster', email);
        if (!r) { setState({ phase: 'denied', email }); return; }
        const uid = r.role === 'student' ? String(r.code) : email;
        const u = { ...r, uid, email };
        if (!r.lastLogin || Date.now() - r.lastLogin > 6 * 3600e3) S.update('roster', email, { lastLogin: Date.now(), authUid: fu.uid }).catch(() => {});
        setMe(u); setState({ phase: 'in' });
      } catch (e) { setState({ phase: 'login', error: L('Could not reach the server. Check your connection and try again.', 'تعذر الاتصال بالخادم. تحقق من الاتصال وحاول مرة أخرى.') }); }
    });
  }, []);
  if (state.phase === 'in') return <Shell onSignOut={() => store().auth.signOut()} />;
  if (state.phase === 'loading') return <main><p>{L('Loading…', 'جارٍ التحميل…')}</p></main>;
  return <Login state={state} setState={setState} />;
}

async function boot() {
  setLang(lang());
  document.getElementById('app').textContent = '';
  if (wantDemo) { setStore(demoStore); render(<DemoApp />, document.getElementById('app')); return; }
  const { initFire } = await import('./lib/store-fire.js');
  setStore(initFire(cfg));
  render(<LiveApp />, document.getElementById('app'));
}
boot();
