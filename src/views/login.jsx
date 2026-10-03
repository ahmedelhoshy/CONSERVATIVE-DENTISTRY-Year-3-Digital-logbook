import { useState } from 'preact/hooks';
import { store } from '../lib/logic.js';
import { L, setLang, lang } from '../lib/ui.jsx';

export function Login({ state, setState }) {
  const S = store();
  const [email, setEmail] = useState(() => (S.auth.lastEmail ? S.auth.lastEmail() : ''));
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState(state.error || '');
  const send = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      if (state.phase === 'needEmail') { await S.auth.completeLink(email.trim().toLowerCase()); }
      else { await S.auth.sendLink(email.trim().toLowerCase()); setSent(true); }
    } catch (x) { setErr(L('That did not work: ', 'لم تنجح العملية: ') + (x.code || x.message)); }
    setBusy(false);
  };
  return <main><div class="login stack">
    <div class="row between"><img class="crest lg" src="/cu-logo.png" alt="Faculty of Dentistry, Cairo University" /><button class="btn sm" onClick={() => setLang(lang() === 'ar' ? 'en' : 'ar')}>{lang() === 'ar' ? 'English' : 'عربي'}</button></div>
    <div class="hero"><span class="eyebrow">{L('Faculty of Dentistry · Cairo University', 'كلية طب الأسنان · جامعة القاهرة')}</span>
      <h1>{L('Conservative Dentistry Logbook', 'لوجبوك العلاج التحفظي')}</h1>
      <p class="muted">{L('Year 3 preclinical · sign in with your university email.', 'الفرقة الثالثة · سجّل الدخول ببريدك الجامعي.')}</p></div>
    {state.phase === 'denied' ? <div class="state failed"><b>{L('Email not on the course list', 'البريد غير مسجل في المقرر')}</b>
      <p>{L(`${state.email} is not registered for this course. Sign in with your university email, or ask the Course Director to add you.`, `${state.email} غير مسجل في المقرر. استخدم بريدك الجامعي أو اطلب من مدير المقرر إضافتك.`)}</p>
      <button class="btn" onClick={() => S.auth.signOut().then(() => setState({ phase: 'login' }))}>{L('Use another email', 'استخدم بريدًا آخر')}</button></div>
    : sent ? <div class="state recorded"><b>{L('Check your email', 'افحص بريدك')}</b><p>{L(`We sent a sign-in link to ${email}. Open it on this phone. The link signs you in; there is no password.`, `أرسلنا رابط الدخول إلى ${email}. افتحه على نفس الموبايل. لا توجد كلمة مرور.`)}</p><p class="faint">{L('Not there after 2 minutes? Check Junk/Spam, then try again.', 'لم يصل بعد دقيقتين؟ افحص الرسائل غير المرغوبة ثم حاول مرة أخرى.')}</p><button class="btn primary" onClick={() => S.auth.google().catch((x) => setErr(x.message))}>{L('Faster: sign in with Google instead', 'أسرع: ادخل بحساب جوجل الجامعي')}</button></div>
    : <form class="card lead" onSubmit={send}>
      {state.phase !== 'needEmail' && <><button type="button" id="google-signin" class="btn primary big" onClick={() => S.auth.google().catch((x) => setErr(x.message))}>{L('Sign in with Google (faculty account)', 'الدخول بحساب جوجل الجامعي')}</button>
        <p class="faint">{L('One tap, no email needed. You stay signed in on this device until you tap Sign out.', 'ضغطة واحدة بدون انتظار إيميل. تظل مسجلاً على هذا الجهاز حتى تضغط تسجيل الخروج.')}</p>
        </>}
      {(() => { const linkForm = <><label class="fld">{state.phase === 'needEmail' ? L('Confirm your email to finish signing in', 'أكّد بريدك لإكمال الدخول') : L('University email', 'البريد الجامعي')}
        <input id="login-email" type="email" required autocomplete="email" inputmode="email" value={email} onInput={(e) => setEmail(e.target.value)} placeholder="name@..." /></label>
      <button class={state.phase === 'needEmail' ? 'btn primary big' : 'btn'} disabled={busy}>{state.phase === 'needEmail' ? L('Sign in', 'دخول') : L('Email me a sign-in link', 'أرسل لي رابط الدخول')}</button></>;
        return state.phase === 'needEmail' ? linkForm : <details><summary class="faint">{L('Google button not working? Get a sign-in link by email instead (it can take a few minutes or land in Spam)', 'زرار جوجل مش شغال؟ استلم رابط دخول على الإيميل (ممكن يتأخر أو يروح Spam)')}</summary><div class="stack" style={{ marginTop: 8 }}>{linkForm}</div></details>; })()}
      {err && <p style={{ color: 'var(--bad)' }}>{err}</p>}
      <p class="faint">{L('Tip: add this page to your home screen (Share → Add to Home Screen on iPhone, ⋮ → Add to Home screen on Android) to open the logbook like an app.', 'نصيحة: أضف الصفحة إلى الشاشة الرئيسية (مشاركة ← إضافة إلى الشاشة الرئيسية على الآيفون، أو ⋮ ← إضافة إلى الشاشة الرئيسية على أندرويد) لتفتح اللوجبوك كتطبيق.')}</p>
    </form>}
    <p class="faint">{L('Your data is visible only to you and your teaching staff. Problems signing in? Contact the Course Director.', 'بياناتك تظهر لك ولفريق التدريس فقط. مشكلة في الدخول؟ تواصل مع مدير المقرر.')}</p>
  </div></main>;
}
