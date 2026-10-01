// Fictional demo data. No real student or staff personal data is used here.
import { PRACTICAL_WEEKS, LECTURES, LAB_SLOTS } from '../data/course.js';
import { rubricById } from '../data/rubrics.js';

export const DEMO_TODAY = '2026-11-02'; // Monday of practical week 7 — gives the dashboards history to show.
export const DEMO_STUDENTS_PER_SECTION = 10;

const FIRST_M = ['Ahmed', 'Omar', 'Youssef', 'Mostafa', 'Karim', 'Hassan', 'Ali', 'Mahmoud', 'Ziad', 'Seif', 'Adham', 'Tarek', 'Hazem', 'Marwan', 'Nour'];
const FIRST_F = ['Mariam', 'Salma', 'Nada', 'Habiba', 'Farida', 'Malak', 'Jana', 'Rana', 'Hana', 'Laila', 'Yasmin', 'Aya', 'Dina', 'Shahd', 'Nourhan'];
const LAST = ['Adel', 'Samir', 'Fathy', 'Gamal', 'Hosny', 'Kamel', 'Lotfy', 'Mansour', 'Nabil', 'Ramzy', 'Sabry', 'Tawfik', 'Wahba', 'Zaki', 'Farouk', 'Helmy', 'Ezzat', 'Shawky'];
export const DEMO_DEMONSTRATORS = ['Dr. Mona Adel', 'Dr. Karim Fawzy', 'Dr. Rania Samy', 'Dr. Omar Nagy', 'Dr. Heba Lotfy', 'Dr. Sherif Anwar', 'Dr. Dalia Mourad', 'Dr. Amr Salah', 'Dr. Noha Emad'];

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const DAY = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const iso = (d) => d.toISOString().slice(0, 10);
const ms = (date, hhmm) => new Date(`${date}T${hhmm}:00+03:00`).getTime();

export function labDatesForWeek(week, section) {
  const out = [];
  const start = new Date(week.from + 'T12:00:00Z'), end = new Date(week.to + 'T12:00:00Z');
  for (const [day, s, e] of LAB_SLOTS[section] || []) {
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) if (d.getUTCDay() === DAY[day]) out.push({ date: iso(d), start: s, end: e });
  }
  return out.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}

