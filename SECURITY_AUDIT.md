# ExamCoach — Security Audit Report

**Prepared for:** SE4030 Secure Software Development — Assignment
**Scope:** `Backend/` (Express + MongoDB REST API) and `Frontend/` (React/Vite client) of the ExamCoach repository
**Status:** Audit only. **No code has been modified.** OAuth/OIDC has **not** been implemented as part of this exercise.
**Methodology:** Manual static source-code review of every controller, route, middleware and model file, plus review of `.env`, `package.json`, `.gitignore`, and Git tracking status. No live penetration testing was performed against the deployed Render instance during this audit — all findings are backed by exact source locations and are safe to reproduce against your own local/dev instance using Postman.

> ⚠️ Re-run every Postman test below only against an environment you own/control (local dev server, or your own Render deployment). Do not run exploit requests against systems you do not have explicit authorization to test.

---

## 1. Summary Table

| # | Vulnerability | OWASP Category | Severity | Location |
|---|---|---|---|---|
| 1 | Unauthenticated Quiz Create / Update / Delete | A01 – Broken Access Control | **Critical** | `Backend/routes/quizzRoutes.js`, `Backend/controllers/quizzController.js` |
| 2 | Quiz Answer Key Exposed to Students Before Submission | A06 – Insecure Design | **Critical** | `Backend/controllers/quizzController.js` (`getQuiz`) |
| 3 | IDOR on Student/Teacher Profile Endpoints | A01 – Broken Access Control | High | `Backend/routes/studentRoutes.js`, `studentController.js`, `teacherRoutes.js`, `teacherController.js` |
| 4 | Missing Authentication on AI Summary History Endpoints | A01 – Broken Access Control | High | `Backend/routes/aiRoutes.js`, `Backend/controllers/aiController.js` |
| 5 | Hardcoded Default Admin Credentials | A07 – Authentication Failures | Critical* | `Backend/seedAdmin.js` |
| 6 | Hardcoded Production Secrets in Source + Wildcard CORS | A02 – Security Misconfiguration | High | `Backend/middleware/uploadMiddleware.js`, `Backend/controllers/quizController.js`, `Backend/index.js` |
| 7 | Plaintext Storage & Unauthenticated Disclosure of Quiz Passwords | A04 – Cryptographic Failures | Medium/High | `Backend/models/Quizz.js`, `Backend/controllers/quizzController.js` |
| 8 | Sensitive Data (OTP / Reset Tokens / JWT) Written to Logs | A09 – Logging & Alerting Failures | Medium | `Backend/controllers/authController.js`, `Backend/middleware/authMiddleware.js` |

\* Critical **only if** `seedAdmin.js` has actually been executed against the live/shared database — see Finding 5 for how to confirm this safely.

---

## Finding 1 — Unauthenticated Quiz Create / Update / Delete

**OWASP Category:** A01 – Broken Access Control (with an A06 – Insecure Design root cause: the bypass is a deliberate, commented "dev/test mode" left in production code)
**Severity:** Critical
**Files / Functions:**
- `Backend/routes/quizzRoutes.js:21-23` — `router.route('/').get(getQuizzes).post(validateQuizCreation, createQuiz);` → **no `protect` on POST**
- `Backend/routes/quizzRoutes.js:34-37` — `router.route('/:id').get(getQuiz).put(updateQuiz).delete(deleteQuiz);` → **no `protect` on PUT or DELETE**
- `Backend/routes/quizzRoutes.js:45-46` — `router.route('/:id/attempts').get(getQuizAttempts);` → **no `protect`** (teacher-only attempt/results view is public)
- `Backend/controllers/quizzController.js:224-243` (`createQuiz`) — ownership check is commented out entirely
- `Backend/controllers/quizzController.js:248-288` (`updateQuiz`), lines 260-271:
  ```js
  if (req.user && req.user.id) {
      const teacher = await Teacher.findOne({ user: req.user.id });
      if (quiz.createdBy.toString() !== teacher._id.toString()) { ... }
  }
  // If no user on the request, allow update (unauthenticated dev/test mode)
  ```
- `Backend/controllers/quizzController.js:293-324` (`deleteQuiz`) — identical bypass pattern

**Why it is vulnerable:** The authorization check only runs *if* `req.user` happens to be populated. Since the `protect` middleware (which is what populates `req.user`) was never attached to these routes, `req.user` is always `undefined`, and the `if` block is always skipped — every request is treated as the trusted "dev/test mode" path. Anyone on the internet, with **no account and no token**, can create, overwrite, or permanently delete any quiz, including quizzes belonging to other teachers, and can view any quiz's full attempt/result list for any student.

