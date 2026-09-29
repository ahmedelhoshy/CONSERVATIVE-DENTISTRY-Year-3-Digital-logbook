// Content rules for student–staff messages: no personal information, no attendance, no marks.
// Returns null when the message may be sent, otherwise the reason key.
const toLatinDigits = (s) => s.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
export function chatBlocked(raw) {
  const t = toLatinDigits(String(raw || '')).toLowerCase();
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(t)) return 'personal';
  if (/(\d[\s\-.]*){8,}/.test(t)) return 'personal'; // phone, national ID, student number
  if (/(wa\.me|whatsapp|واتس|t\.me|telegram|تليجرام|facebook\.com|fb\.com|instagram|انستجرام|snapchat)/.test(t)) return 'personal';
  if (/(رقم (موبايل|تليفون|هاتف|تلفون|قومي)|الرقم القومي|عنوان(ي|ك) |password|كلمة (السر|المرور)|national id|phone number|my address)/.test(t)) return 'personal';
  if (/(attendance|attend(ed)?\b|absen(t|ce)|حضور|حضوري|الحضور|غياب|غيابي|غائب|غبت|تسجيل حضور)/.test(t)) return 'attendance';
  if (/(\bmarks?\b|\bgrades?\b|\bscores?\b|\bdegrees?\b|\bgpa\b|درجات|درجتي|درجتك|درجته|الدرجة|الدرجه|(?<![0-9]\s?)درجة|علامات|علامتي|تقدير|التقدير|نتيجة|نتيجتي|النتيجة|pass(ed)?\b|fail(ed)?\b|نجحت|رسبت|سقطت)/.test(t)) return 'marks';
  return null;
}
export const CHAT_RULE_TEXT = {
  personal: ['Personal information is not allowed in messages (phone numbers, emails, ID or student numbers, social-media accounts, addresses, passwords).', 'غير مسموح بمشاركة بيانات شخصية في الرسائل (أرقام هواتف، بريد إلكتروني، أرقام قومية أو جامعية، حسابات تواصل، عناوين، كلمات مرور).'],
  attendance: ['Attendance cannot be discussed in messages. Speak to your demonstrator in the lab or contact the course office.', 'لا تُناقش أمور الحضور والغياب في الرسائل. كلّم المعيد في اللاب أو راجع مكتب المقرر.'],
  marks: ['Marks and grades cannot be discussed in messages. Your official evaluations are in My lab.', 'لا تُناقش الدرجات والتقديرات في الرسائل. تقييماتك الرسمية موجودة في صفحة اللاب.'],
};
