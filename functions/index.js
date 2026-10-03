// Cloud Functions for the CU Conservative Dentistry logbook.
// - prepLens: criterion-based AI feedback on a preparation photo (Gemini), never a grade.
// - assistant: course assistant limited to approved material.
// - refreshStats / nightlyStats (19:00 Cairo): dashboard aggregate in reports/latest.
// - daily report: see functions/daily-report.mjs (sent from the Course Director's Gmail).
// - weeklyReport (Friday 09:00 Cairo): teeth per student, Excel attachment.
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineString } from 'firebase-functions/params';
import { setGlobalOptions } from 'firebase-functions/v2';
import nodemailer from 'nodemailer';
import * as XLSX from 'xlsx';
import { computeStats } from './shared/stats.js';
import { PRACTICAL_WEEKS, COURSE, PREP_STAGES, stageCriteria } from './shared/course.js';
import { rubricById } from './shared/rubrics.js';
import { buildKnowledge } from './knowledge.js';
import { cairoDate, esc, loadAll as loadAllFrom, reportHtml as reportHtmlFrom } from './report-lib.js';
const loadAll = () => loadAllFrom(db);
const reportHtml = (st, all, day, heading) => reportHtmlFrom(st, all, day, heading, SITE_URL.value());

initializeApp();
const db = getFirestore();
setGlobalOptions({ region: 'europe-west1', maxInstances: 10 });

// Keys are provided by the deploy workflow in functions/.env (from GitHub secrets); never committed.
const GEMINI_API_KEY = defineString('GEMINI_API_KEY', { default: '' });
const SMTP_PASS = defineString('SMTP_PASS', { default: '' });
const GEMINI_MODEL = defineString('GEMINI_MODEL', { default: 'gemini-flash-lite-latest' });
const SMTP_HOST = defineString('SMTP_HOST', { default: 'smtp.gmail.com' });
const SMTP_USER = defineString('SMTP_USER', { default: '' });
const SITE_URL = defineString('SITE_URL', { default: '' });
const PROMPT_VERSION = 'prep-lens-v2';


async function caller(req) { return userByEmail(req.auth?.token?.email); }
async function userByEmail(rawEmail) {
  const email = (rawEmail || '').toLowerCase();
  if (!email) throw new HttpsError('unauthenticated', 'Sign in first.');
  const snap = await db.doc(`roster/${email}`).get();
  if (!snap.exists) throw new HttpsError('permission-denied', 'Not on the course roster.');
  const r = snap.data();
  return { ...r, email, uid: r.role === 'student' ? String(r.code) : email };
}

// Daily usage counter with a hard cap (budget guard).
async function takeQuota(kind, limit, perUser) {
  const day = cairoDate();
  const ref = db.doc(`usage/${kind}-${day}`);
  return db.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    const d = s.exists ? s.data() : { total: 0, users: {} };
    if (d.total >= limit) return false;
    if (perUser) { const n = (d.users || {})[perUser.uid] || 0; if (n >= perUser.limit) return false; tx.set(ref, { total: d.total + 1, users: { ...(d.users || {}), [perUser.uid]: n + 1 } }, { merge: true }); }
    else tx.set(ref, { total: d.total + 1 }, { merge: true });
    return true;
  });
}

async function gemini(parts, { json = false, system, temperature = 0.2 } = {}) {
  if (!GEMINI_API_KEY.value()) throw new HttpsError('failed-precondition', 'The AI key is not configured yet.');
  const body = { contents: [{ role: 'user', parts }], generationConfig: { temperature, ...(json ? { responseMimeType: 'application/json' } : {}) } };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL.value()}:generateContent`;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY.value() }, body: JSON.stringify(body) });
  if (!res.ok) throw new HttpsError('unavailable', `AI service error ${res.status}`);
  const j = await res.json();
  const text = (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
  return { text, model: j.modelVersion || GEMINI_MODEL.value() };
}

function prepLensPrompt(rubric, tooth, stage, views) {
  const focus = stageCriteria(rubric, stage).map((c) => c.id);
  const st = PREP_STAGES.find((x) => x[0] === stage) || PREP_STAGES[3];
  const crit = rubric.criteria.map((c) => `- id "${c.id}" — ${c.name} (${c.group}). Visibility from a photo: ${c.photo}.${focus.includes(c.id) ? '' : ' [NOT IN THIS STEP]'}\n  A (9–10): ${c.bands[0]}\n  B (7.5–8.5): ${c.bands[1]}\n  C (${rubric.bands[2].label.replace('Accepted ', '')}): ${c.bands[2]}\n  D (below 6): ${c.bands[3]}`).join('\n');
  return `You give FORMATIVE self-training feedback to a third-year dental student on a preclinical preparation on an acrylic typodont tooth, using ONLY the photographs. The student may be practising alone at home; your comments must help them correct the preparation step by step.