**Impact:** Full compromise of quiz integrity and confidentiality — an unauthenticated attacker can delete every quiz on the platform, plant quizzes with malicious/incorrect content, tamper with an existing quiz's questions/answers, or scrape every student's exam results.

**Exploitation:** A single unauthenticated HTTP request per action (see Postman steps below). No credentials, cookies, or tokens required.

### Postman Test Steps

**1a — Unauthenticated Delete**
1. In Postman, create a request: `DELETE {{baseUrl}}/api/quizzes/<existingQuizId>`
   - Get `<existingQuizId>` first from `GET {{baseUrl}}/api/quizzes` (public listing) and copy any `_id`.
2. **Headers:** none (specifically, do **not** add an `Authorization` header).
3. **Body:** none.
4. Send the request.
5. **Expected vulnerable response:** `200 OK` with `{ "success": true, "data": {} }` — the quiz is deleted with zero authentication.
6. **Screenshot:** capture the Postman response pane showing `200 OK` and the empty-body success JSON, next to the request tab showing no Authorization header. Then re-run `GET /api/quizzes` and screenshot the quiz's absence from the list as corroborating evidence.

**1b — Unauthenticated Create**
1. `POST {{baseUrl}}/api/quizzes`
2. **Headers:** `Content-Type: application/json` only.
3. **Body (raw JSON):**
   ```json
   {
     "title": "PWNED by unauthenticated request",
     "subject": "Security Test",
     "questions": [
       { "question": "1+1?", "options": ["1","2","3","4"], "correctAnswer": 1 }
     ]
   }
   ```
4. **Expected vulnerable response:** `201 Created` with the new quiz object, `createdBy: null`.
5. **Screenshot:** the `201` response body, and the created quiz visible in `GET /api/quizzes` afterward.

**1c — Unauthenticated Update**
1. `PUT {{baseUrl}}/api/quizzes/<existingQuizId>` with body `{ "title": "Tampered Title" }` and no Authorization header.
2. **Expected vulnerable response:** `200 OK`, quiz title changed.
3. **Screenshot:** before/after title in the `GET /api/quizzes/<id>` response.

**1d — Unauthenticated Results Access**
1. `GET {{baseUrl}}/api/quizzes/<existingQuizId>/attempts` with no Authorization header.
2. **Expected vulnerable response:** `200 OK` with the full list of every student's attempt records (scores, answers) for that quiz.
3. **Screenshot:** the response body showing student result data returned to an anonymous caller.

**Secure practice mapping:** Enforce authentication and authorization at the route layer (never solely inside the controller), fail closed by default (deny unless explicitly authorized), and remove all "if authenticated, check; otherwise allow" fallback logic from production code paths (OWASP ASVS V4 – Access Control; "secure by default" design principle).

---

## Finding 2 — Quiz Answer Key Exposed to Students Before Submission

**OWASP Category:** A06 – Insecure Design (client is trusted with data it should never receive; also overlaps A01 since no access check gates it)
**Severity:** Critical
**File / Function:** `Backend/controllers/quizzController.js:114-141` (`getQuiz`), route `GET /api/quizzes/:id` in `quizzRoutes.js:34-35` (public, no `protect`)

**Vulnerable code:**
```js
const quizObj = quiz.toObject();
if (req.query.includeCredentials !== 'true') {
    delete quizObj.enrollmentKey;
    delete quizObj.quizPassword;
    quizObj.hasCredentials = ...;
}
res.status(200).json({ success: true, data: quizObj });
```
The handler only ever strips `enrollmentKey` and `quizPassword` from the response. It never removes `questions[i].correctAnswer`, which is stored directly on each question sub-document (`Backend/models/Quizz.js:12-15`).

**Why it is vulnerable:** The endpoint that the frontend calls to *load a quiz for a student to take* (`GET /api/quizzes/:id`) returns the entire Mongoose document, including the answer key, before the student has answered a single question. This is a textbook design flaw: server-side logic ("is this answer correct?") was implemented client-side by simply shipping the answer key to the browser and trusting the client to not read it.

**Impact:** Any student (or anyone, since the route has no auth requirement at all) can view every correct answer for every quiz simply by opening the quiz or calling the API directly — completely defeating the purpose of the exam/quiz platform. This is especially severe for an *exam preparation and assessment* product.

