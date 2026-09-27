// Cloud Functions for the CU Conservative Dentistry logbook.
// - prepLens: criterion-based AI feedback on a preparation photo (Gemini), never a grade.
// - assistant: course assistant limited to approved material.
// - refreshStats / nightlyStats (19:00 Cairo): dashboard aggregate in reports/latest.
// - dailyReport (09:00 Cairo): email summary of the previous day to configured recipients.
// - weeklyReport (Friday 09:00 Cairo): teeth per student, Excel attachment.
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret, defineString } from 'firebase-functions/params';
import { setGlobalOptions } from 'firebase-functions/v2';
import nodemailer from 'nodemailer';
import * as XLSX from 'xlsx';
import { computeStats } from './shared/stats.js';
import { PRACTICAL_WEEKS, COURSE } from './shared/course.js';
import { rubricById } from './shared/rubrics.js';
import { buildKnowledge } from './knowledge.js';

initializeApp();
const db = getFirestore();
setGlobalOptions({ region: 'europe-west1', maxInstances: 10 });

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const SMTP_PASS = defineSecret('SMTP_PASS');
const GEMINI_MODEL = defineString('GEMINI_MODEL', { default: 'gemini-flash-lite-latest' });
const SMTP_HOST = defineString('SMTP_HOST', { default: 'smtp.gmail.com' });
const SMTP_USER = defineString('SMTP_USER', { default: '' });
const SITE_URL = defineString('SITE_URL', { default: '' });
const PROMPT_VERSION = 'prep-lens-v1';

const cairoDate = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(d);

async function caller(req) {
  const email = (req.auth?.token?.email || '').toLowerCase();
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
  const body = { contents: [{ role: 'user', parts }], generationConfig: { temperature, ...(json ? { responseMimeType: 'application/json' } : {}) } };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL.value()}:generateContent`;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY.value() }, body: JSON.stringify(body) });
  if (!res.ok) throw new HttpsError('unavailable', `AI service error ${res.status}`);
  const j = await res.json();
  const text = (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
  return { text, model: j.modelVersion || GEMINI_MODEL.value() };
}

function prepLensPrompt(rubric, tooth) {
  const crit = rubric.criteria.map((c) => `- id "${c.id}" — ${c.name} (${c.group}). Visibility from a photo: ${c.photo}.\n  A (9–10): ${c.bands[0]}\n  B (7.5–8.5): ${c.bands[1]}\n  C (${rubric.bands[2].label.replace('Accepted ', '')}): ${c.bands[2]}\n  D (below 6): ${c.bands[3]}`).join('\n');
  return `You give PRELIMINARY formative feedback to a third-year dental student on a preclinical preparation on an acrylic typodont tooth, using ONLY the photograph(s).
Exercise: ${rubric.title}. Tooth (FDI): #${tooth}.
Official Cairo University rubric criteria:
${crit}