Exercise: ${rubric.title}. Tooth (FDI): #${tooth}. Preparation step: ${st[1]}.
Photos provided (labelled): ${views.join(', ')}.
- "occlusal" = 90° occlusal view: judge outline, extensions, width/isthmus, marginal ridges, cavosurface margins.
- "angled" = about 45° view: judge wall inclination/convergence, line angles, wall smoothness.
- "probe" = graduated periodontal probe standing in the cavity: read the millimetre markings to ESTIMATE DEPTH in mm and compare it with the rubric description.
Official Cairo University rubric criteria:
${crit}

Rules:
1. Comment ONLY on criteria of this step. Criteria marked [NOT IN THIS STEP] must be returned with "assessable": false.
2. Judge only what is clearly visible in the photo that shows it. Without a readable probe photo, depth is not assessable; without an angled photo, wall inclination and line angles are not assessable. Criteria with "Visibility from a photo: no" are never assessable.
3. For assessable criteria choose the band A, B, C or D whose description best matches, and write one short, specific, actionable comment (max 25 words) telling the student what to check or correct next.
4. If the probe markings are readable, report the estimated depth in mm in "depth_mm" (one decimal), otherwise null.
5. Report photo problems (not 90°, blur, shadows, glare, probe markings unreadable, tooth not centred).
6. overall_score: your 0–10 estimate for research only, using assessable criteria; null if fewer than half of this step's criteria are assessable. It is NEVER shown to the student.
7. Never state or imply a grade, pass or fail. The demonstrator's inspection of the physical tooth is the only official assessment.
Return JSON only: {"criteria":[{"id":"...","assessable":true,"band":"A","comment":"..."}],"depth_mm":1.5,"image_issues":["..."],"summary":"one or two encouraging sentences with the most important next correction","overall_score":7.5}`;
}

async function doPrepLens(u, data) {
  const entryId = String(data?.entryId || '');
  const ref = db.doc(`entries/${entryId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Record not found.');
  const e = snap.data();
  if (u.role === 'student' && e.uid !== u.uid) throw new HttpsError('permission-denied', 'Not your record.');
  const rubric = rubricById[e.rubricId];
  if (!rubric) throw new HttpsError('failed-precondition', 'This exercise has no rubric.');
  if (!e.photos?.length) throw new HttpsError('failed-precondition', 'Add a photo first.');
  if (!e.practice && !e.ai) {
    const others = (await db.collection('entries').where('uid', '==', e.uid).where('week', '==', e.week).get()).docs.filter((d) => d.id !== entryId && !d.data().practice && d.data().ai);
    if (others.length) throw new HttpsError('failed-precondition', 'Prep Lens is used on one tooth per week.');
  }
  const cfg = (await db.doc('config/course').get()).data() || {};
  if (cfg.aiEnabled === false) throw new HttpsError('resource-exhausted', 'quota: Prep Lens is switched off.');
  const ok = await takeQuota('preplens', cfg.aiDailyLimit ?? 1500, { uid: u.uid, limit: cfg.aiPerStudentDaily ?? 20 });
  if (!ok) throw new HttpsError('resource-exhausted', 'quota: daily Prep Lens limit reached.');

  const bucket = getStorage().bucket();
  // latest photo of each view (occlusal, angled, probe…), at most 3
  const latest = {}; for (const p of e.photos) latest[p.view] = p;
  const photos = Object.values(latest).slice(-3);
  const stage = PREP_STAGES.some((x) => x[0] === e.stage) ? e.stage : 'full';
  const parts = [{ text: prepLensPrompt(rubric, e.tooth, stage, photos.map((p) => p.view)) }];
  for (const p of photos) {
    const [buf] = await bucket.file(p.path).download();
    parts.push({ text: `View: ${p.view}` }, { inline_data: { mime_type: 'image/jpeg', data: buf.toString('base64') } });
  }
  const { text, model } = await gemini(parts, { json: true });
  let out;
  try { out = JSON.parse(text.replace(/^```json\s*|```$/g, '')); } catch (x) { throw new HttpsError('internal', 'Could not read the AI response. Try again.'); }
  const criteria = {};
  for (const c of rubric.criteria) {
    const r = (out.criteria || []).find((x) => x.id === c.id) || {};
    const assessable = c.photo !== 'no' && r.assessable === true && ['A', 'B', 'C', 'D'].includes(r.band);
    criteria[c.id] = assessable ? { assessable: true, band: r.band, comment: String(r.comment || '').slice(0, 220) } : { assessable: false, band: null, comment: 'Not assessable from photo — check with demonstrator.' };
  }
  const issues = Array.isArray(out.image_issues) ? out.image_issues.slice(0, 5).map(String) : [];
  const summary = (String(out.summary || '').slice(0, 400) + (issues.length ? ` Photo: ${issues.join('; ')}.` : '')).trim();
  const at = Date.now();
  const depthMm = typeof out.depth_mm === 'number' && out.depth_mm > 0 && out.depth_mm < 8 ? Math.round(out.depth_mm * 10) / 10 : null;
  const ai = { criteria, summary, model, promptVersion: PROMPT_VERSION, at, views: photos.map((p) => p.view), stage, depthMm };
  const aiHistory = [...(e.aiHistory || []), { stage, at, depthMm, summary, bands: Object.fromEntries(Object.entries(criteria).map(([k, v]) => [k, v.band])) }].slice(-20);
  await ref.update({ ai, aiHistory, updatedAt: at });
  const score = typeof out.overall_score === 'number' && out.overall_score >= 0 && out.overall_score <= 10 ? out.overall_score : null;
  // Research record: the latest full or finishing check of a lab tooth is what gets compared with the demonstrator.
  await db.doc(`research/${entryId}`).set({ entryId, uid: e.uid, section: e.section, rubricId: e.rubricId, week: e.week, practice: !!e.practice, stage, score, depthMm, criteria, model, promptVersion: PROMPT_VERSION, at, checks: aiHistory.length });
  return { ok: true };
}