**Exploitation:** A single unauthenticated `GET` request.

### Postman Test Steps
1. Grab any quiz id from `GET {{baseUrl}}/api/quizzes`.
2. `GET {{baseUrl}}/api/quizzes/<quizId>` — no Authorization header needed.
3. **Expected vulnerable response:** `200 OK`, and inside `data.questions[]`, each object contains a populated `correctAnswer` field (the index of the correct option) alongside the `question` and `options`.
4. **Screenshot:** highlight the `correctAnswer` field in the JSON response for at least 2–3 questions, next to the request showing no auth token was sent.
5. **Corroborating evidence:** open the same quiz as a student in the browser DevTools Network tab and show the same raw payload is delivered to the client before the quiz is submitted.

**Secure practice mapping:** Never send authoritative/secret data (answer keys, correct-answer flags, internal scoring weights) to the client. Split the response model: a "public" quiz-taking DTO (question + options only) vs. an internal scoring model used only server-side during `submitQuizAttempt`. Apply least-privilege data exposure (OWASP ASVS V1 – secure design; "never trust the client").

---

## Finding 3 — IDOR on Student / Teacher Profile Endpoints

**OWASP Category:** A01 – Broken Access Control (Insecure Direct Object Reference)
**Severity:** High
**Files / Functions:**
- `Backend/routes/studentRoutes.js:7-10`
  ```js
  router.route('/profile/:userId')
      .get(protect, getStudentProfile)
      .put(protect, updateStudentProfile);
  ```
- `Backend/controllers/studentController.js:43-58` (`getStudentProfile`), `:63-99` (`updateStudentProfile`)
- `Backend/routes/teacherRoutes.js:14-17` and `Backend/controllers/teacherController.js:36-51` / `:56-91` (identical pattern)

**Why it is vulnerable:** `protect` only validates that the JWT is well-formed and unexpired; it does **not** check that `req.user.id` matches the `:userId` route parameter being accessed. Any two authenticated student accounts can read and **modify** each other's profile (name, DOB, gender, phone, address, profile picture) simply by swapping the `userId` in the URL — the same flaw exists for teachers.

**Impact:** Cross-account PII disclosure and unauthorized modification of another user's personal data (address, phone, DOB) using nothing more than a valid — but unrelated — login token, and knowledge/guessing of a Mongo ObjectId (which is trivially harvested from other API responses such as quiz attempts, `createdBy` fields, etc.).

**Exploitation:**