Rules:
1. Judge only what is clearly visible. If a criterion cannot be judged from the photo (depth without a readable probe, wall inclination, internal line angles, gingival floor, contacts), set "assessable": false and "band": null.
2. Criteria marked "Visibility from a photo: no" are always not assessable.
3. For assessable criteria choose the band A, B, C or D whose description best matches, and write one short, specific, encouraging comment (max 25 words) naming what to check or correct.
4. Report image problems (angle not 90°, blur, shadows, no scale reference, tooth not centred).
5. overall_score: your estimate on 0–10 using only assessable criteria, or null if fewer than half are assessable. It is for research and is NOT shown to the student.
6. Never state a final grade. The demonstrator's inspection of the physical tooth is the official assessment.
Return JSON only: {"criteria":[{"id":"...","assessable":true,"band":"A","comment":"..."}],"image_issues":["..."],"summary":"one or two sentences for the student","overall_score":7.5}`;
}

export const prepLens = onCall({ secrets: [GEMINI_API_KEY], timeoutSeconds: 120, memory: '512MiB' }, async (req) => {
  const u = await caller(req);
  const entryId = String(req.data?.entryId || '');
  const ref = db.doc(`entries/${entryId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Record not found.');
  const e = snap.data();
  if (u.role === 'student' && e.uid !== u.uid) throw new HttpsError('permission-denied', 'Not your record.');
  const rubric = rubricById[e.rubricId];
  if (!rubric) throw new HttpsError('failed-precondition', 'This exercise has no rubric.');
  if (!e.photos?.length) throw new HttpsError('failed-precondition', 'Add a photo first.');
  const cfg = (await db.doc('config/course').get()).data() || {};
  if (cfg.aiEnabled === false) throw new HttpsError('resource-exhausted', 'quota: Prep Lens is switched off.');
  const ok = await takeQuota('preplens', cfg.aiDailyLimit ?? 1500, { uid: u.uid, limit: 12 });
  if (!ok) throw new HttpsError('resource-exhausted', 'quota: daily Prep Lens limit reached.');

  const bucket = getStorage().bucket();
  const photos = e.photos.slice(-2); // latest one or two views
  const parts = [{ text: prepLensPrompt(rubric, e.tooth) }];
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
  await ref.update({ ai: { criteria, summary, model, promptVersion: PROMPT_VERSION, at, views: photos.map((p) => p.view) }, updatedAt: at });
  const score = typeof out.overall_score === 'number' && out.overall_score >= 0 && out.overall_score <= 10 ? out.overall_score : null;
  await db.doc(`research/${entryId}`).set({ entryId, uid: e.uid, section: e.section, rubricId: e.rubricId, week: e.week, score, criteria, model, promptVersion: PROMPT_VERSION, at });
  return { ok: true };
});

let KNOWLEDGE = null;
export const assistant = onCall({ secrets: [GEMINI_API_KEY], timeoutSeconds: 60 }, async (req) => {
  const u = await caller(req);
  const hist = Array.isArray(req.data?.history) ? req.data.history.slice(-8) : [];
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
});

// ---------------- statistics & reports ----------------
async function loadAll() {
  const [students, sessions, attendance, entries, research, cfg] = await Promise.all([
    db.collection('roster').where('role', '==', 'student').get(), db.collection('sessions').get(), db.collection('attendance').get(),
    db.collection('entries').get(), db.collection('research').get(), db.doc('config/course').get(),
  ]);
  const rs = {}; research.docs.forEach((d) => { rs[d.id] = d.data().score; });
  const ents = entries.docs.map((d) => { const e = { id: d.id, ...d.data() }; if (e.ai && rs[d.id] != null) e.ai = { ...e.ai, score: rs[d.id] }; return e; });
  return {
    students: students.docs.map((d) => ({ id: d.id, ...d.data(), uid: String(d.data().code) })),
    sessions: sessions.docs.map((d) => ({ id: d.id, ...d.data() })), attendance: attendance.docs.map((d) => ({ id: d.id, ...d.data() })),
    entries: ents, config: cfg.exists ? cfg.data() : {},
  };
}
async function buildStats() {
  const all = await loadAll();
  const st = computeStats({ ...all, weeks: PRACTICAL_WEEKS, today: cairoDate() });
  await db.doc('reports/latest').set({ stats: JSON.parse(JSON.stringify(st)), at: Date.now() });
  return { st, all };
}

export const refreshStats = onCall({ timeoutSeconds: 300, memory: '1GiB' }, async (req) => {
  const u = await caller(req);
  if (!['director', 'admin', 'hod'].includes(u.role)) throw new HttpsError('permission-denied', 'Not allowed.');
  await buildStats();
  return { ok: true };
});
export const nightlyStats = onSchedule({ schedule: '0 19 * * *', timeZone: 'Africa/Cairo', timeoutSeconds: 300, memory: '1GiB' }, async () => { await buildStats(); });

