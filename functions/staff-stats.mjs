// Per-reviewer statistics (Course Director only). Output is encrypted by the workflow; nothing personal is printed.
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { writeFileSync } from 'node:fs';
initializeApp({ credential: applicationDefault(), projectId: process.env.FB_PROJECT_ID });
const db = getFirestore();
const ents = (await db.collection('entries').get()).docs.map((d) => d.data()).filter((e) => !e.practice);
const att = (await db.collection('attendance').get()).docs.map((d) => d.data());
const allRoster = (await db.collection('roster').get()).docs.map((d) => ({ id: d.id, ...d.data() }));
const roster = allRoster.filter((r) => r.role !== 'student');
const sessions = (await db.collection('sessions').get()).docs.map((d) => ({ id: d.id, ...d.data() }));
const out = {
  generatedAt: Date.now(),
  staff: roster.map((r) => ({ email: r.id, name: r.name, role: r.role, sections: r.sections || [], lastLogin: r.lastLogin || null })),
  teeth: ents.map((e) => ({ section: e.section, week: e.week, status: e.status, createdAt: e.createdAt || null, submittedAt: e.submittedAt || null,
    self: e.self && !e.self.afterReview ? e.self.grade ?? null : null, ai: e.ai?.score ?? null,
    review: e.review ? { by: e.review.by, byName: e.review.byName, grade: e.review.grade, status: e.review.status, at: e.review.at, mode: e.review.mode || null,
      defects: Object.values(e.review.picks || {}).filter((b) => b && b !== 'A').length, bands: Object.values(e.review.picks || {}).filter((b) => b && b !== 'A'), feedbackLen: (e.review.feedback || '').length } : null,
    redo: (e.history || []).filter((h) => h.event === 'resubmitted').length, changed: (e.history || []).filter((h) => h.event === 'review-changed').length })),
  surveys: (await db.collection('surveys').get()).docs.map((d) => d.data()).map((v) => ({ sid: v.sid, role: v.role, section: v.section || null, answers: v.answers || {}, comment: v.comment || '', at: v.at || null })),
  messages: (await db.collection('messages').get()).docs.map((d) => d.data()).map((m) => ({ uid: String(m.uid || ''), section: m.section || null, from: m.from || null, fromName: m.fromName || null, fromRole: m.fromRole || null, at: m.at || null })),
  sessions: sessions.map((x) => ({ id: x.id, type: x.type, section: x.section ?? null, week: x.week ?? null, lectureNo: x.lectureNo ?? null, date: x.date || null, status: x.status || null, required: x.attendanceRequired !== false })),
  // Per-student aggregates for the student KPI dashboard (no names or student numbers).
  students: allRoster.filter((r) => r.role === 'student').map((r, i) => { const ids = new Set([r.uid, r.code, r.id].filter(Boolean).map(String)); const me = (x) => ids.has(String(x.uid || '')) || ids.has(String(x.code || ''));
    const mine = att.filter((a) => me(a) && a.status === 'confirmed'); const t = ents.filter(me);
    return { i, section: r.section ?? null, signedIn: !!r.lastLogin, lab: mine.filter((a) => a.type === 'lab').map((a) => a.sid), lec: mine.filter((a) => a.type === 'lecture').map((a) => a.sid),
      teeth: t.map((e) => ({ week: e.week, status: e.status, grade: e.review?.grade ?? null, paper: e.source === 'paper' })) }; }),
  attendance: att.filter((a) => a.type === 'lab').map((a) => ({ section: a.section, week: a.week, status: a.status, method: a.method, by: a.by || null, byName: a.byName || null, at: a.at || null, decidedAt: a.decidedAt || null })),
};
writeFileSync(process.argv[2], JSON.stringify(out));
console.log(`::notice title=Staff stats::teeth ${out.teeth.length} · reviewed ${out.teeth.filter((t) => t.review).length} · lab attendance ${out.attendance.length} · staff ${out.staff.length}`);
