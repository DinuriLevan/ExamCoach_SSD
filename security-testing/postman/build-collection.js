/**
 * Generates the ExamCoach Security Audit Postman collection + environment
 * from plain JS (avoids hand-editing escaped JSON). Regenerate after any
 * edit here with:
 *
 *     node build-collection.js
 */
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------
const js = (lines) => ({ type: 'text/javascript', exec: lines.split('\n') });

function request(name, { method, url, headers = {}, body, pre, test, description }) {
    const item = {
        name,
        event: [],
        request: {
            method,
            header: Object.entries(headers).map(([key, value]) => ({ key, value, type: 'text' })),
            url
        },
        response: []
    };
    if (description) item.request.description = description;
    if (body) {
        item.request.body = {
            mode: 'raw',
            raw: JSON.stringify(body, null, 2),
            options: { raw: { language: 'json' } }
        };
        if (!headers['Content-Type']) {
            item.request.header.push({ key: 'Content-Type', value: 'application/json', type: 'text' });
        }
    }
    if (pre) item.event.push({ listen: 'prerequest', script: js(pre) });
    if (test) item.event.push({ listen: 'test', script: js(test) });
    return item;
}

function folder(name, description, items) {
    return { name, description, item: items };
}

const BASE = '{{baseUrl}}';

// ---------------------------------------------------------------------
// Folder 1 — Finding 1: Unauthenticated Quiz Create/Update/Delete/Results
// ---------------------------------------------------------------------
const f1 = folder(
    'Finding 1 - Unauthenticated Quiz CRUD (A01)',
    'SECURITY_AUDIT.md Finding 1. No account, no token, no cookie is sent on any request in this folder.',
    [
        request('1.1 Create Quiz (No Auth)', {
            method: 'POST',
            url: `${BASE}/api/quizzes`,
            body: {
                title: 'F1 - Unauthenticated Create Test',
                subject: 'Security Audit',
                questions: [
                    { question: 'Is this quiz creatable without login?', options: ['Yes', 'No'], correctAnswer: 0 }
                ]
            },
            test: `
pm.test('VULNERABLE: quiz created with no Authorization header', function () {
    pm.response.to.have.status(201);
});
const json = pm.response.json();
if (json && json.data && json.data._id) {
    pm.environment.set('f1_quizId', json.data._id);
}`
        }),
        request('1.2 Update Quiz (No Auth)', {
            method: 'PUT',
            url: `${BASE}/api/quizzes/{{f1_quizId}}`,
            body: { title: 'F1 - TAMPERED by unauthenticated request' },
            test: `
pm.test('VULNERABLE: quiz updated with no Authorization header', function () {
    pm.response.to.have.status(200);
    const json = pm.response.json();
    pm.expect(json.data.title).to.eql('F1 - TAMPERED by unauthenticated request');
});`
        }),
        request('1.3 View Attempts/Results (No Auth)', {
            method: 'GET',
            url: `${BASE}/api/quizzes/{{f1_quizId}}/attempts`,
            test: `
pm.test('VULNERABLE: teacher-only attempts endpoint reachable with no Authorization header', function () {
    pm.response.to.have.status(200);
});`
        }),
        request('1.4 Delete Quiz (No Auth)', {
            method: 'DELETE',
            url: `${BASE}/api/quizzes/{{f1_quizId}}`,
            test: `
pm.test('VULNERABLE: quiz deleted with no Authorization header', function () {
    pm.response.to.have.status(200);
});`
        }),
        request('1.5 Verify Deletion Persisted', {
            method: 'GET',
            url: `${BASE}/api/quizzes/{{f1_quizId}}`,
            test: `
pm.test('Confirms the unauthenticated delete actually persisted (quiz now 404)', function () {
    pm.response.to.have.status(404);
});`
        })
    ]
);

