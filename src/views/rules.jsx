// Rules, terms of use, limitations and copyright of the Digital Logbook (version 1.0, 2026).
import { L } from '../lib/ui.jsx';

export const VERSION = '1.0';
export const COPYRIGHT = '© 2026 Prof. Dr. Ahmed Zoheir El-Hoshy';

const SECTIONS = [
  ['1. Purpose and scope', '١. الغرض والنطاق', [
    ['The Digital Logbook is the official electronic logbook of the Year 3 Preclinical Conservative Dentistry course, Department of Conservative Dentistry, Faculty of Dentistry, Cairo University. It records attendance, preclinical requirements, grades, feedback and learning materials, and gives leaders a live dashboard of the course.', 'اللوجبوك الرقمي هو اللوجبوك الإلكتروني الرسمي لمقرر العلاج التحفظي قبل الإكلينيكي – الفرقة الثالثة، قسم العلاج التحفظي، كلية طب الأسنان، جامعة القاهرة. يسجل الحضور والمتطلبات العملية والدرجات والتغذية الراجعة والمواد التعليمية، ويعطي القيادات لوحة متابعة مباشرة للمقرر.'],
    ['Use of the platform is part of the course. By signing in, every user agrees to these rules.', 'استخدام المنصة جزء من المقرر، وبمجرد تسجيل الدخول يوافق المستخدم على هذه القواعد.']]],
  ['2. Accounts and access', '٢. الحسابات والدخول', [
    ['Sign in only with your own university email (@dentistry.cu.edu.eg). Accounts are personal and must never be shared.', 'الدخول فقط بالبريد الجامعي الخاص بك (@dentistry.cu.edu.eg). الحساب شخصي ولا يجوز مشاركته مع أي شخص.'],
    ['Each person sees only what their role needs: students their own record; demonstrators and lecturers their sections; the Course Director, Head of Department and Vice Dean the course overview.', 'كل مستخدم يرى ما يحتاجه دوره فقط: الطالب سجله الشخصي، والمعيد والمحاضر سكاشنهم، ومنسق المقرر ورئيس القسم ووكيل الكلية النظرة العامة للمقرر.'],
    ['Report a lost phone, a wrong section or a sign-in problem to the Course Director immediately.', 'أبلغ منسق المقرر فورًا عند فقد الموبايل أو وجود خطأ في السكشن أو مشكلة في الدخول.']]],
  ['3. Attendance', '٣. الحضور', [
    ['Check in only when you are physically present, using the code or QR shown in the room. Checking in for another student, or forwarding the code or QR, is a disciplinary offence.', 'سجّل حضورك فقط وأنت موجود فعليًا، بالكود أو الـQR المعروض في القاعة. تسجيل الحضور لطالب آخر أو إرسال الكود أو الـQR مخالفة تأديبية.'],
    ['Lab attendance counts only after a demonstrator confirms it at the bench. Manual attendance needs a reason and is recorded in the audit log.', 'حضور المعمل لا يُحتسب إلا بعد تأكيد المعيد عند الوحدة. الحضور اليدوي يحتاج سببًا ويُسجَّل في سجل المراجعة.']]],
  ['4. Requirements, grading and feedback', '٤. المتطلبات والتقييم والتغذية الراجعة', [
    ['The official grade is given only by a demonstrator or supervisor after examining the physical tooth in the lab.', 'الدرجة الرسمية يضعها المعيد أو المشرف فقط بعد فحص السنة الفعلية في المعمل.'],
    ['Photos must be of your own preparation, taken with the camera at the time (no gallery uploads or edited photos).', 'يجب أن تكون الصور لتحضيرك أنت، ومن الكاميرا مباشرة (بدون رفع من المعرض أو صور معدّلة).'],
    ['Self-assessment and Prep Lens (AI) are formative learning tools only. They never replace direct assessment by faculty.', 'التقييم الذاتي وPrep Lens (الذكاء الاصطناعي) أدوات تعليمية تكوينية فقط، ولا تستبدل التقييم المباشر بواسطة عضو هيئة التدريس.'],
    ['No evaluation is given in private messages; grades and feedback are recorded on the platform only.', 'لا يُعطى أي تقييم في الرسائل الخاصة؛ الدرجات والملاحظات تُسجَّل على المنصة فقط.'],
    ['Every grade change keeps its history and a reason in the audit log.', 'أي تعديل في الدرجة يُحفظ بتاريخه وسببه في سجل المراجعة.']]],
  ['5. Academic integrity and conduct', '٥. النزاهة الأكاديمية والسلوك', [
    ['Falsifying attendance, photos or grades, using someone else\'s account, or trying to access data you are not entitled to will be referred to the faculty\'s disciplinary regulations.', 'تزوير الحضور أو الصور أو الدرجات، أو استخدام حساب شخص آخر، أو محاولة الوصول لبيانات غير مسموح بها، يُحال للائحة التأديب بالكلية.'],
    ['Messages to staff must be respectful and about the course.', 'الرسائل للهيئة المعاونة يجب أن تكون محترمة وخاصة بالمقرر.']]],
  ['6. Privacy and data', '٦. الخصوصية والبيانات', [
    ['Data are used only for teaching, student support, quality assurance and accreditation. Surveys and research exports are anonymous.', 'تُستخدم البيانات فقط للتعليم ودعم الطلاب وضمان الجودة والاعتماد. الاستبيانات وبيانات البحث مجهولة الهوية.'],
    ['Do not screenshot, copy or share other people\'s names, grades or photos outside the platform.', 'ممنوع تصوير أو نسخ أو مشاركة أسماء أو درجات أو صور الآخرين خارج المنصة.'],
    ['Data are backed up, encrypted, every week.', 'يتم عمل نسخة احتياطية مشفّرة من البيانات أسبوعيًا.']]],
  ['7. Staff responsibilities', '٧. مسؤوليات الهيئة المعاونة', [
    ['Open attendance at the start of the lab, confirm students at the bench, and grade submitted teeth on the platform during the lab (target: within 24 hours).', 'فتح الحضور في بداية المعمل، وتأكيد الطلاب عند الوحدة، وتقييم السنان المرسلة على المنصة أثناء المعمل (الهدف: خلال ٢٤ ساعة).'],
    ['Mark defects when a grade is below 10, so the student knows what to improve.', 'تحديد العيوب عند إعطاء درجة أقل من ١٠ حتى يعرف الطالب ما يجب تحسينه.']]],
  ['8. Limitations of use', '٨. حدود الاستخدام', [
    ['Version 1.0 is a pilot in Year 3 preclinical Conservative Dentistry. Features and rules may change after evaluation and surveys.', 'الإصدار ١٫٠ تجربة (Pilot) في الفرقة الثالثة قبل الإكلينيكي. قد تتغير الخصائص والقواعد بعد التقييم والاستبيانات.'],
    ['The platform depends on the internet and the university network. Check-ins and work are saved on the phone when the network drops and sent later, but availability cannot be guaranteed at all times.', 'المنصة تعتمد على الإنترنت وشبكة الجامعة. الحضور والعمل يُحفظان على الموبايل عند انقطاع الشبكة ويُرسلان لاحقًا، لكن لا يمكن ضمان الإتاحة في كل الأوقات.'],
    ['Paper registers and grade sheets remain the official backup until the department decides otherwise.', 'تظل الكشوف وشيتات الدرجات الورقية هي الاحتياطي الرسمي حتى يقرر القسم غير ذلك.'],
    ['Prep Lens (AI) feedback can be wrong; it judges photos only, not the physical tooth, and is never used for official grades.', 'ملاحظات Prep Lens قد تكون خاطئة؛ فهي تحكم على الصور فقط وليس على السنة الفعلية، ولا تُستخدم أبدًا في الدرجات الرسمية.'],
    ['Dashboard figures and KPIs are indicators that depend on what users enter. They support, but do not replace, academic judgement and official faculty decisions.', 'أرقام لوحة المتابعة والمؤشرات تعتمد على ما يُدخله المستخدمون، وهي أداة مساعدة ولا تحل محل الحكم الأكاديمي أو القرارات الرسمية للكلية.'],
    ['The platform is not a clinical or patient record, and photos are not for diagnosis.', 'المنصة ليست سجلًا إكلينيكيًا أو سجل مرضى، والصور ليست للتشخيص.'],
    ['Use a recent browser (Chrome, Safari or Edge) on a phone or computer. Older devices may not support the camera or QR scanner.', 'استخدم متصفحًا حديثًا (Chrome أو Safari أو Edge) على الموبايل أو الكمبيوتر. الأجهزة القديمة قد لا تدعم الكاميرا أو قارئ الـQR.']]],
];

