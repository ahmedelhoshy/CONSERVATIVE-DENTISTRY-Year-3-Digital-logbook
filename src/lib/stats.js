// Pure statistics used by the dashboards (browser) and by the nightly report job (Cloud Functions).
// Input arrays are plain objects as stored in the database.

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null);

export function computeStats({ students, sessions, attendance, entries, weeks, config = {}, today, nowMs = Date.now() }) {
  const absenceLimit = config.absenceLimitPct ?? 25;
  const passMark = 6; // 60 % of 10
  const bySec = {};
  for (let s = 1; s <= 18; s++) bySec[s] = { section: s, students: 0, labHeld: 0, labExpected: 0, labPresent: 0, lecPresent: 0, lecExpected: 0, reqDue: 0, reqDone: 0, grades: [], selfGap: [], aiGap: [], pending: 0, overdue: 0 };
  for (const st of students) if (bySec[st.section]) bySec[st.section].students++;

  const pastSessions = sessions.filter((s) => s.date < today || (s.date === today && s.status === 'closed'));
  const heldLectures = pastSessions.filter((s) => s.type === 'lecture' && s.attendanceRequired !== false);
  const heldLabs = pastSessions.filter((s) => s.type === 'lab');

  // attendance index
  const att = {};
  for (const a of attendance) { if (a.status === 'confirmed') (att[a.uid] = att[a.uid] || new Set()).add(a.sid); }
  const pendingAtt = attendance.filter((a) => a.status === 'recorded').length;

  // per student
  const stu = {};
  for (const st of students) stu[st.uid] = { uid: st.uid, name: st.name, code: st.code, section: st.section, lecExp: 0, lecPres: 0, labExp: 0, labPres: 0, done: 0, due: 0, grades: [] };
  for (const L of heldLectures) for (const st of students) { const x = stu[st.uid]; x.lecExp++; if (att[st.uid]?.has(L.id)) x.lecPres++; }
  for (const L of heldLabs) for (const st of students) if (st.section === L.section) { const x = stu[st.uid]; x.labExp++; if (att[st.uid]?.has(L.id)) x.labPres++; }

  // requirements due = sum of req for weeks fully passed
  const passedWeeks = weeks.filter((w) => w.to < today && w.req > 0);
  const reqDue = passedWeeks.reduce((a, w) => a + w.req, 0);
  for (const st of students) stu[st.uid].due = reqDue;

  const reviewTimes = {}; const demWork = {};
  const critDist = {}; // rubricId|criterion -> section -> counts
  const weekTrend = {};
  for (const w of weeks) weekTrend[w.w] = { week: w.w, from: w.from, labExp: 0, labPres: 0, teeth: 0, reviewed: 0, grades: [] };
  for (const L of heldLabs) { const n = students.filter((s) => s.section === L.section).length; const p = students.filter((s) => s.section === L.section && att[s.uid]?.has(L.id)).length; if (weekTrend[L.week]) { weekTrend[L.week].labExp += n; weekTrend[L.week].labPres += p; } }

  let aiWithin1 = 0, aiN = 0, selfWithin1 = 0, selfN = 0;
  const overdueList = [];
  for (const e of entries) {
    if (e.status === 'draft') continue;
    const x = stu[e.uid]; const sec = bySec[e.section];
    if (weekTrend[e.week]) weekTrend[e.week].teeth++;
    if (e.review) {
      if (weekTrend[e.week]) { weekTrend[e.week].reviewed++; weekTrend[e.week].grades.push(e.review.grade); }
      if (x && e.review.status === 'Completed' && weeks.find((w) => w.w === e.week && w.to < today)) x.done++;
      if (x) x.grades.push(e.review.grade);
      if (sec) {
        sec.grades.push(e.review.grade);
        if (e.self?.grade != null) { sec.selfGap.push(e.self.grade - e.review.grade); selfN++; if (Math.abs(e.self.grade - e.review.grade) <= 1) selfWithin1++; }
        if (e.ai?.score != null) { sec.aiGap.push(e.ai.score - e.review.grade); aiN++; if (Math.abs(e.ai.score - e.review.grade) <= 1) aiWithin1++; }
      }
      const by = e.review.byName || e.review.by;
      demWork[by] = demWork[by] || { name: by, reviews: 0, hours: [], sections: new Set() };
      demWork[by].reviews++; demWork[by].sections.add(e.section);
      const sub = e.submittedAt || e.self?.at || e.createdAt;
      if (sub && e.review.at) demWork[by].hours.push((e.review.at - sub) / 3600e3);
      if (e.review.picks) for (const [cid, band] of Object.entries(e.review.picks)) {
        const k = `${e.rubricId}|${cid}`; critDist[k] = critDist[k] || {}; critDist[k][e.section] = critDist[k][e.section] || { A: 0, B: 0, C: 0, D: 0 };
        if (band) critDist[k][e.section][band]++;
      }
    } else if (e.status === 'submitted') {
      if (sec) sec.pending++;
      const sub = e.submittedAt || e.self?.at || e.createdAt;
      if (sub && nowMs - sub > 48 * 3600e3) { if (sec) sec.overdue++; overdueList.push({ id: e.id, name: e.name, code: e.code, section: e.section, week: e.week, hours: Math.round((nowMs - sub) / 3600e3) }); }
    }
  }

  // section aggregates
  const allGrades = Object.values(bySec).flatMap((s) => s.grades);
  const overallMean = mean(allGrades);
  const sections = Object.values(bySec).map((s) => {
    const ss = Object.values(stu).filter((x) => x.section === s.section);
    const labExp = ss.reduce((a, x) => a + x.labExp, 0), labPres = ss.reduce((a, x) => a + x.labPres, 0);
    const lecExp = ss.reduce((a, x) => a + x.lecExp, 0), lecPres = ss.reduce((a, x) => a + x.lecPres, 0);
    const due = ss.reduce((a, x) => a + x.due, 0), done = ss.reduce((a, x) => a + Math.min(x.done, x.due), 0);
    const m = mean(s.grades);
    return {
      section: s.section, students: s.students, labAttendance: pct(labPres, labExp), lectureAttendance: pct(lecPres, lecExp),
      completion: pct(done, due), meanGrade: r2(m), gradeDiff: m != null && overallMean != null ? r2(m - overallMean) : null,
      reviews: s.grades.length, pending: s.pending, overdue: s.overdue, selfGap: r2(mean(s.selfGap)), aiGap: r2(mean(s.aiGap)),
      labsHeld: heldLabs.filter((l) => l.section === s.section).length,
    };
  });

  // at-risk
  const atRisk = [];
  for (const x of Object.values(stu)) {
    const reasons = [];
    const lecAbs = x.lecExp ? 100 - (x.lecPres / x.lecExp) * 100 : 0;
    const labAbs = x.labExp ? 100 - (x.labPres / x.labExp) * 100 : 0;
    if (lecAbs > absenceLimit) reasons.push(`Lecture absence ${Math.round(lecAbs)}%`);
    if (labAbs > absenceLimit) reasons.push(`Lab absence ${Math.round(labAbs)}%`);
    const gm = mean(x.grades);
    if (gm != null && gm < passMark) reasons.push(`Mean practical grade ${r1(gm)}/10`);
    if (x.due && x.done < x.due * 0.7) reasons.push(`Requirements ${x.done}/${x.due}`);
    if (reasons.length) atRisk.push({ uid: x.uid, name: x.name, code: x.code, section: x.section, reasons, meanGrade: r1(gm), lecAtt: x.lecExp ? Math.round((x.lecPres / x.lecExp) * 100) : null, labAtt: x.labExp ? Math.round((x.labPres / x.labExp) * 100) : null, done: x.done, due: x.due });
  }
  atRisk.sort((a, b) => b.reasons.length - a.reasons.length || a.section - b.section);

  const totals = {
    enrolled: students.length,
    lectureAttendance: pct(Object.values(stu).reduce((a, x) => a + x.lecPres, 0), Object.values(stu).reduce((a, x) => a + x.lecExp, 0)),
    labAttendance: pct(Object.values(stu).reduce((a, x) => a + x.labPres, 0), Object.values(stu).reduce((a, x) => a + x.labExp, 0)),
    completion: pct(Object.values(stu).reduce((a, x) => a + Math.min(x.done, x.due), 0), Object.values(stu).reduce((a, x) => a + x.due, 0)),
    atRisk: atRisk.length, overdue: overdueList.length, pendingAttendance: pendingAtt,
    teeth: entries.filter((e) => e.status !== 'draft').length, reviewed: entries.filter((e) => e.review).length,
    meanGrade: r2(overallMean), passRate: pct(allGrades.filter((g) => g >= passMark).length, allGrades.length),
    selfWithin1: pct(selfWithin1, selfN), aiWithin1: pct(aiWithin1, aiN), aiCompared: aiN,
    lecturesHeld: heldLectures.length, labsHeld: heldLabs.length,
  };
  const demonstrators = Object.values(demWork).map((d) => ({ name: d.name, reviews: d.reviews, sections: [...d.sections].sort((a, b) => a - b).join(', '), medianHours: r1(median(d.hours)) })).sort((a, b) => b.reviews - a.reviews);
  const trend = Object.values(weekTrend).filter((w) => w.from <= today).map((w) => ({ week: w.week, labAttendance: pct(w.labPres, w.labExp), teeth: w.teeth, reviewed: w.reviewed, meanGrade: r2(mean(w.grades)) }));
  const todaySessions = sessions.filter((s) => s.date === today).sort((a, b) => (a.start || '').localeCompare(b.start || ''));
  return { generatedAt: nowMs, today, totals, sections, atRisk, overdue: overdueList.sort((a, b) => b.hours - a.hours), demonstrators, trend, critDist, todaySessions: todaySessions.map((s) => ({ id: s.id, type: s.type, section: s.section || null, title: s.title, start: s.start, end: s.end, status: s.status })) };
}

function median(a) { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