export function seedDemo() {
  const r = rng(20260927);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const db = { roster: {}, users: {}, sessions: {}, attendance: {}, entries: {}, announcements: {}, materials: {}, projects: {}, messages: {}, audit: {}, config: {}, codes: {} };
  const now = ms(DEMO_TODAY, '09:00');

  db.config.course = {
    absenceLimitPct: 25, minTeethPerLab: 2, aiEnabled: true, aiDailyLimit: 1500, aiUsedToday: 212,
    reportRecipients: ['course.director@example.edu', 'head.department@example.edu', 'vice.dean@example.edu'],
    reportTimeDaily: '09:00', dashboardRefresh: '19:00', lastAggregate: now - 14 * 3600e3,
  };

  // Staff
  const staff = [
    { uid: 'demo-director', name: 'Prof. Ahmed El-Hoshy', role: 'director', email: 'course.director@example.edu' },
    { uid: 'demo-hod', name: 'Head of Department (demo)', role: 'hod', email: 'head.department@example.edu' },
    { uid: 'demo-vicedean', name: 'Vice Dean for Student Affairs (demo)', role: 'vicedean', email: 'vice.dean@example.edu' },
    { uid: 'demo-lecturer', name: 'Dr. Lecturer (demo)', role: 'lecturer', email: 'lecturer@example.edu', lectures: [2, 6], sections: [4, 8] },
  ];
  DEMO_DEMONSTRATORS.forEach((n, i) => {
    staff.push({ uid: `demo-dem-${i + 1}`, name: n, role: 'demonstrator', email: `demonstrator${i + 1}@example.edu`, sections: [i * 2 + 1, i * 2 + 2] });
  });
  for (const s of staff) { db.users[s.uid] = { ...s }; db.roster[s.email] = { ...s }; }
  const demName = (sec) => staff.find((s) => s.role === 'demonstrator' && s.sections.includes(sec));

  // Students
  const students = [];
  for (let sec = 1; sec <= 18; sec++) {
    for (let k = 0; k < DEMO_STUDENTS_PER_SECTION; k++) {
      const f = r() < 0.55 ? pick(FIRST_F) : pick(FIRST_M);
      const name = `${f} ${pick(LAST)} ${pick(LAST)}`;
      const code = String(42240000 + sec * 100 + k);
      const uid = code; // students are identified by university code
      const risk = r() < 0.08; // a few students with weak attendance / grades
      const skill = risk ? 5.2 + r() * 1.2 : 6.6 + r() * 2.6;
      const s = { uid, name, code, section: sec, role: 'student', email: `${code}@students.example.edu`, status: r() < 0.94 ? 'new' : 'repeat' };
      students.push({ ...s, risk, skill });
      db.users[uid] = s; db.roster[s.email] = s;
    }
  }

  // Lecture sessions + attendance
  for (const L of LECTURES) {
    if (L.date > DEMO_TODAY) {
      db.sessions[`lec-${L.n}`] = { type: 'lecture', lectureNo: L.n, title: L.title, lecturer: L.lecturer, date: L.date, start: '12:00', end: '13:00', status: 'scheduled', attendanceRequired: L.attendanceRequired !== false };
      continue;
    }
    const sid = `lec-${L.n}`;
    db.sessions[sid] = { type: 'lecture', lectureNo: L.n, title: L.title, lecturer: L.lecturer, date: L.date, start: '12:00', end: '13:00', status: 'closed', openedAt: ms(L.date, '12:05'), closesAt: ms(L.date, '12:20'), attendanceRequired: L.attendanceRequired !== false };
    for (const s of students) {
      const p = s.risk ? 0.55 : 0.9;
      if (r() < p) db.attendance[`${sid}_${s.uid}`] = { sid, uid: s.uid, code: s.code, name: s.name, section: s.section, type: 'lecture', date: L.date, at: ms(L.date, '12:0' + Math.floor(r() * 9)), status: r() < 0.97 ? 'confirmed' : 'rejected', method: 'qr', by: 'demo-lecturer' };
    }
  }

  // Lab sessions, attendance and practical entries
  const weeks = PRACTICAL_WEEKS.filter((w) => w.from <= DEMO_TODAY);
  for (let sec = 1; sec <= 18; sec++) {
    const dem = demName(sec);
    for (const w of weeks) {
      const dates = labDatesForWeek(w, sec);
      dates.forEach((d, idx) => {
        const sid = `lab-w${w.w}-s${sec}-${idx + 1}`;
        const past = d.date < DEMO_TODAY;
        const today = d.date === DEMO_TODAY;
        db.sessions[sid] = { type: 'lab', section: sec, week: w.w, date: d.date, start: d.start, end: d.end, title: w.topic, status: past ? 'closed' : today ? 'scheduled' : 'scheduled', demonstrators: dem ? [dem.uid] : [], req: w.req };
        if (!past) return;
        for (const s of students.filter((x) => x.section === sec)) {
          const p = s.risk ? 0.6 : 0.93;
          if (r() < p) db.attendance[`${sid}_${s.uid}`] = { sid, uid: s.uid, code: s.code, name: s.name, section: sec, type: 'lab', week: w.w, date: d.date, at: ms(d.date, d.start) + 6e5, status: 'confirmed', method: r() < 0.9 ? 'qr' : 'manual', by: dem.uid };
        }
      });
      // entries
      const labTasks = w.tasks.filter((t) => t.rubric);
      if (!labTasks.length) continue;
      for (const s of students.filter((x) => x.section === sec)) {
        let n = 0;
        for (const t of labTasks) for (const tooth of t.teeth.length ? t.teeth : ['—']) {
          if (n >= Math.max(w.req, 1)) break;
          n++;
          const current = w.w === 7;
          if (current && r() < 0.5) continue; // current week partly done
          if (s.risk && r() < 0.35) continue; // missing work
          const rub = rubricById[t.rubric];
          const trueG = Math.max(3.5, Math.min(10, s.skill + (r() - 0.5) * 1.6 + (w.w - 2) * 0.08));
          const bandOf = (g) => (g >= 9 ? 'A' : g >= 7.5 ? 'B' : g >= 6 ? 'C' : 'D');
          const selfPicks = {}, aiCrit = {}, revPicks = {};
          for (const c of rub.criteria) {
            selfPicks[c.id] = bandOf(trueG + 0.6 + (r() - 0.5) * 2);
            revPicks[c.id] = bandOf(trueG + (r() - 0.5) * 1.8 + (sec % 5 === 0 ? 0.7 : 0));
            const assessable = c.photo === 'yes' || (c.photo === 'partial' && r() < 0.5);
            aiCrit[c.id] = assessable ? { band: bandOf(trueG - 0.8 + (r() - 0.5) * 2.4), assessable: true, comment: 'Preliminary — see demonstrator.' } : { band: null, assessable: false, comment: 'Not assessable from photo — check with demonstrator.' };
          }
          const selfGrade = Math.round(Math.min(10, trueG + 0.5 + (r() - 0.5)) * 4) / 4;
          const demGrade = Math.round(Math.min(10, trueG + (sec % 5 === 0 ? 0.7 : 0) + (r() - 0.5) * 0.8) * 4) / 4;
          const aiScore = Math.round(Math.max(2, trueG - 0.8 + (r() - 0.5) * 2.6) * 4) / 4;
          const dates = labDatesForWeek(w, sec);
          const d = dates[Math.min(dates.length - 1, n > 1 ? 1 : 0)] || { date: w.from, start: '10:00' };
          const created = ms(d.date, d.start) + 3600e3;
          const pendingReview = current && r() < 0.35;
          const redo = !pendingReview && demGrade < 6 && r() < 0.6;
          const id = `e-${w.w}-${s.code}-${n}`;
          db.entries[id] = {
            uid: s.uid, code: s.code, name: s.name, section: sec, week: w.w, rubricId: rub.id, tooth, date: d.date,
            status: pendingReview ? 'submitted' : redo ? 'redo' : 'reviewed',
            self: { picks: selfPicks, grade: selfGrade, comment: '', at: created },
            ai: r() < 0.85 ? { criteria: aiCrit, score: aiScore, model: 'gemini-flash-lite (demo)', promptVersion: 'v1', at: created + 60e3 } : null,
            review: pendingReview ? null : { picks: revPicks, grade: demGrade, status: demGrade >= 6 ? 'Completed' : 'Incomplete', feedback: demGrade >= 8 ? 'Good outline; keep walls smooth.' : demGrade >= 6 ? 'Refine line angles and margins.' : 'Over-extended outline — repeat on a new tooth.', by: dem.uid, byName: dem.name, at: created + (current ? 2 : 24 + r() * 60) * 3600e3 },
            photos: [], createdAt: created, updatedAt: created,
          };
        }
      }
    }
  }

  // Materials
  const mats = [
    { kind: 'lecture', lectureNo: 1, title: 'Lecture 1 — Course Orientation: Definition, Scope and Objectives', url: 'https://example.org/lecture-1.pdf', qbank: 'Define Operative Dentistry and state its scope and objectives.', order: 1 },
    { kind: 'lecture', lectureNo: 2, title: 'Lecture 2 — Hard Tooth Structure Defects (Non-carious lesions)', url: 'https://example.org/lecture-2.pdf', qbank: 'Classify non-carious lesions of hard tooth structure.\nCompare attrition, abrasion, erosion and abfraction.', order: 2 },
    { kind: 'lecture', lectureNo: 3, title: 'Lecture 3 — Dental Cariology (1)', url: 'https://example.org/lecture-3.pdf', qbank: '', order: 3 },
    { kind: 'practical', ptype: 'video', week: 2, title: 'Class I cavity preparation for composite — demonstration', url: 'https://www.youtube.com/', order: 10 },
    { kind: 'practical', ptype: 'video', week: 3, title: 'Compound Class II for composite — demonstration', url: 'https://www.youtube.com/', order: 11 },
    { kind: 'skill', title: 'Orientation lab: manual-control exercises (name, lines, root shapes)', url: '', body: 'Write your Arabic name 10 times left to right; 10 line sets at 0.5/1.0/1.5/2.0 mm; 4 circles (3 mm) + 4 squares (3–4 mm) on two molar roots. No cavity preparation until verified.', order: 20 },
    { kind: 'link', title: 'Recommended: rubber dam and operator positioning (external video)', url: 'https://www.youtube.com/', order: 30 },
  ];
  mats.forEach((m, i) => { db.materials[`m${i + 1}`] = { ...m, updatedAt: now - i * 86400e3 }; });

  // Announcements
  db.projects.g1 = { group: 1, title: 'Bulk-fill versus incremental composite in Class II cavities: a typodont comparison', lecturer: 'Dr. Lecturer (demo)', demonstrator: 'Dr. Mona Adel', updatedAt: 0 };
  db.projects.g2 = { group: 2, title: 'Preparation depth with and without a periodontal-probe check', lecturer: 'Dr. Lecturer (demo)', demonstrator: 'Dr. Mona Adel', updatedAt: 0 };
  db.announcements.a1 = { title: 'ماذا تحضر معك في اللاب القادم؟', body: 'مسطرة، ورق أبيض وقلم، Low-speed handpiece مع contra-angle، Round bur مقاس 1، Bur 330، Bur 245، وضرس أول سفلي أكريليك.', audience: 'students', sections: [], pinned: true, publishAt: ms('2026-09-21', '10:00'), by: 'demo-director', byName: 'Prof. Ahmed El-Hoshy' };
  db.announcements.a2 = { title: 'Practical exam 1 results released', body: 'Results of the first practical exam are now visible under My progress.', audience: 'students', sections: [], pinned: false, publishAt: ms('2026-10-25', '09:00'), by: 'demo-director', byName: 'Prof. Ahmed El-Hoshy' };
  db.announcements.a3 = { title: 'Demonstrators: calibration meeting', body: 'Short calibration on the Class III–V rubrics before week 7 labs, Sunday 8:00, department room.', audience: 'staff', sections: [], pinned: false, publishAt: ms('2026-10-29', '08:00'), by: 'demo-director', byName: 'Prof. Ahmed El-Hoshy' };

  // Messages
  const s0 = students.find((s) => s.section === 1);
  db.messages.msg1 = { uid: s0.uid, section: 1, from: s0.uid, fromName: s0.name, fromRole: 'student', text: 'Doctor, is my Class III outline on #11 too wide palatally?', at: now - 5 * 3600e3, read: false };
  db.messages.msg2 = { uid: s0.uid, section: 1, from: 'demo-dem-1', fromName: 'Dr. Mona Adel', fromRole: 'demonstrator', text: 'Slightly — keep the palatal outline within the marginal ridges. Show me the tooth next lab.', at: now - 4 * 3600e3, read: false };

  db.audit.au1 = { at: now - 2 * 86400e3, by: 'demo-director', byName: 'Prof. Ahmed El-Hoshy', action: 'attendance.correct', target: `lec-6_${students[3].uid}`, reason: 'Student present — phone battery failed; verified by lecturer.', before: 'none', after: 'confirmed' };
  return db;
}