export function Rules() {
  return <>
    <section class="hero"><span class="eyebrow">{L('Version', 'الإصدار')} {VERSION} · 2026</span>
      <h1>{L('Rules, terms of use and copyright', 'القواعد وشروط الاستخدام وحقوق الملكية')}</h1>
      <p class="muted">{L('Digital Logbook · Year 3 Preclinical Conservative Dentistry · Faculty of Dentistry, Cairo University', 'اللوجبوك الرقمي · العلاج التحفظي قبل الإكلينيكي – الفرقة الثالثة · كلية طب الأسنان، جامعة القاهرة')}</p></section>
    {SECTIONS.map(([en, ar, items]) => <section class="card"><h2>{L(en, ar)}</h2><ul class="stack" style={{ margin: 0, paddingInlineStart: 20 }}>{items.map(([e, a]) => <li dir="auto">{L(e, a)}</li>)}</ul></section>)}
    <section class="card lead"><h2>{L('9. Copyright', '٩. حقوق الملكية')}</h2>
      <p dir="auto"><b>{COPYRIGHT}. {L('All rights reserved.', 'جميع الحقوق محفوظة.')}</b></p>
      <p dir="auto">{L('Digital Logbook, version 1.0 (2026). Designed and developed by Prof. Dr. Ahmed Zoheir El-Hoshy, Course Director, for the Department of Conservative Dentistry, Faculty of Dentistry, Cairo University.', 'اللوجبوك الرقمي، الإصدار ١٫٠ (٢٠٢٦). تصميم وتطوير أ.د. أحمد زهير الحوشي، منسق المقرر، لقسم العلاج التحفظي، كلية طب الأسنان، جامعة القاهرة.')}</p>
      <p dir="auto">{L('Copying, redistributing, adding to or changing the design, workflow, rubrics, content, videos or Prep Lens, in whole or in part, is prohibited. Any violation exposes the violator to legal accountability under intellectual property laws.', 'حقوق الطبع محفوظة للأستاذ الدكتور أحمد زهير الحوشي، وأي توزيع أو إضافة أو تغيير في التصميم أو سير العمل (Workflow) أو الروبريكات (Rubrics) أو المحتوى (Contents) أو الفيديوهات (Videos) أو أداة Prep Lens ممنوع، وإلا يعرّض المخالف للمساءلة القانونية طبقًا لقوانين حقوق الملكية الفكرية.')}</p>
      <p class="faint" dir="auto">{L('Questions about these rules: contact the Course Director through Messages.', 'للاستفسار عن هذه القواعد: تواصل مع منسق المقرر من خلال الرسائل.')}</p></section>
  </>;
}