// ---------------------------------------------------------------------
// Folder 2 — Finding 2: Quiz answer key exposed before submission
// ---------------------------------------------------------------------
const f2 = folder(
    'Finding 2 - Quiz Answer Key Exposed Before Submission (A06)',
    'SECURITY_AUDIT.md Finding 2.',
    [
        request('2.1 Create Quiz With Known Answer (No Auth)', {
            method: 'POST',
            url: `${BASE}/api/quizzes`,
            body: {
                title: 'F2 - Answer Exposure Test',
                subject: 'Security Audit',
                questions: [
                    { question: '2+2=?', options: ['3', '4', '5', '6'], correctAnswer: 1, explanation: 'Basic arithmetic' }
                ]
            },
            test: `
pm.test('Setup: quiz created for exposure test', function () {
    pm.response.to.have.status(201);
});
const json = pm.response.json();
if (json && json.data && json.data._id) {
    pm.environment.set('f2_quizId', json.data._id);
}`
        }),
        request('2.2 Fetch Quiz As Anonymous Student', {
            method: 'GET',
            url: `${BASE}/api/quizzes/{{f2_quizId}}`,
            test: `
const json = pm.response.json();
pm.test('VULNERABLE: correctAnswer is exposed to an unauthenticated caller before submission', function () {
    pm.response.to.have.status(200);
    pm.expect(json.data.questions[0].correctAnswer).to.eql(1);
});`
        }),
        request('2.3 Cleanup - Delete Test Quiz', {
            method: 'DELETE',
            url: `${BASE}/api/quizzes/{{f2_quizId}}`,
            test: `
pm.test('cleanup ok', function () { pm.response.to.have.status(200); });`
        })
    ]
);

// ---------------------------------------------------------------------
// Folder 3 — Finding 3: IDOR on student profile
// ---------------------------------------------------------------------
const f3 = folder(
    'Finding 3 - IDOR on Student Profile (A01) [Requires one-time setup]',
    'SECURITY_AUDIT.md Finding 3. Needs two PRE-EXISTING, verified student accounts. ' +
    'See README "One-Time Setup" and fill studentA_email/studentA_password/studentB_email/studentB_password in the environment before running this folder.',
    [
        request('3.1 Login Student A', {
            method: 'POST',
            url: `${BASE}/api/auth/login`,
            body: { email: '{{studentA_email}}', password: '{{studentA_password}}' },
            test: `
pm.test('Student A login succeeded', function () { pm.response.to.have.status(200); });
const json = pm.response.json();
pm.environment.set('tokenA', json.token);
pm.environment.set('userIdA', json.user.id);`
        }),
        request('3.2 Login Student B', {
            method: 'POST',
            url: `${BASE}/api/auth/login`,
            body: { email: '{{studentB_email}}', password: '{{studentB_password}}' },
            test: `
pm.test('Student B login succeeded', function () { pm.response.to.have.status(200); });
const json = pm.response.json();
pm.environment.set('tokenB', json.token);
pm.environment.set('userIdB', json.user.id);`
        }),
        request('3.3 Student A Reads Student B Profile (IDOR)', {
            method: 'GET',
            url: `${BASE}/api/students/profile/{{userIdB}}`,
            headers: { Authorization: 'Bearer {{tokenA}}' },
            test: `
pm.test('VULNERABLE: Student A can read Student B profile using only Student A own token', function () {
    pm.response.to.have.status(200);
});
const json = pm.response.json();
pm.environment.set('f3_studentB_originalPhone', (json.data && json.data.phone) || '');`
        }),
        request('3.4 Student A Tampers Student B Profile (IDOR write)', {
            method: 'PUT',
            url: `${BASE}/api/students/profile/{{userIdB}}`,
            headers: { Authorization: 'Bearer {{tokenA}}' },
            body: { phone: '0000000000-TAMPERED-BY-A' },
            test: `
pm.test('VULNERABLE: Student A can modify Student B profile', function () {
    pm.response.to.have.status(200);
});`
        }),
        request('3.5 Confirm Tamper Persisted (Student B own view)', {
            method: 'GET',
            url: `${BASE}/api/students/profile/{{userIdB}}`,
            headers: { Authorization: 'Bearer {{tokenB}}' },
            test: `
const json = pm.response.json();
pm.test('Confirms the cross-account write actually persisted in the database', function () {
    pm.expect(json.data.phone).to.eql('0000000000-TAMPERED-BY-A');
});`
        }),
        request('3.6 Cleanup - Restore Student B Phone', {
            method: 'PUT',
            url: `${BASE}/api/students/profile/{{userIdB}}`,
            headers: { Authorization: 'Bearer {{tokenB}}' },
            body: { phone: '{{f3_studentB_originalPhone}}' },
            test: `
pm.test('cleanup ok', function () { pm.response.to.have.status(200); });`
        })
    ]
);

