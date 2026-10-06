// Per-reviewer statistics (Course Director only). Output is encrypted by the workflow; nothing personal is printed.
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { writeFileSync } from 'node:fs';
initializeApp({ credential: applicationDefault(), projectId: process.env.FB_PROJECT_ID });
const db = getFirestore();
const ents = (await db.collection('entries').get()).docs.map((d) => d.data()).filter((e) => !e.practice);
const att = (await db.collection('attendance').get()).docs.map((d) => d.data());
const roster = (await db.collection('roster').get()).docs.map((d) => ({ id: d.id, ...d.data() })).filter((r) => r.role !== 'student');
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
  attendance: att.filter((a) => a.type === 'lab').map((a) => ({ section: a.section, week: a.week, status: a.status, method: a.method, by: a.by || null, byName: a.byName || null, at: a.at || null, decidedAt: a.decidedAt || null })),
};
writeFileSync(process.argv[2], JSON.stringify(out));
console.log(`::notice title=Staff stats::teeth ${out.teeth.length} · reviewed ${out.teeth.filter((t) => t.review).length} · lab attendance ${out.attendance.length} · staff ${out.staff.length}`);
