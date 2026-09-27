# CU Conservative Dentistry Logbook — setup guide

This guide takes the platform from code to a live site at `https://<your-project>.web.app`.
You do it once, in about 45 minutes. After that, every update Claude pushes to GitHub goes live automatically.

**What you need:** a Google account for Firebase (it is the owner of the platform), a GitHub account, and a bank card for the Firebase Blaze plan (expected bill: $0–2/month, with a budget alert).

---

## 1. GitHub (5 min)
1. Create a free account at github.com if you don't have one.
2. Create a **private** repository named `cu-logbook` (no README).
3. Tell Claude the repository name (`your-username/cu-logbook`) so the code can be pushed to it.

## 2. Firebase project (15 min)
1. Go to console.firebase.google.com → **Add project** → name it `cu-conservative-logbook` → turn Google Analytics **off** → Create.
2. Bottom-left **Upgrade** → **Blaze (pay as you go)** → add the card.
   Then open console.cloud.google.com/billing → **Budgets & alerts** → create a budget of **$5/month** with email alerts at 50 %, 90 %, 100 %.
3. **Build → Authentication → Get started → Sign-in method**, enable:
   - **Email/Password** and tick **Email link (passwordless sign-in)**.
   - **Google** (and **Microsoft** if the university uses Microsoft 365 — needs an app registration; skip if unsure).
4. **Build → Firestore Database → Create database** → location **eur3 (Europe)** → **production mode**.
   Then **Disaster recovery → Backups** → enable a **daily backup, 7-day retention**.
5. **Build → Storage → Get started** → same region → production mode.
6. **Project settings (gear) → General → Your apps → Web (</>)** → nickname `logbook` → Register. Keep the `firebaseConfig` values open for step 4.

## 3. Keys (10 min)
1. **Service account (lets GitHub publish the site):** Project settings → **Service accounts** → **Generate new private key** → a `.json` file downloads.
   In console.cloud.google.com → **IAM**, find the account ending `firebase-adminsdk-…` → Edit → add roles:
   *Firebase Admin, Cloud Functions Admin, Service Account User, Secret Manager Admin, Cloud Scheduler Admin, Artifact Registry Administrator, Cloud Build Editor, Service Usage Admin.*
2. **Gemini API key (Prep Lens and the assistant):** aistudio.google.com → **Get API key** → Create key in the Firebase project. Free tier is enough for the pilot.
3. **Email for daily reports:** use a Gmail account for sending (a dedicated one is best, e.g. `cu.logbook.reports@gmail.com`).
   Google Account → Security → turn on **2-Step Verification** → **App passwords** → create one named `logbook` → copy the 16-character password.

## 4. Connect GitHub to Firebase (10 min)
In the GitHub repository → **Settings → Secrets and variables → Actions**.

**Secrets** (hidden):
| Name | Value |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | the whole content of the downloaded `.json` file |
| `GEMINI_API_KEY` | the Gemini key |
| `SMTP_PASS` | the Gmail app password |

**Variables** (the Firebase web settings are already in the code):
| Name | Value |
|---|---|
| `OWNER_EMAIL` | the email that becomes the Course Director account |
| `OWNER_NAME` | `Prof. Ahmed El-Hoshy` |
| `SMTP_USER` | the sending Gmail address |
| `GEMINI_MODEL` | optional; default `gemini-flash-lite-latest` |

## 5. Publish
GitHub → **Actions → Deploy logbook → Run workflow**. The first run takes ~6 minutes.
If it fails with "API not enabled", wait two minutes and run it again — the first run switches the Google services on.

The site is live at `https://<FB_PROJECT_ID>.web.app`.
Add it in Firebase → Authentication → Settings → **Authorized domains** if you later use your own domain.

## 6. First use (Course Director)
1. Open the site → enter your email → open the sign-in link on the same phone/computer.
2. **People → Import roster (Excel):** columns *student number (الكود), name (الاسم), university email, section 1–18*. Rows without email or section are listed and skipped.
3. **People → Add staff:** demonstrators with their sections, lecturers with their lectures, Head of Department, Vice Dean.
4. **Sessions → Generate term from timetable** (creates all 16 lectures and every section's labs).
5. **Materials:** add each lecture's Drive link (sharing: *Anyone with the link — Viewer*) and question bank; add demonstration videos.
6. **Settings:** check report recipients, the absence limit and the Prep Lens daily limit.

## 7. Acceptance checks (before students use it)
Run these with test accounts (you can add yourself a second email as a student in section 1):
- [ ] A lecturer opens a lecture session; a student scans the QR and sees **Recorded**.
- [ ] Scanning again shows **Already recorded**.
- [ ] Phone in aeroplane mode → **Pending — saved on this phone**; turning data on changes it to Recorded, or shows **Failed** with instructions if the window closed.
- [ ] A demonstrator confirms lab attendance and completes a rubric review.
- [ ] A student uploads a photo, self-assesses, sees Prep Lens feedback, and later the demonstrator's grade.
- [ ] Vice Dean, Head of Department and Course Director each see the correct dashboard.
- [ ] Reports export with correct counts and filters.
- [ ] Lecture 2 opens from the student lecture library.
- [ ] A student cannot open another student's records or staff screens.
- [ ] Firestore backup exists (Disaster recovery → Backups) and a test restore to a new database works.

## 8. If the platform is unavailable during a session
1. Take attendance on paper (name, student number, signature).
2. After the session: open the session → **Mark present** for each student with the reason "Paper register — platform unavailable". Every change is kept in the Audit log.
3. Lab evaluations continue in the physical logbook and are entered later from **Review queue** or the student's record.
4. Check status.firebase.google.com; report the problem to the Course Director.

## Costs (513 students, estimates)
| Item | Expected |
|---|---|
| Hosting, sign-in, database, storage, scheduled jobs | $0–2 / month |
| Prep Lens on the Gemini free tier | $0 (daily limits; pilot scale) |
| Prep Lens on paid Flash-Lite, one photo per tooth | ~$50 / term |
| Course assistant on paid Flash-Lite | ~$0.002 per question |

The **daily Prep Lens limit** in Settings is a hard cap: when it is reached, students still complete the rubric self-assessment and only the AI comments pause until the next day.