### Postman Test Steps
1. Register/log in as **Student A** → `POST /api/auth/login` → copy `token` (Token A) and `user.id` (or the `Student` doc's `user` field, visible in the login response `user.id`).
2. Register/log in as **Student B** → copy Token B and obtain Student B's `userId` the same way.
3. As **Student A**, call: `GET {{baseUrl}}/api/students/profile/<StudentB_userId>`
   - **Headers:** `Authorization: Bearer <Token A>`
4. **Expected vulnerable response:** `200 OK` with **Student B's** full profile (name, email via populate, DOB, phone, address) — returned to Student A's token.
5. Now perform the write test: `PUT {{baseUrl}}/api/students/profile/<StudentB_userId>` with body `{ "phone": "0000000000", "address": "Tampered by Student A" }` and Token A's Authorization header.
6. **Expected vulnerable response:** `200 OK`, Student B's profile updated by Student A.
7. **Screenshot:** (a) the GET response showing Student B's PII returned under Student A's Bearer token, and (b) the PUT response confirming the write succeeded — plus a follow-up `GET` as Student B (with Token B) showing the tampered field.
8. Repeat against `/api/teachers/profile/:userId` with two teacher accounts to confirm the same pattern.

**Secure practice mapping:** Enforce object-level authorization on every request that accepts an identifier in the path — either derive the identifier from `req.user.id` and ignore/reject a client-supplied one, or explicitly compare `req.user.id === req.params.userId` (and allow admin override) before returning/mutating data (OWASP ASVS V4.2 — Operation Level Access Control / IDOR prevention).

---

## Finding 4 — Missing Authentication on AI Summary History Endpoints

**OWASP Category:** A01 – Broken Access Control (missing authentication, not just missing ownership check)
**Severity:** High
**Files / Functions:**
- `Backend/routes/aiRoutes.js:1-14` — note there is **no** `protect` import and **no** auth middleware on any route in this file:
  ```js
  router.get('/history/:userId', getHistory);
  router.put('/history/:id', updateHistoryItem);
  router.delete('/history/:id', deleteHistoryItem);
  ```
- `Backend/controllers/aiController.js:318-327` (`getHistory`), `:329-349` (`deleteHistoryItem`), `:351-379` (`updateHistoryItem`) — all trust a `userId` supplied in the URL/body with zero session verification.

**Why it is vulnerable:** These endpoints don't merely fail an ownership check (like Finding 3) — they require **no login at all**. Anyone can read, edit, or delete any user's saved "AI Learning Lab" summaries (which may include uploaded study material content and titles) by supplying any `userId`/document `_id`, which are ordinary, enumerable Mongo ObjectIds.

**Impact:** Complete unauthenticated read/write/delete access to every user's AI summary history across the platform.

### Postman Test Steps
1. Log in as any student and note their `userId` (from the login response), or obtain any `AISummary._id` by first calling `POST /api/ai/save` to create one (also unauthenticated!).
2. `GET {{baseUrl}}/api/ai/history/<anyUserId>` — send with **no Authorization header at all**.
3. **Expected vulnerable response:** `200 OK` with the full array of that user's saved summaries.
4. `DELETE {{baseUrl}}/api/ai/history/<summaryId>` with body `{ "userId": "<same or even a different userId>" }` and no Authorization header.
5. **Expected vulnerable response:** `200 OK`, `{ "message": "History item deleted successfully" }`.
6. **Screenshot:** capture both responses side-by-side with the request tab visibly showing zero headers/token, to make clear no authentication was presented.

**Secure practice mapping:** Every endpoint that touches user-owned data must sit behind authentication middleware by default ("default deny"); route files should be reviewed against a checklist so that no controller is reachable without going through `protect` unless the route is explicitly, deliberately public (OWASP ASVS V4.1).

---

## Finding 5 — Hardcoded Default Admin Credentials

**OWASP Category:** A07 – Identification and Authentication Failures
**Severity:** Critical *if the script has been run against the live database*, otherwise High (latent risk)
**File:** `Backend/seedAdmin.js:20-26`
```js
await User.create({
    name: 'Admin User',
    email: 'admin@examcoach.com',
    password: 'adminpassword123',
    role: 'admin'
});
```

**Why it is vulnerable:** A committed, version-controlled script creates a full **admin** account with a weak, publicly-visible, hardcoded password, and there is no forced password rotation, one-time-use flag, or removal step after first use. Anyone who reads the repository (a classmate, a grader, anyone with repo access, or anyone who finds it if the repo is ever made public/forked) knows a candidate admin credential to try against the live system.

**Impact:** If this script was executed once to bootstrap the production/shared database (a very likely scenario for a student project), `admin@examcoach.com` / `adminpassword123` grants full admin access — including `/api/admin/overview` platform analytics and `/api/auth/add-teacher` (ability to create arbitrary teacher accounts).

### Postman Test Steps
1. `POST {{baseUrl}}/api/auth/login`
2. **Headers:** `Content-Type: application/json`
3. **Body:**
   ```json
   { "email": "admin@examcoach.com", "password": "adminpassword123" }
   ```
4. **Expected vulnerable response (if the seed script was ever run against this DB):** `200 OK` with a valid JWT and `"role": "admin"`.
   - If you get `401 Invalid credentials`, the seed script has not been run against that particular database — this confirms the *script itself* is still the vulnerability (latent risk), just not currently exploitable on that DB instance. Document whichever result you get as your evidence.
5. If login succeeds, immediately screenshot the `200` response with the admin JWT, then use it as evidence only (`GET {{baseUrl}}/api/admin/overview` with `Authorization: Bearer <admin token>` to prove admin-level access was obtained) — do not make further destructive admin calls without separate authorization.
6. **Screenshot:** the login response `200` + role `"admin"`, and the successful `/api/admin/overview` call proving the credential grants real admin capability.

**Secure practice mapping:** Never hardcode credentials — generate a strong random password at seed time, print/log it once to a secure channel (or require it via an environment variable / CLI prompt), and force a password change on first login. Seed scripts that create privileged accounts should not be safe to run twice in production and should not be committed with literal secrets (OWASP ASVS V2.1 — secure credential provisioning).

---

## Finding 6 — Hardcoded Production Secrets in Source Control + Wildcard CORS

**OWASP Category:** A02 – Security Misconfiguration
**Severity:** High
**Files:**
- `Backend/middleware/uploadMiddleware.js:6-10`
  ```js
  cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'du1gjenvg',
      api_key: process.env.CLOUDINARY_API_KEY || '735518326372853',
      api_secret: process.env.CLOUDINARY_API_SECRET || 'APN9C79BAZrybhYYiCL69pqelRs'
  });
  ```
- `Backend/controllers/quizController.js:9-13` — the **same real** Cloudinary secret is hardcoded again, this time with **no env-var option at all** (it never even tries `process.env`):
  ```js
  cloudinary.config({
      cloud_name: 'du1gjenvg',
      api_key: '735518326372853',
      api_secret: 'APN9C79BAZrybhYYiCL69pqelRs'
  });
  ```
- `Backend/index.js:44-46`
  ```js
  app.use(cors({ origin: "*" }));
  ```
  (applied globally, in addition to an earlier unconditional `app.use(cors())` at line 23 — both permit any origin)

**Why it is vulnerable:** These are the exact live Cloudinary account credentials (matching the values in `Backend/.env`). Even though `.env` itself is correctly excluded from Git (confirmed via `git ls-files` — it is not tracked), that protection is completely defeated because the same secret is duplicated as a plain-text literal directly inside two tracked, committed `.js` files. Anyone with read access to the repository (a grader, a classmate, a public fork, a future recruiter viewing a portfolio repo) has the real Cloudinary API secret regardless of `.env` hygiene. Separately, the Express app is configured to accept cross-origin requests from **any** website (`origin: "*"`), removing any browser-side origin restriction on the API.

**Impact:** Anyone who can read the source (which is broader than "anyone with server access") can authenticate directly to the project's Cloudinary account outside the app entirely — upload/delete arbitrary media, exhaust storage/bandwidth quota, or pivot to other Cloudinary account resources. The wildcard CORS additionally means any third-party website can script calls against every endpoint in this API from a victim's browser.

### Postman/Verification Steps
1. **Source evidence (no live call required to prove the flaw):** open `Backend/middleware/uploadMiddleware.js` and `Backend/controllers/quizController.js` side by side and screenshot both hardcoded `api_secret: 'APN9C79BAZrybhYYiCL69pqelRs'` literals — this alone is the proof, since a secret should never appear in source regardless of whether it's also reachable live.
2. **Optional live confirmation (only if you own this Cloudinary account — do not run against third-party accounts):**
   - `GET https://api.cloudinary.com/v1_1/du1gjenvg/resources/image` using HTTP Basic Auth with username `735518326372853` and password `APN9C79BAZrybhYYiCL69pqelRs` (Postman → Authorization tab → Basic Auth).
   - **Expected vulnerable response:** `200 OK` listing real uploaded media resources, proving the hardcoded secret is a live, working credential.
3. **CORS check:** send any request (e.g. `GET {{baseUrl}}/api/quizzes`) with header `Origin: https://evil-example.com` and inspect the response headers.
4. **Expected vulnerable response:** `Access-Control-Allow-Origin: *` present in the response headers, confirming the API will serve any origin.
5. **Screenshot:** the response headers panel in Postman showing `Access-Control-Allow-Origin: *`.

**Secure practice mapping:** Secrets belong only in environment variables / a secrets manager, never as source-code fallbacks or literals — a hardcoded fallback silently defeats the purpose of using `.env` in the first place. Rotate the exposed Cloudinary key immediately regardless of the fix timeline. Restrict CORS to an explicit allow-list of known frontend origins (OWASP ASVS V14.1 — secure configuration; CWE-798 Use of Hard-coded Credentials).

---

## Finding 7 — Plaintext Storage & Unauthenticated Disclosure of Quiz Passwords / Enrollment Keys

**OWASP Category:** A04 – Cryptographic Failures
**Severity:** Medium/High
**Files:**
- `Backend/models/Quizz.js:47-54`
  ```js
  enrollmentKey: { type: String, default: '' },
  quizPassword: { type: String, default: '' },
  ```
  (no hashing, no `select: false`)
- `Backend/controllers/quizzController.js:72-73` and `:198-210` — direct plaintext `!==` comparisons:
  ```js
  if (quiz.quizPassword && quiz.quizPassword !== quizPassword) { ... }
  ```
- `Backend/controllers/quizzController.js:127-135` — the same `getQuiz` handler from Finding 2 will return `enrollmentKey`/`quizPassword` **in plaintext** whenever the caller adds `?includeCredentials=true` to the URL, and this is on the same public, unauthenticated `GET /api/quizzes/:id` route — there is no check that the caller is actually the quiz's owning teacher.

**Why it is vulnerable:** Sensitive access-control secrets (the quiz enrollment key and quiz password, which gate who can attempt a quiz) are stored as plain, unhashed strings in the database, compared with plaintext equality, and can be retrieved verbatim by any caller — including one with no account at all — simply by appending a query-string flag. There is no secrecy protecting these values in transit through the response body, at rest in the database, or via access control on who may request them.

**Impact:** Any unauthenticated party can retrieve the enrollment key/password protecting a restricted quiz and bypass the intended access gate, or (if the database is ever exposed/leaked) recover every quiz password without any cracking effort since nothing is hashed.

### Postman Test Steps
1. Find/create a quiz that has a `quizPassword` set (e.g. via the teacher UI, or by using Finding 1's unauthenticated `POST /api/quizzes` with `"quizPassword": "SuperSecret123"` in the body).
2. `GET {{baseUrl}}/api/quizzes/<quizId>?includeCredentials=true` — send with **no Authorization header**.
3. **Expected vulnerable response:** `200 OK`, and the response JSON includes `"quizPassword": "SuperSecret123"` and/or `"enrollmentKey": "..."` in cleartext.
4. **Screenshot:** the response body with the plaintext password/key visible, alongside the request tab showing no auth token was used.

**Secure practice mapping:** Treat any access-control secret the same as a password: hash it (e.g. bcrypt) before storing, compare using a constant-time hash comparison, never return it in any API response once set (write-only field), and gate any "reveal" functionality behind strict owner/admin authorization (OWASP ASVS V6 — Cryptography at Rest; CWE-256 Plaintext Storage of a Password).

---

## Finding 8 — Sensitive Data (OTP / Password-Reset Tokens / JWT) Written to Logs in Plaintext

**OWASP Category:** A09 – Security Logging and Monitoring / Alerting Failures
**Severity:** Medium
**Files / Lines:**
- `Backend/controllers/authController.js:41`
  ```js
  console.log(`\n\n=== DEVELOPMENT OTP FOR ${email}: ${otp} ===\n\n`);
  ```
- `Backend/controllers/authController.js:179` — same pattern for the OTP resent during login
- `Backend/controllers/authController.js:333-335`
  ```js
  console.log(`\n\n=== DEVELOPMENT PASSWORD RESET LINK FOR ${user.email} ===`);
  console.log(resetUrl); // full URL containing the raw reset token
  ```
- `Backend/middleware/authMiddleware.js:16` — logged on **every single authenticated request**:
  ```js
  console.log(`[AUTH] ${req.method} ${req.originalUrl} — Authorization header: ${req.headers.authorization ? req.headers.authorization.substring(0, 30) + '...' : 'MISSING'}`);
  ```

**Why it is vulnerable:** Account-recovery secrets (email verification OTPs and password-reset tokens) and JWT bearer-token fragments are written to `stdout`/`console`. On any hosting platform (Render, Vercel, Heroku, etc.) these console logs are typically persisted, retained for a rolling window, and viewable by anyone with dashboard/log access (which may be broader than "just the owner" — e.g. shared team accounts, CI logs, or third-party log drains). A 30-character JWT prefix is also often enough, combined with other log lines, to materially narrow a brute-force/replay attempt, and unambiguously demonstrates that raw tokens flow through the logging pipeline unredacted.

**Impact:** If the hosting log console/log drain is ever accessed by an unauthorized party (or simply over-shared within a team), an attacker can read live OTP codes and password-reset links/tokens as they are issued and use them to take over accounts, without needing access to the victim's email inbox at all.

### Postman Test Steps
1. Ensure you have terminal/console access to the running backend (`npm run dev` locally, or the Render dashboard's Logs tab for a deployed instance you own).
2. `POST {{baseUrl}}/api/auth/register-student` with a new test email and a valid body (`firstName`, `lastName`, `email`, `password`).
3. **Expected vulnerable evidence:** the server console immediately prints `=== DEVELOPMENT OTP FOR <email>: <6-digit-otp> ===` in plaintext.
4. **Screenshot:** the terminal/log output showing the OTP value next to the timestamp of your Postman request.
5. Repeat with `POST {{baseUrl}}/api/auth/forgot-password` (`{ "email": "<existing user email>" }`) and screenshot the logged full reset URL (including the raw, unhashed reset token) in the console.
6. Make any authenticated request (e.g. `GET {{baseUrl}}/api/auth/me` with a real Bearer token) and screenshot the `[AUTH] ... Authorization header: Bearer eyJhbGciOi...` log line.

**Secure practice mapping:** Never log secrets, tokens, or credentials, even truncated, even in "development" branches of code — gate verbose debug logging behind an explicit non-production flag and strip it entirely from any code path that can run against a real/shared database, and route real logs through a structured logger with an automatic redaction/allow-list of loggable fields (OWASP ASVS V7 — Error Handling and Logging; CWE-532 Insertion of Sensitive Information into Log File).

---

## 2. Genuine Vulnerabilities Identified but Not Selected for This Fix Round

These are real, verified issues — not false positives — that are being deliberately deferred. Each includes the technical reason for deferral and the residual risk that remains.

| Issue | OWASP Category | Why deferred | Residual risk |
|---|---|---|---|
| **Weak, low-entropy hardcoded `JWT_SECRET`** (`thisisasecretkey123456` in `Backend/.env`, also embedded in `Backend/get_token.js` usage) | A04 – Cryptographic Failures | Rotating it requires re-issuing every outstanding token and coordinating the change with the live Render environment variable outside this assignment's scope; also overlaps with the OAuth/OIDC rework explicitly excluded from this phase. | The secret is short and dictionary-like enough to be a plausible offline brute-force/guessing target; a successful guess lets an attacker forge valid tokens for **any** user/role, including `admin`, without ever touching the database. |
| **OAuth "state" parameter used as a trusted student ID with no CSRF binding** (`Backend/controllers/calendarController.js:24-60`, public `GET /api/calendar/callback` route in `calendarRoutes.js:16`) | A01 – Broken Access Control / CWE-352-adjacent | Reliably reproducing this requires a real Google OAuth consent/code exchange, which cannot be cleanly scripted as a self-contained Postman step; it is also tightly coupled to the Google Calendar integration slated for rework alongside the (currently out-of-scope) OIDC work. | An attacker who learns/guesses a victim's `student._id` can complete their own Google consent and have the resulting tokens attached to the *victim's* record, causing the victim's future "sync to calendar" actions to silently push their study-plan/exam-schedule data into the attacker's Google Calendar. |
| **Verbose internal error messages returned to clients** (`res.status(500).json({ success:false, error: err.message })` pattern repeated in nearly every controller, e.g. `studentController.js`, `teacherController.js`, `quizzController.js`, `aiController.js`) | A10 – Mishandling of Exceptional Conditions | Individually low severity (Mongoose `CastError`/`ValidationError` text, not full stack traces); fixing it properly means introducing a centralized error-handling middleware and touching every controller, which is a larger refactor than the scope of this pass. | Error strings can leak internal model/collection/field names (e.g. `Cast to ObjectId failed ... for model "Quiz"`) that assist an attacker in mapping the data model, and inconsistent error shapes make client-side handling and future logging harder to standardize. |
| **Mass-assignment via unrestricted `req.body` spread** (`teacherController.js:105` `Teacher.findByIdAndUpdate(req.params.id, req.body, ...)`; `quizzController.js:273` `updateData = { ...req.body }`) | A01 / A08 – adjacent (Data Integrity) | No currently-reachable field lets this be escalated to privilege change (role lives on the separate `User` model), so exploitability today is limited to writing unexpected/extra fields onto `Teacher`/`Quiz` documents; treated as a hardening item for the broader input-validation pass rather than an urgent fix. | If the `Teacher`/`Quiz` schemas gain a sensitive field in the future (or a nested `user` reference is ever spreadable), this pattern would silently allow it to be overwritten with no allow-list protecting it. |

## 3. Investigated and Ruled Out (Not Actual Vulnerabilities)

| Item | Investigation result |
|---|---|
| `Backend/.env` committed to Git | Confirmed **not tracked** (`git ls-files` returns nothing for `.env`; `Backend/.gitignore` correctly lists `.env`). Not a repository-leak vector on its own — however, see Finding 6: the same secrets are duplicated in tracked source files, which defeats the benefit. |
| Password hashing implementation (`Backend/models/User.js:48-56`) | Uses `bcryptjs` with `genSalt(10)` in a `pre('save')` hook, correctly re-hashes only when the password field is modified, and `matchPassword` uses `bcrypt.compare`. This is a correct, standard implementation — no issue found. |
| JWT verification / algorithm confusion (`Backend/middleware/authMiddleware.js:34`) | Uses `jwt.verify(token, process.env.JWT_SECRET)`. The `jsonwebtoken` library defaults to rejecting `alg: none` and mismatched-algorithm tokens, and no `algorithms` override weakens this. No alg-confusion vulnerability found; the *only* real weakness here is the secret's strength (see deferred item above). |
| Duplicate `cors()` middleware registration (`Backend/index.js:23` and `:44-46`) | Investigated — the second, wildcard call simply overrides the first at runtime; this is redundant/confusing code, not a second distinct vulnerability. Folded into Finding 6 rather than reported separately. |
| `child_process.exec` import in `Backend/services/ocrService.js:7-8` | Imported (`execPromise`) but never actually invoked anywhere in the file with user-controlled input — dead import, not an active OS command-injection sink. Flagged for cleanup, not reported as a vulnerability. |
| `get_token.js`, `check_ip.js`, `resolve_dns*.js`, `test_*.js` (Backend root) | Standalone local Node scripts, not registered as Express routes and not reachable over HTTP by any client. `get_token.js` can mint a real 30-day JWT if run with `.env` access, and its output (`clean_token.txt`) should not be committed, but this is a local developer-hygiene concern, not a remotely exploitable API vulnerability, so it was excluded from the 8 core findings. Recommend deleting these scratch files before final submission. |
| Potential NoSQL operator injection via `req.body.email`/`password` in `login`/`forgotPassword` (`authController.js:171-174`, `319`) | Confirmed that `email`/`password` are passed to Mongoose queries with no explicit type validation (no `express-mongo-sanitize` in `package.json`), so an object like `{"email": {"$gt": ""}}` is technically accepted by the query layer (CWE-943 class weakness). However, a full authentication bypass was **not** achievable: `bcryptjs.compare()` throws synchronously on a non-string `password` argument, and that throw is caught by the surrounding `try/catch`, returning a `500` rather than a bypass. Documented here as a defense-in-depth gap worth closing (input should always be type-checked as a string before use) rather than reported as one of the 8 exploitable findings, since no working proof-of-concept bypass could be demonstrated. |

---

## 4. Mapping to Secure Software Engineering Best Practices

| Finding | Best practice that would have prevented it |
|---|---|
| 1. Unauthenticated quiz CRUD | Apply authorization middleware at the route-definition layer as a mandatory checklist item for every new route; centralize "who can call this" decisions instead of scattering optional `if (req.user)` checks inside controllers; never leave "dev/test mode" bypasses reachable in the shipped codebase. |
| 2. Quiz answers exposed | Design API responses around the principle of least exposure — model a separate "public" DTO for data sent before an action (e.g., before quiz submission) vs. an "authoritative" internal model used only server-side. |
| 3. Profile IDOR | Always derive the acting user's identity from the verified session/token (`req.user.id`), never trust a client-supplied identifier for "whose data is this" decisions without an explicit ownership/role check. |
| 4. Missing auth on AI history | Maintain a route-level security checklist/linter rule that fails CI if a data-bearing route is registered without going through the auth middleware chain. |
| 5. Hardcoded admin credentials | Generate strong random secrets at provisioning time; treat any script capable of creating a privileged account as sensitive infrastructure, not a checked-in convenience script. |
| 6. Hardcoded secrets + wildcard CORS | Centralize all configuration through environment variables / a secrets manager with no source-level fallback values; define an explicit CORS allow-list per environment (dev/staging/prod). |
| 7. Plaintext quiz credentials | Apply the same cryptographic-storage standard to *any* access-control secret (not just user account passwords) — hash at rest, never round-trip in API responses once set. |
| 8. Sensitive data in logs | Adopt a structured logging library with field-level redaction, and treat "is this safe to print" as a mandatory code-review question for every `console.log`/`logger.info` call touching request/user data. |

---

## 5. Next Steps

This document is **audit-only** — no fixes have been applied. Per the current instructions, OAuth/OpenID Connect has also **not** been implemented. Recommended next step: review this report, confirm which of the 8 findings (and which deferred items) to fix first, and re-run the exact Postman steps above **before and after** each fix to produce your before/after evidence pairs for the assignment submission.