// ---------------------------------------------------------------------
// Folder 4 — Finding 4: Missing auth on AI summary history (self-contained)
// ---------------------------------------------------------------------
const f4 = folder(
    'Finding 4 - Missing Authentication on AI Summary History (A01)',
    'SECURITY_AUDIT.md Finding 4. Fully self-contained: a random-looking Mongo ObjectId is generated locally ' +
    'and used as an arbitrary userId - no real account is needed to prove the endpoints require zero authentication.',
    [
        request('4.1 Save AI Summary As Anonymous (fabricated userId)', {
            method: 'POST',
            url: `${BASE}/api/ai/save`,
            pre: `
function randHex(len) {
    let s = '';
    const chars = '0123456789abcdef';
    for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * 16)];
    return s;
}
pm.environment.set('f4_fakeUserId', randHex(24));`,
            body: {
                userId: '{{f4_fakeUserId}}',
                title: 'F4 Evidence Summary',
                summary: 'test summary content',
                originalText: 'test source text',
                summaryType: 'paragraph'
            },
            test: `
pm.test('VULNERABLE: AI summary saved with no Authorization header, arbitrary userId accepted', function () {
    pm.response.to.have.status(201);
});
const json = pm.response.json();
pm.environment.set('f4_summaryId', json._id);`
        }),
        request('4.2 Read History As Anonymous', {
            method: 'GET',
            url: `${BASE}/api/ai/history/{{f4_fakeUserId}}`,
            test: `
const json = pm.response.json();
pm.test('VULNERABLE: history readable with no Authorization header', function () {
    pm.response.to.have.status(200);
    pm.expect(json.length).to.be.above(0);
});`
        }),
        request('4.3 Update History Item As Anonymous', {
            method: 'PUT',
            url: `${BASE}/api/ai/history/{{f4_summaryId}}`,
            body: { userId: '{{f4_fakeUserId}}', title: 'F4 TAMPERED TITLE' },
            test: `
pm.test('VULNERABLE: history item updated with no Authorization header', function () {
    pm.response.to.have.status(200);
});`
        }),
        request('4.4 Delete History Item As Anonymous', {
            method: 'DELETE',
            url: `${BASE}/api/ai/history/{{f4_summaryId}}`,
            body: { userId: '{{f4_fakeUserId}}' },
            test: `
pm.test('VULNERABLE: history item deleted with no Authorization header', function () {
    pm.response.to.have.status(200);
});`
        })
    ]
);

// ---------------------------------------------------------------------
// Folder 5 — Finding 5: Hardcoded default admin credentials
// ---------------------------------------------------------------------
const f5 = folder(
    'Finding 5 - Hardcoded Default Admin Credentials (A07)',
    'SECURITY_AUDIT.md Finding 5. If seedAdmin.js was ever executed against this database, this login succeeds.',
    [
        request('5.1 Login As Default Seeded Admin', {
            method: 'POST',
            url: `${BASE}/api/auth/login`,
            body: { email: 'admin@examcoach.com', password: 'adminpassword123' },
            test: `
const status = pm.response.code;
if (status === 200) {
    const json = pm.response.json();
    pm.environment.set('adminToken', json.token);
    pm.test('VULNERABLE: default seeded admin credentials are valid on this database', function () {
        pm.expect(json.user.role).to.eql('admin');
    });
} else {
    pm.test('INFO: default admin credentials rejected on this DB instance (seedAdmin.js not run here) - still a latent risk, see SECURITY_AUDIT.md', function () {
        pm.expect(status).to.eql(401);
    });
}`
        }),
        request('5.2 Use Admin Token To Access Platform Overview', {
            method: 'GET',
            url: `${BASE}/api/admin/overview`,
            headers: { Authorization: 'Bearer {{adminToken}}' },
            test: `
if (pm.environment.get('adminToken')) {
    pm.test('VULNERABLE: hardcoded admin credential grants real admin-level API access', function () {
        pm.response.to.have.status(200);
    });
} else {
    pm.test('Skipped - no admin token from 5.1 (credentials were rejected)', function () { pm.expect(true).to.be.true; });
}`
        })
    ]
);

