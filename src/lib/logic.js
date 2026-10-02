// Business logic shared by all views. Works on either backend (demo or Firebase).
import { DEMO_TODAY } from './demo-seed.js';
import { PRACTICAL_WEEKS, COURSE, stageCriteria } from '../data/course.js';
import { rubricById } from '../data/rubrics.js';

const _qp = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
// Deep link from a lecture/lab QR code: ?s=<sessionId>&c=<code>
export const deepLink = { sid: _qp.get('s'), code: _qp.get('c') };

let S = null;
let ME = null;
export const setStore = (s) => { S = s; };
export const store = () => S;
export const setMe = (u) => { ME = u; };
export const me = () => ME;
export const isDemo = () => S && S.mode === 'demo';

export function today() {
  if (isDemo()) return DEMO_TODAY;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());
}
export const nowMs = () => Date.now();
export function currentWeek() {
  const t = today();
  return PRACTICAL_WEEKS.find((w) => t >= w.from && t <= w.to) || PRACTICAL_WEEKS.filter((w) => w.from <= t).slice(-1)[0] || PRACTICAL_WEEKS[0];
}
export const isStaff = (u = ME) => u && u.role !== 'student';
export const isLeader = (u = ME) => u && ['director', 'hod', 'vicedean', 'dean', 'admin'].includes(u.role);
export const canEditCourse = (u = ME) => u && ['director', 'admin'].includes(u.role);

// ---------- audit ----------
export async function audit(action, target, before, after, reason) {
  await S.add('audit', { at: nowMs(), by: ME.uid, byName: ME.name, byRole: ME.role, action, target, before: before ?? null, after: after ?? null, reason: reason || '' });
}

// ---------- sessions & attendance ----------
export function sessionIsOpen(s, t = nowMs()) { return s && s.status === 'open' && s.closesAt && t < s.closesAt; }

