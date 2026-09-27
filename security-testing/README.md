# Black-Box Evidence — Newman (Postman CLI)

Automates the Postman steps from `../SECURITY_AUDIT.md` for all 8 findings, using
[Newman](https://www.npmjs.com/package/newman) (Postman's official CLI runner) so you get one
command → one HTML report with every request/response as evidence, instead of clicking through
Postman manually.

The same collection (`postman/ExamCoach-Security-Audit.postman_collection.json`) can also be
imported straight into the Postman desktop app if you want to eyeball/screenshot a specific
request — nothing about it is Newman-only.

> ⚠️ Run this only against a database/environment you're happy to have test data written to and
> deleted from (a local Mongo, or your own dev Atlas cluster) — several requests intentionally
> create, tamper with, and delete quiz/AI-summary documents to prove the vulnerabilities. Point
> `baseUrl` at `http://localhost:5000` (default) unless you specifically intend to test your live
> Render deployment.

## 1. Install (one-time)

```bash
cd security-testing
npm install
```

This installs `newman` and `newman-reporter-htmlextra` as local dev dependencies (nothing global,
nothing added to the main app's `package.json`).

**If `npm install` fails with `UNABLE_TO_VERIFY_LEAF_SIGNATURE` / a certificate error:** this is a
local network/TLS-interception issue (common on corporate/antivirus-monitored networks), not a
problem with the packages. Try, in order:
1. Run the same `npm install` from a plain terminal outside any sandboxed/managed tool — it often
   just works there.
2. `npm config set cafile "<path to your organization's root CA .pem>"` if your IT department
   provides one.
3. As a last resort for a throwaway local dev machine only: `npm config set strict-ssl false`,
   run the install, then `npm config set strict-ssl true` again afterwards.

## 2. One-time setup: two verified student test accounts (needed for Finding 3 only)

Finding 3 (IDOR) needs two **real, verified** student accounts, because the profile has to
actually exist for the cross-account read/write to prove anything. Registration requires an OTP
that is only ever printed to the server console (never returned in the API response), so this one
step has to be done manually, once:

1. Start the backend (`cd ../Backend && npm run dev`).
2. In Postman (or curl), `POST /api/auth/register-student` twice with two throwaway emails —
   e.g. `sectest.a@example.com` and `sectest.b@example.com` (any password ≥ 6 chars).
3. Watch the backend console — it prints `=== DEVELOPMENT OTP FOR <email>: <6-digit-code> ===`
   for each registration (this is itself Finding 8's evidence — screenshot it while you're here).
4. `POST /api/auth/verify-otp` with `{ "userId": "<from step 2 response>", "otp": "<from console>" }`
   for each account.
5. Open `postman/ExamCoach-Local-Dev.postman_environment.json` (or the environment once imported
   into Postman) and fill in:
   - `studentA_email` / `studentA_password`
   - `studentB_email` / `studentB_password`

Every other folder (1, 2, 4, 5, 6, 7, 8) is fully self-contained and needs no setup.

## 3. Run it

```bash
# from security-testing/
npm run test:before   # run BEFORE applying fixes
#  ... apply fixes to Backend/ ...
npm run test:after    # run AFTER applying fixes — same collection, same assertions
```

Each command runs all 8 finding-folders and writes a timestamped-name-free HTML report to
`postman/reports/BEFORE-fix-report.html` and `postman/reports/AFTER-fix-report.html`
respectively (rename/copy them if you want to keep multiple historical runs — they're git-ignored
scratch output). Open either file in a browser: it shows every request, every response body/status,
and every `pm.test(...)` assertion pass/fail — this is your submitted evidence.

**Before the fix:** the `VULNERABLE: ...` assertions should be green (PASS) — that's expected and
is the proof the vulnerability exists.
**After the fix:** the same `VULNERABLE: ...` assertions should now be **red (FAIL)** — e.g. a 403
where a 200 used to be — which is exactly the before/after contrast your assignment wants.

### Optional: live Cloudinary secret check (Finding 6)

Only run this if you own the `du1gjenvg` Cloudinary account referenced in the source code:

```bash
npm run test:optional-cloudinary
```

### Finding 8 reminder

Findings 8's real evidence is the **server console output**, not the HTTP response. Keep the
backend terminal visible/recording while `npm run test:before`/`test:after` runs folder 8, and
screenshot the `DEVELOPMENT OTP`, password-reset URL, and `[AUTH] ... Authorization header` log
lines as they appear.

## 4. Files in this folder

| File | Purpose |
|---|---|
| `postman/build-collection.js` | Generates the two JSON files below from plain JS — edit this, not the JSON, then re-run `npm run build:collection`. |
| `postman/ExamCoach-Security-Audit.postman_collection.json` | The Postman collection (importable into the Postman app too). |
| `postman/ExamCoach-Local-Dev.postman_environment.json` | The Postman environment — fill in `studentA_*`/`studentB_*` per step 2. |
| `postman/reports/*.html` | Newman HTML reports (your evidence) — generated, not committed. |
| `package.json` | `npm install` / `npm run test:before` / `npm run test:after` scripts. |