let KNOWLEDGE = null;
async function doAssistant(u, data) {
  const hist = Array.isArray(data?.history) ? data.history.slice(-8) : [];
  if (!hist.length) throw new HttpsError('invalid-argument', 'Ask a question.');
  const ok = await takeQuota('assistant', 6000, { uid: u.uid, limit: 60 });
  if (!ok) throw new HttpsError('resource-exhausted', 'Daily question limit reached. Ask your demonstrator.');
  if (!KNOWLEDGE) {
    const mats = (await db.collection('materials').get()).docs.map((d) => d.data());
    KNOWLEDGE = buildKnowledge(mats);
    setTimeout(() => { KNOWLEDGE = null; }, 30 * 60e3);
  }
  const transcript = hist.map((m) => `${m.role === 'user' ? 'Student' : 'Assistant'}: ${String(m.text).slice(0, 1500)}`).join('\n');
  const { text } = await gemini([{ text: `${transcript}\nAssistant:` }], { system: KNOWLEDGE + `\nThe person asking is a ${u.role}.`, temperature: 0.3 });
  return { text: text.trim().slice(0, 3000) };
}

// ---------------- statistics & reports ----------------
async function buildStats() {
  const all = await loadAll();
  const st = computeStats({ ...all, weeks: PRACTICAL_WEEKS, today: cairoDate() });
  await db.doc('reports/latest').set({ stats: JSON.parse(JSON.stringify(st)), at: Date.now() });
  return { st, all };
}

async function doRefresh(u) {
  if (!['director', 'admin', 'hod'].includes(u.role)) throw new HttpsError('permission-denied', 'Not allowed.');
  await buildStats();
  return { ok: true };
}

// Direct calls (used when the platform allows public invocation).
export const prepLens = onCall({ timeoutSeconds: 120, memory: '512MiB', invoker: 'public' }, async (req) => doPrepLens(await caller(req), req.data));
export const assistant = onCall({ timeoutSeconds: 60, invoker: 'public' }, async (req) => doAssistant(await caller(req), req.data));
export const refreshStats = onCall({ timeoutSeconds: 300, memory: '1GiB', invoker: 'public' }, async (req) => doRefresh(await caller(req)));