function mailer() {
  return nodemailer.createTransport({ host: SMTP_HOST.value(), port: 465, secure: true, auth: { user: SMTP_USER.value(), pass: SMTP_PASS.value() } });
}
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const dailyReport = onSchedule({ schedule: '0 9 * * *', timeZone: 'Africa/Cairo', secrets: [SMTP_PASS], timeoutSeconds: 300, memory: '1GiB' }, async () => {
  const { st, all } = await buildStats();
  const cfg = all.config;
  const to = (cfg.reportRecipients || []).filter(Boolean);
  if (!to.length || !SMTP_USER.value()) return;
  const y = cairoDate(new Date(Date.now() - 86400e3));
  const yAtt = all.attendance.filter((a) => a.date === y);
  const ySess = all.sessions.filter((s) => s.date === y);
  const yEnt = all.entries.filter((e) => e.date === y && e.status !== 'draft');
  const yRev = all.entries.filter((e) => e.review && cairoDate(new Date(e.review.at)) === y);
  const rows = ySess.sort((a, b) => (a.start || '').localeCompare(b.start || '')).map((s) => {
    const exp = s.type === 'lab' ? all.students.filter((x) => x.section === s.section).length : all.students.length;
    const conf = yAtt.filter((a) => a.sid === s.id && a.status === 'confirmed').length;
    const pend = yAtt.filter((a) => a.sid === s.id && a.status === 'recorded').length;
    return `<tr><td>${s.type === 'lecture' ? `Lecture ${s.lectureNo}` : `Lab S${s.section}`}</td><td>${s.start}–${s.end}</td><td style="text-align:right">${conf}/${exp}</td><td style="text-align:right">${pend}</td></tr>`;
  }).join('');
  const T = st.totals;
  const html = `<div style="font-family:Arial,sans-serif;color:#13262A;max-width:680px">
<h2 style="color:#0B4A55">Daily report — ${esc(y)}</h2><p>Year 3 Preclinical Conservative Dentistry · Faculty of Dentistry, Cairo University</p>
<h3>Yesterday</h3><ul><li>Sessions held: ${ySess.length}</li><li>Teeth submitted: ${yEnt.length} · reviewed by demonstrators: ${yRev.length}</li><li>Prep Lens feedback requests: ${yEnt.filter((e) => e.ai).length}</li></ul>
${rows ? `<table cellpadding="6" style="border-collapse:collapse;border:1px solid #D3DDDA"><tr style="background:#E8EEEC"><th align="left">Session</th><th align="left">Time</th><th>Confirmed</th><th>Awaiting</th></tr>${rows}</table>` : ''}
<h3>Course to date</h3><ul><li>Lecture attendance ${T.lectureAttendance ?? '–'}% · lab attendance ${T.labAttendance ?? '–'}%</li><li>Requirements completed ${T.completion ?? '–'}% · mean official grade ${T.meanGrade ?? '–'}</li><li>Students needing attention: <b>${T.atRisk}</b> · reviews overdue &gt;48 h: <b>${T.overdue}</b></li></ul>
${st.sections.filter((s) => s.overdue || (s.labAttendance != null && s.labAttendance < 80)).map((s) => `<p>⚠ Section ${s.section}: ${s.overdue ? `${s.overdue} overdue review(s)` : ''} ${s.labAttendance != null && s.labAttendance < 80 ? `lab attendance ${s.labAttendance}%` : ''}</p>`).join('')}
${SITE_URL.value() ? `<p><a href="${esc(SITE_URL.value())}" style="background:#0B4A55;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Open the live dashboard</a></p>` : ''}
<p style="color:#74878A;font-size:12px">Aggregated figures. Student-level detail is available only inside the platform to authorised staff. Generated ${new Date().toISOString()}.</p></div>`;
  await mailer().sendMail({ from: `Conservative Dentistry Logbook <${SMTP_USER.value()}>`, to, subject: `Daily report ${y} — Year 3 Conservative Dentistry`, html });
  await db.doc('config/course').set({ lastReportAt: Date.now() }, { merge: true });
});

export const weeklyReport = onSchedule({ schedule: '0 9 * * 5', timeZone: 'Africa/Cairo', secrets: [SMTP_PASS], timeoutSeconds: 300, memory: '1GiB' }, async () => {
  const all = await loadAll();
  const to = (all.config.reportRecipients || []).filter(Boolean);
  if (!to.length || !SMTP_USER.value()) return;
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
