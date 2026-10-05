// Builds one section's week sheet data (attendance + requirement grades). Output is encrypted by the workflow; nothing is printed.
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { writeFileSync } from 'node:fs';
initializeApp({ credential: applicationDefault(), projectId: process.env.FB_PROJECT_ID });
const db = getFirestore();
const sec = Number(process.env.SECTION), week = Number(process.env.WEEK);
const sess = (await db.collection('sessions').where('section', '==', sec).get()).docs.map((d) => ({ id: d.id, ...d.data() })).filter((s) => s.type === 'lab' && Number(s.week) === week);
const att = {};
for (const s of sess) for (const d of (await db.collection('attendance').where('sid', '==', s.id).get()).docs) { const a = d.data(); if (a.status === 'confirmed') att[String(a.code)] = s.id; }
const ents = (await db.collection('entries').where('section', '==', sec).get()).docs.map((d) => d.data()).filter((e) => Number(e.week) === week && !e.practice);
const by = {};
for (const e of ents.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))) (by[String(e.code)] = by[String(e.code)] || []).push({ status: e.status, grade: e.review?.grade ?? null, tooth: e.tooth || '' });
const roster = (await db.collection('roster').where('section', '==', sec).get()).docs.map((d) => d.data()).filter((r) => r.role === 'student');
writeFileSync(process.argv[2], JSON.stringify({ sec, week, sessions: sess.map((s) => ({ id: s.id, date: s.date, status: s.status })), rows: roster.map((r) => ({ code: String(r.code), name: r.name, present: att[String(r.code)] || null, teeth: by[String(r.code)] || [] })) }));
console.log(`::notice title=Export::section ${sec} week ${week} · sessions ${sess.length} · students ${roster.length} · present ${Object.keys(att).length} · teeth ${ents.length}`);