// Request queue: the website writes jobs/{id}; this trigger runs it and writes the result back.
// Needs no public access, so it works under strict organisation policies.
const HANDLERS = { prepLens: doPrepLens, assistant: doAssistant, refreshStats: doRefresh };
export const runJob = onDocumentCreated({ document: 'jobs/{id}', timeoutSeconds: 300, memory: '1GiB' }, async (event) => {
  const snap = event.data; if (!snap) return;
  const j = snap.data();
  try {
    const fn = HANDLERS[j.type];
    if (!fn) throw new HttpsError('invalid-argument', 'Unknown request.');
    const u = await userByEmail(j.email);
    const result = await fn(u, j.data || {});
    await snap.ref.update({ status: 'done', result: result || null, doneAt: Date.now() });
  } catch (e) {
    await snap.ref.update({ status: 'error', error: String(e.message || e).slice(0, 300), code: e.code || 'internal', doneAt: Date.now() });
  }
});
export const nightlyStats = onSchedule({ schedule: '0 19 * * *', timeZone: 'Africa/Cairo', timeoutSeconds: 300, memory: '1GiB' }, async () => { await buildStats(); });

function mailer() {
  return nodemailer.createTransport({ host: SMTP_HOST.value(), port: 465, secure: true, auth: { user: SMTP_USER.value(), pass: SMTP_PASS.value() } });
}
async function emailsFor(roles) {
  const snap = await db.collection('roster').where('role', 'in', roles).get();
  return [...new Set(snap.docs.map((d) => String(d.data().email || d.id).trim().toLowerCase()).filter((e) => e.includes('@')))];
}
async function sendReport(to, subject, html) {
  if (!to.length || !SMTP_USER.value() || !SMTP_PASS.value()) { console.log('Report not sent:', !to.length ? 'no recipients' : 'SMTP not configured'); return; }
  await mailer().sendMail({ from: `Conservative Dentistry Logbook <${SMTP_USER.value()}>`, to: SMTP_USER.value(), bcc: to, subject, html });
  console.log('Report sent to', to.length);
}

// The 09:00 daily report to the Head of Department and Vice Dean is now built by .github/workflows/daily-report.yml
// (functions/daily-report.mjs) and sent from the Course Director's own Gmail by a scheduled Claude task, so no SMTP password is needed.

export const weeklyReport = onSchedule({ schedule: '0 9 * * 5', timeZone: 'Africa/Cairo', timeoutSeconds: 300, memory: '1GiB' }, async () => {
  const all = await loadAll();
  const to = (all.config.reportRecipients || []).filter(Boolean);
  if (!to.length || !SMTP_USER.value() || !SMTP_PASS.value()) return;
  const since = Date.now() - 7 * 86400e3;
  const rows = all.students.map((s) => {
    const mine = all.entries.filter((e) => e.uid === s.uid && e.status !== 'draft');
    const week = mine.filter((e) => (e.submittedAt || e.createdAt) >= since);
    const rev = mine.filter((e) => e.review);
    return [s.code, s.name, s.section, week.length, week.filter((e) => e.review?.status === 'Completed').length, mine.length, rev.filter((e) => e.review.status === 'Completed').length, rev.length ? Math.round((rev.reduce((a, e) => a + e.review.grade, 0) / rev.length) * 100) / 100 : ''];
  }).sort((a, b) => a[2] - b[2] || String(a[0]).localeCompare(String(b[0])));
  const head = [['Teeth per student — weekly report'], ['Period', `${cairoDate(new Date(since))} to ${cairoDate()}`], ['Generated', new Date().toISOString()], ['Confidential', 'Student academic records — authorised staff only'], [], ['Student number', 'Name', 'Section', 'Teeth this week', 'Completed this week', 'Teeth to date', 'Completed to date', 'Mean official grade']];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([...head, ...rows]), 'Teeth per student');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  await mailer().sendMail({ from: `Conservative Dentistry Logbook <${SMTP_USER.value()}>`, to, subject: `Weekly teeth-per-student report — ${cairoDate()}`, html: `<p>Attached: teeth submitted and completed per student for the past week and to date (${rows.length} students).</p>`, attachments: [{ filename: `teeth_per_student_${cairoDate()}.xlsx`, content: buf }] });
});
