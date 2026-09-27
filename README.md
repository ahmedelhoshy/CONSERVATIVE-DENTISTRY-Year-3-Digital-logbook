# CU Conservative Dentistry Logbook

Digital logbook for Year 3 Preclinical Conservative Dentistry, Faculty of Dentistry, Cairo University.
Course Director: Prof. Ahmed El-Hoshy.

- **Students:** attendance (rotating QR / 6-digit code), lectures and question banks, demonstration videos, faculty-validated atlas, Prep Lens self-assessment with criterion-based AI feedback, messages to demonstrators, course assistant, personal progress. Arabic and English.
- **Demonstrators:** open lab attendance, confirm students at the bench, review queue with the official rubrics, feedback and correction requests.
- **Lecturers:** open lecture attendance and project the rotating code.
- **Course Director:** sessions, materials, announcements, people and permissions, settings, reports, audit log.
- **Head of Department / Vice Dean:** protected dashboards; daily email report at 09:00, weekly teeth-per-student Excel.

Stack: Preact + Vite (web), Firebase Auth / Firestore / Storage / Hosting, Cloud Functions (Gemini for Prep Lens and the assistant, scheduled reports).

- `npm run dev` — local development. Without Firebase settings the app runs in **demo mode** with fictional students.
- `npm run build` — production build into `dist/`.
- Deployment: see **SETUP.md** (GitHub Actions publishes to Firebase on every push to `main`).

Key files: `src/data/rubrics.js` (14 official rubrics), `src/data/course.js` (curriculum, practical schedule, section timetable),
`firestore.rules` / `storage.rules` (access control), `functions/index.js` (AI, statistics, reports).