// ---------------------------------------------------------------------
// Folder 6 — Finding 6: Wildcard CORS
// ---------------------------------------------------------------------
const f6 = folder(
    'Finding 6 - Wildcard CORS (A02)',
    'SECURITY_AUDIT.md Finding 6. The hardcoded-secret half of this finding is source-code evidence ' +
    '(see uploadMiddleware.js / quizController.js) - optionally verified live in the separate OPTIONAL folder below.',
    [
        request('6.1 Check CORS Header From Untrusted Origin', {
            method: 'GET',
            url: `${BASE}/api/quizzes`,
            headers: { Origin: 'https://evil-example.com' },
            test: `
pm.test('VULNERABLE: API reflects wildcard Access-Control-Allow-Origin for an arbitrary untrusted origin', function () {
    pm.response.to.have.header('Access-Control-Allow-Origin');
    pm.expect(pm.response.headers.get('Access-Control-Allow-Origin')).to.eql('*');
});`
        })
    ]
);

// ---------------------------------------------------------------------
// Folder 7 — Finding 7: Plaintext quiz password disclosure
// ---------------------------------------------------------------------
const f7 = folder(
    'Finding 7 - Plaintext Quiz Password Disclosure (A04)',
    'SECURITY_AUDIT.md Finding 7.',
    [
        request('7.1 Create Password-Protected Quiz (No Auth)', {
            method: 'POST',
            url: `${BASE}/api/quizzes`,
            body: {
                title: 'F7 - Password Disclosure Test',
                subject: 'Security Audit',
                questions: [{ question: 'Q1', options: ['A', 'B'], correctAnswer: 0 }],
                quizPassword: 'SuperSecret123!',
                enrollmentKey: 'ENROLL-XYZ'
            },
            test: `
pm.test('Setup: password-protected quiz created', function () { pm.response.to.have.status(201); });
const json = pm.response.json();
if (json && json.data && json.data._id) {
    pm.environment.set('f7_quizId', json.data._id);
}`
        }),
        request('7.2 Fetch Quiz Credentials As Anonymous', {
            method: 'GET',
            url: `${BASE}/api/quizzes/{{f7_quizId}}?includeCredentials=true`,
            test: `
const json = pm.response.json();
pm.test('VULNERABLE: plaintext quizPassword/enrollmentKey returned to an unauthenticated caller', function () {
    pm.response.to.have.status(200);
    pm.expect(json.data.quizPassword).to.eql('SuperSecret123!');
    pm.expect(json.data.enrollmentKey).to.eql('ENROLL-XYZ');
});`
        }),
        request('7.3 Cleanup - Delete Test Quiz', {
            method: 'DELETE',
            url: `${BASE}/api/quizzes/{{f7_quizId}}`,
            test: `
pm.test('cleanup ok', function () { pm.response.to.have.status(200); });`
        })
    ]
);

// ---------------------------------------------------------------------
// Folder 8 — Finding 8: Sensitive data logged (triggers only)
// ---------------------------------------------------------------------
const f8 = folder(
    'Finding 8 - Sensitive Data Logged in Plaintext (A09) [Check server console]',
    'SECURITY_AUDIT.md Finding 8. These requests only TRIGGER the log lines. The actual evidence is the server ' +
    'console/terminal output captured at the same moment - keep the backend terminal visible while running this folder.',
    [
        request('8.1 Trigger Registration OTP Log', {
            method: 'POST',
            url: `${BASE}/api/auth/register-student`,
            pre: `
function randHex(len) {
    let s = '';
    const chars = '0123456789abcdef';
    for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * 16)];
    return s;
}
pm.environment.set('f8_randomEmail', 'sectest+' + randHex(8) + '@example.com');`,
            body: { firstName: 'Log', lastName: 'Test', email: '{{f8_randomEmail}}', password: 'TestPass123!' },
            test: `
pm.test('Registration triggered - now check the server console for a plaintext "DEVELOPMENT OTP" line', function () {
    pm.response.to.have.status(201);
});`
        }),
        request('8.2 Trigger Password-Reset Token Log', {
            method: 'POST',
            url: `${BASE}/api/auth/forgot-password`,
            body: { email: '{{studentA_email}}' },
            test: `
pm.test('Reset triggered - now check the server console for the plaintext reset URL/token', function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 404]);
});`
        }),
        request('8.3 Trigger Bearer-Token Log Line', {
            method: 'GET',
            url: `${BASE}/api/auth/me`,
            headers: { Authorization: 'Bearer {{tokenA}}' },
            test: `
pm.test('Authenticated call made - now check the server console for the [AUTH] ... Authorization header line', function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 401]);
});`
        })
    ]
);