// Cairo wall-clock time -> epoch ms (handles Egypt's summer time).
export function cairoMs(date, time) {
  const guess = Date.parse(`${date}T${time || '00:00'}:00Z`);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(guess)).map((x) => [x.type, x.value]));
  const asCairo = Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00Z`);
  return guess - (asCairo - guess);
}
// Check-ins saved offline are accepted until 30 minutes after the session ends (or after attendance closes, if later),
// so a student whose phone had no signal in the lab is recorded as soon as it reconnects.
const SYNC_GRACE = 30 * 60e3;
function syncUntil(s, closesAt) {
  const end = s && s.date && s.end ? cairoMs(s.date, s.end) : 0;
  return Math.max(closesAt, end) + SYNC_GRACE;
}
export async function openSession(sid, minutes = COURSE.attendanceWindowMin) {
  const t = nowMs(); const s = await S.get('sessions', sid);
  const closesAt = t + minutes * 60e3;
  await S.update('sessions', sid, { status: 'open', openedAt: t, closesAt, syncUntil: syncUntil(s, closesAt), openedBy: ME.uid, openedByName: ME.name });
  await rotateCode(sid, true);
}
export async function extendSession(sid, minutes = 5) {
  const s = await S.get('sessions', sid);
  const closesAt = Math.max(nowMs(), s.closesAt || 0) + minutes * 60e3;
  await S.update('sessions', sid, { status: 'open', closesAt, syncUntil: Math.max(s.syncUntil || 0, syncUntil(s, closesAt)) });
}
export async function closeSession(sid) { await S.update('sessions', sid, { status: 'closed', closesAt: nowMs() }); }

const six = () => String(Math.floor(100000 + Math.random() * 900000));
export async function rotateCode(sid, fresh = false) {
  const prev = fresh ? null : await S.get('codes', sid);
  const t = nowMs();
  // Keep the codes of the last 5 minutes so a check-in saved on a phone during a Wi-Fi drop is still accepted when it syncs.
  const hist = ((prev && prev.hist) || []).filter((x) => t - x.at < 5 * 60e3);
  const cur = six(); hist.push({ c: cur, at: t });
  // 'all' = every code shown during this opening, so check-ins that sync late (offline) still match.
  const all = [...((prev && prev.all) || []), cur].slice(-300);
  const code = { cur, prev: prev ? prev.cur : null, at: t, hist, recent: hist.map((x) => x.c), all };
  await S.set('codes', sid, code);
  return code;
}

export function attendanceId(sid, uid) { return `${sid}_${uid}`; }

// Student check-in. Resolves to {state:'recorded'} or throws {state:'failed', reason}.
// On the live backend the write is queued offline and the promise only settles when the server answers.
export async function checkIn(session, code) {
  const id = attendanceId(session.id, ME.uid);
  const existing = await S.get('attendance', id).catch(() => null);
  if (existing) return { state: 'duplicate', record: existing };
  const rec = {
    sid: session.id, uid: ME.uid, code: ME.code || '', name: ME.name, section: ME.section || null, type: session.type,
    date: session.date, week: session.week || null, at: nowMs(), status: 'recorded', method: 'qr', submittedCode: String(code).trim(),
  };
  if (isDemo()) {
    const c = await S.get('codes', session.id);
    if (!sessionIsOpen(session)) throw fail('closed');
    if (session.type === 'lab' && session.section !== ME.section) throw fail('wrong-section');
    if (!c || (rec.submittedCode !== c.cur && rec.submittedCode !== c.prev && !(c.all || c.recent || []).includes(rec.submittedCode))) throw fail('bad-code');
    await S.create('attendance', id, rec);
    return { state: 'recorded' };
  }
  try {
    await S.createQueued('attendance', id, rec);
    return { state: 'recorded' };
  } catch (e) {
    if (String(e.code).includes('permission')) throw fail('rejected');
    throw fail('network');
  }
}
function fail(reason) { const e = new Error(reason); e.state = 'failed'; e.reason = reason; return e; }

export async function setAttendance(session, student, status, reason) {
  const id = attendanceId(session.id, student.uid);
  const prev = await S.get('attendance', id);
  const rec = {
    sid: session.id, uid: student.uid, code: student.code || '', name: student.name, section: student.section || null,
    type: session.type, date: session.date, week: session.week || null, at: prev ? prev.at : nowMs(),
    status, method: prev ? prev.method : 'manual', by: ME.uid, byName: ME.name, decidedAt: nowMs(), reason: reason || '',
  };
  await S.set('attendance', id, rec);
  const correction = prev && prev.status !== 'recorded' && prev.status !== status;
  if (correction || (!prev && status === 'confirmed')) await audit('attendance.' + (correction ? 'correct' : 'manual'), id, prev ? prev.status : 'none', status, reason);
}
export async function confirmAllRecorded(sessionId) {
  const recs = await S.query('attendance', [['sid', '==', sessionId], ['status', '==', 'recorded']]);
  for (const r of recs) await S.update('attendance', r.id, { status: 'confirmed', by: ME.uid, byName: ME.name, decidedAt: nowMs() });
  return recs.length;
}

// ---------- practical entries ----------
export async function compressImage(file, max = 1280, quality = 0.8) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', quality));
  const stats = imageQuality(c);
  URL.revokeObjectURL(img.src);
  return { blob, width: c.width, height: c.height, quality: stats };
}
// Simple on-device photo checks (brightness and sharpness) so students retake poor photos before submitting.
function imageQuality(canvas) {
  const w = Math.min(320, canvas.width), h = Math.round(canvas.height * (w / canvas.width));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.drawImage(canvas, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data;
  let sum = 0; const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) { const v = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]; lum[i] = v; sum += v; }
  const mean = sum / (w * h);
  let lap = 0, n = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x; const v = 4 * lum[i] - lum[i - 1] - lum[i + 1] - lum[i - w] - lum[i + w]; lap += v * v; n++;
  }
  const sharp = lap / n;
  return { brightness: Math.round(mean), sharpness: Math.round(sharp), tooDark: mean < 60, tooBright: mean > 220, blurry: sharp < 60 };
}

export async function createEntry({ week, rubricId, tooth, label, practice, stage }) {
  const t = nowMs();
  if (!practice) {
    // At most two requirement teeth per week, recorded in Lab 1.
    const mine = (await S.query('entries', [['uid', '==', ME.uid], ['week', '==', week]], {})).filter((e) => !e.practice);
    if (mine.length >= 2) throw Object.assign(new Error('Two requirement teeth are already recorded for this week.'), { code: 'limit' });
  }
  return S.add('entries', {
    uid: ME.uid, code: ME.code || '', name: ME.name, section: ME.section || null, week, rubricId: rubricId || null, taskLabel: label || '',
    tooth: tooth || '', date: today(), status: 'draft', self: null, ai: null, review: null, photos: [], createdAt: t, updatedAt: t, history: [],
    practice: !!practice, stage: stage || (practice ? 'outline' : 'full'), ...(practice ? {} : { labNo: 1 }),
  });
}
export async function setStage(entryId, stage) { await S.update('entries', entryId, { stage, updatedAt: nowMs() }); }
// The student's own reading of the probe markings (mm) — compared with the Prep Lens estimate in the validation panel.
export async function setProbeReading(entryId, mm) { await S.update('entries', entryId, { probeMm: mm, updatedAt: nowMs() }); }
export async function addPhoto(entryId, file, view = 'occlusal') {
  // 1600 px keeps the periodontal-probe markings readable for Prep Lens (well under the 3 MB upload limit).
  const { blob, quality } = await compressImage(file, 1600, 0.88);
  const path = `photos/${ME.uid}/${entryId}/${Date.now()}.jpg`;
  const url = await S.putFile(path, blob);
  const e = await S.get('entries', entryId);
  const photos = [...(e.photos || []), { path, url, view, at: nowMs(), quality }];
  await S.update('entries', entryId, { photos, updatedAt: nowMs() });
  return { quality };
}
export async function saveSelf(entryId, picks, grade, comment) {
  await S.update('entries', entryId, { self: { picks, grade, comment: comment || '', at: nowMs() }, updatedAt: nowMs() });
}
export async function submitEntry(entryId) {
  const e = await S.get('entries', entryId);
  const history = [...(e.history || [])];
  if (e.status === 'redo') history.push({ at: nowMs(), event: 'resubmitted' });
  await S.update('entries', entryId, { status: 'submitted', submittedAt: nowMs(), updatedAt: nowMs(), history });
}
export async function requestAI(entryId) {
  if (isDemo()) return demoAI(entryId);
  return S.call('prepLens', { entryId });
}
async function demoAI(entryId) {
  const e = await S.get('entries', entryId);
  const rub = rubricById[e.rubricId];
  await new Promise((r) => setTimeout(r, 1200));
  const criteria = {};
  const bands = ['A', 'B', 'B', 'C'];
  rub.criteria.forEach((c, i) => {
    if (c.photo === 'no') criteria[c.id] = { assessable: false, band: null, comment: 'Not assessable from photo — check with demonstrator.' };
    else criteria[c.id] = { assessable: true, band: bands[(i + (e.tooth || '').length) % 4], comment: c.photo === 'partial' ? 'Partly visible — confirm on the tooth with your demonstrator.' : 'Looks consistent with the rubric description at this band. (Demo feedback)' };
  });
  const stage = e.stage || 'full';
  const focus = stageCriteria(rub, stage).map((c) => c.id);
  for (const k of Object.keys(criteria)) if (!focus.includes(k)) criteria[k] = { assessable: false, band: null, comment: 'Not part of this step.' };
  const depthMm = focus.includes('depth') && (e.photos || []).some((p) => p.view === 'probe') ? 1.6 : null;
  const ai = { criteria, summary: 'Demo mode: this is simulated feedback. In the live platform Prep Lens reads your photos against the official rubric.', model: 'demo', promptVersion: 'v2', at: nowMs(), score: null, stage, depthMm };
  const aiHistory = [...(e.aiHistory || []), { stage, at: nowMs(), depthMm, summary: ai.summary }].slice(-20);
  await S.update('entries', entryId, { ai, aiHistory, updatedAt: nowMs() });
  return ai;
}

export async function reviewEntry(entry, { picks, grade, status, feedback, reason, redo, rejectPhoto }) {
  const before = entry.review ? { grade: entry.review.grade, status: entry.review.status } : null;
  if (before && before.grade !== grade && !reason) throw new Error('A reason is required to change a saved grade.');
  const history = [...(entry.history || [])];
  if (entry.review) history.push({ at: nowMs(), event: 'review-changed', by: ME.name, before, reason });
  if (rejectPhoto) history.push({ at: nowMs(), event: 'photo-rejected', by: ME.name, reason: rejectPhoto });
  const review = { picks, grade, status, feedback: feedback || '', by: ME.uid, byName: ME.name, at: nowMs() };
  await S.update('entries', entry.id, { review, status: redo || rejectPhoto ? 'redo' : 'reviewed', updatedAt: nowMs(), history, photoRejected: rejectPhoto || null });
  if (before) await audit('grade.correct', entry.id, JSON.stringify(before), JSON.stringify({ grade, status }), reason);
}

// ---------- messages ----------
export async function sendMessage(studentUid, section, text, entryId) {
  await S.add('messages', { uid: studentUid, section: section || null, from: ME.uid, fromName: ME.name, fromRole: ME.role, text: text.trim(), at: nowMs(), entryId: entryId || null, read: false });
}

// ---------- assistant ----------
export async function askAssistant(history) {
  if (!isDemo()) return S.call('assistant', { history });
  const q = history[history.length - 1].text.toLowerCase();
  await new Promise((r) => setTimeout(r, 700));
  let a = 'In the live platform I answer from the approved course material (schedule, rubrics, instruments, Prep Lens steps and the platform guide). I cannot record attendance, give grades or approve requirements — your demonstrator decides assessments.';
  if (/attend|حضور/.test(q)) a = 'Attendance: be physically present, open Attendance, tap Scan the QR code, then Confirm attendance during the open window (type the code only if the camera fails). It counts only after staff confirmation. I cannot record attendance for you.';
  else if (/bur|tool|instrument|أدوات|تحضر/.test(q)) a = 'For the next lab bring: ruler, white paper and pen, low-speed handpiece with contra-angle, round bur #1, bur 330, bur 245 and an acrylic lower first molar.';
  else if (/photo|lens|صورة/.test(q)) a = 'Prep Lens photo: clean the typodont, place a periodontal probe beside the tooth, hold the phone ~15 cm away at 90° to the occlusal surface, keep it sharp and shadow-free.';
  else if (/class ii|class 2/.test(q)) a = 'Class II composite (9–10 band): follow central/B-L grooves precisely, width ≤ ¼ intercuspal distance, depth 2 mm from the external wall, gingival floor in enamel above the CEJ, all line angles rounded.';
  return { text: a + '\n\n(Demo mode answer.)' };
}

export function rubricFor(entry) { return rubricById[entry.rubricId] || null; }

// ---------- lab roles ----------
// Each section has two labs a week: Lab 1 = requirement lab (2 teeth graded); Lab 2 = practice, demonstrations,
// open discussion and later the project. Attendance is taken and counted in both.
export function labNo(s) {
  if (!s) return null;
  if (s.labNo) return s.labNo;
  const m = /^lab-w\d+-s\d+-(\d+)$/.exec(s.id || s.sid || '');
  return m ? Number(m[1]) : null;
}