// ---------------------------------------------------------------------
// Optional folder — live Cloudinary secret verification (not in default run)
// ---------------------------------------------------------------------
const optional = folder(
    'OPTIONAL - Live Cloudinary Hardcoded Secret Verification',
    'Only run this if YOU own this Cloudinary account (du1gjenvg). Proves the secret hardcoded in ' +
    'Backend/middleware/uploadMiddleware.js and Backend/controllers/quizController.js is a live, working credential. ' +
    'Excluded from the default Newman run - see README for how to run it separately.',
    [
        {
            name: '9.1 List Cloudinary Resources Using Hardcoded Secret',
            event: [{
                listen: 'test',
                script: js(`
pm.test('VULNERABLE: hardcoded Cloudinary secret from source code is a live, working credential', function () {
    pm.response.to.have.status(200);
});`)
            }],
            request: {
                method: 'GET',
                header: [],
                url: 'https://api.cloudinary.com/v1_1/du1gjenvg/resources/image',
                auth: {
                    type: 'basic',
                    basic: [
                        { key: 'username', value: '735518326372853', type: 'string' },
                        { key: 'password', value: 'APN9C79BAZrybhYYiCL69pqelRs', type: 'string' }
                    ]
                }
            },
            response: []
        }
    ]
);

// ---------------------------------------------------------------------
// Assemble collection
// ---------------------------------------------------------------------
const collection = {
    info: {
        _postman_id: 'c4f2b7a0-examcoach-security-audit-0001',
        name: 'ExamCoach Security Audit - Black Box Evidence',
        description:
            'Automated black-box evidence collection for the 8 findings in SECURITY_AUDIT.md. ' +
            'Run with Newman before and after each fix to produce a before/after HTML report. ' +
            'See security-testing/README.md for setup and run commands.',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    item: [f1, f2, f3, f4, f5, f6, f7, f8, optional],
    variable: [{ key: 'baseUrl', value: 'http://localhost:5000', type: 'string' }]
};

const environment = {
    id: 'a1e9c2d0-examcoach-local-dev-env-0001',
    name: 'ExamCoach - Local Dev',
    values: [
        { key: 'baseUrl', value: 'http://localhost:5000', type: 'default', enabled: true },
        { key: 'studentA_email', value: '', type: 'default', enabled: true },
        { key: 'studentA_password', value: '', type: 'default', enabled: true },
        { key: 'studentB_email', value: '', type: 'default', enabled: true },
        { key: 'studentB_password', value: '', type: 'default', enabled: true },
        { key: 'tokenA', value: '', type: 'default', enabled: true },
        { key: 'tokenB', value: '', type: 'default', enabled: true },
        { key: 'userIdA', value: '', type: 'default', enabled: true },
        { key: 'userIdB', value: '', type: 'default', enabled: true },
        { key: 'adminToken', value: '', type: 'default', enabled: true },
        { key: 'f1_quizId', value: '', type: 'default', enabled: true },
        { key: 'f2_quizId', value: '', type: 'default', enabled: true },
        { key: 'f3_studentB_originalPhone', value: '', type: 'default', enabled: true },
        { key: 'f4_fakeUserId', value: '', type: 'default', enabled: true },
        { key: 'f4_summaryId', value: '', type: 'default', enabled: true },
        { key: 'f7_quizId', value: '', type: 'default', enabled: true },
        { key: 'f8_randomEmail', value: '', type: 'default', enabled: true }
    ],
    _postman_variable_scope: 'environment'
};

fs.writeFileSync(path.join(__dirname, 'ExamCoach-Security-Audit.postman_collection.json'), JSON.stringify(collection, null, 2));
fs.writeFileSync(path.join(__dirname, 'ExamCoach-Local-Dev.postman_environment.json'), JSON.stringify(environment, null, 2));

console.log('Wrote ExamCoach-Security-Audit.postman_collection.json and ExamCoach-Local-Dev.postman_environment.json');
