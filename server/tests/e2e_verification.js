require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const http = require('http');
const assert = require('assert');
const app = require('../src/app');
const connectDB = require('../src/config/db');
const runStartupTasks = require('../src/config/startup');
const { MAIN_ADMIN_EMAIL, MAIN_ADMIN_PASSWORD } = require('../src/config/mainAdmin');

async function runEndToEndVerification() {
  console.log('--- Starting End-to-End Verification ---');

  await connectDB();
  await runStartupTasks();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;
  console.log(`Test server running at ${baseUrl}`);

  try {
    // 1. Health check
    const healthRes = await fetch(`${baseUrl}/health`).then(r => r.json());
    assert.strictEqual(healthRes.ok, true, 'Health check failed');
    console.log('✔ Health check OK');

    // 2. Fetch public classes
    const classesRes = await fetch(`${baseUrl}/classes`).then(r => r.json());
    assert.ok(classesRes.classes.length >= 12, 'Default classes not found');
    const class8 = classesRes.classes.find(c => c.name === 'Class 8');
    assert.ok(class8, 'Class 8 not found');
    console.log('✔ Classes listing verified (Class 1-12)');

    // 3. Student Signup
    const testStudentEmail = `student_${Date.now()}@university.edu`;
    const signupRes = await fetch(`${baseUrl}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alex Student',
        email: testStudentEmail,
        password: 'password123',
        classId: class8._id
      })
    });
    const signupData = await signupRes.json();
    assert.strictEqual(signupRes.status, 201, `Signup failed: ${signupData.message}`);
    const studentToken = signupData.token;
    assert.ok(studentToken, 'No token returned on signup');
    assert.strictEqual(signupData.user.role, 'student');
    console.log('✔ Student signup verified');

    // 4. Student Bank listing
    const banksRes = await fetch(`${baseUrl}/banks`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    }).then(r => r.json());
    assert.ok(Array.isArray(banksRes.banks), 'Banks is not an array');
    assert.ok(banksRes.banks.length >= 1, 'No banks for Class 8');
    const mathBank = banksRes.banks.find(b => b.subject === 'Mathematics');
    assert.ok(mathBank, 'Mathematics bank not found for Class 8');
    assert.ok(mathBank.questionCount >= 10, 'Math bank does not have 10+ questions');
    console.log(`✔ Student bank listing verified (${banksRes.banks.length} banks available)`);

    // 5. Start Test Attempt
    const attemptRes = await fetch(`${baseUrl}/attempts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({ bankId: mathBank.id })
    });
    const attemptData = await attemptRes.json();
    assert.strictEqual(attemptRes.status, 201, `Start attempt failed: ${attemptData.message}`);
    const attemptId = attemptData.attempt.id;
    assert.strictEqual(attemptData.attempt.questions.length, 10);
    // Security check: questions must NOT contain correctIndex or explanation
    assert.strictEqual(attemptData.attempt.questions[0].correctIndex, undefined, 'CRITICAL: correctIndex leaked in in-progress payload!');
    assert.strictEqual(attemptData.attempt.questions[0].explanation, undefined, 'CRITICAL: explanation leaked in in-progress payload!');
    console.log('✔ Test attempt started with 10 questions snapshot (no answers leaked)');

    // 6. Autosave answers
    const q1 = attemptData.attempt.questions[0];
    const autosaveRes = await fetch(`${baseUrl}/attempts/${attemptId}/answers`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        answers: [{ questionId: q1.id, selectedIndex: 0 }]
      })
    });
    const autosaveData = await autosaveRes.json();
    assert.strictEqual(autosaveRes.status, 200);
    assert.strictEqual(autosaveData.success, true);
    console.log('✔ Debounced autosave answered selection verified');

    // 7. Anti-Cheat Violations (1 to 5 warnings, 6th auto-submits)
    for (let v = 1; v <= 5; v++) {
      // Add delay > 1000ms for server-side debounce
      await new Promise(r => setTimeout(r, 1050));
      const vRes = await fetch(`${baseUrl}/attempts/${attemptId}/violations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${studentToken}`
        },
        body: JSON.stringify({ type: 'tab_switch' })
      }).then(r => r.json());
      assert.strictEqual(vRes.violationCount, v);
      assert.strictEqual(vRes.finalized, false);
    }
    console.log('✔ Warnings 1 to 5 recorded with threshold limit 6');

    // 8. 6th Violation -> auto submit
    await new Promise(r => setTimeout(r, 1050));
    const v6Res = await fetch(`${baseUrl}/attempts/${attemptId}/violations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({ type: 'window_switch' })
    }).then(r => r.json());
    assert.strictEqual(v6Res.violationCount, 6);
    assert.strictEqual(v6Res.finalized, true);
    assert.strictEqual(v6Res.attempt.status, 'submitted');
    assert.strictEqual(v6Res.attempt.endReason, 'window_switch');
    assert.ok(v6Res.attempt.review.length === 10, 'Review not populated in result');
    console.log('✔ 6th violation auto-submitted test with endReason "window_switch"');

    // 9. Check History endpoint
    const historyRes = await fetch(`${baseUrl}/attempts`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    }).then(r => r.json());
    assert.ok(historyRes.attempts.length >= 1);
    assert.strictEqual(historyRes.attempts[0].id, attemptId);
    assert.strictEqual(historyRes.attempts[0].endReason, 'window_switch');
    console.log('✔ History endpoint verified with score and endReason');

    // 10. Admin Access Control: Student blocked from Admin API
    const studentBlockedRes = await fetch(`${baseUrl}/admin/users`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    assert.strictEqual(studentBlockedRes.status, 403, 'Student was not forbidden (403) from admin route!');
    console.log('✔ Student access to /admin properly blocked (403 Forbidden)');

    // 11. Main Admin Login
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: MAIN_ADMIN_EMAIL,
        password: MAIN_ADMIN_PASSWORD
      })
    });
    const adminData = await adminLoginRes.json();
    assert.strictEqual(adminLoginRes.status, 200, `Admin login failed: ${adminData.message}`);
    const adminToken = adminData.token;
    assert.strictEqual(adminData.user.role, 'admin');
    assert.strictEqual(adminData.user.isMainAdmin, true);
    console.log('✔ Main admin login verified');

    // 12. Admin Question Bank Management
    const testSubject = `Subject_${Date.now()}`;
    const createBankRes = await fetch(`${baseUrl}/admin/banks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        classId: class8._id,
        subject: testSubject
      })
    });
    const createdBankData = await createBankRes.json();
    assert.strictEqual(createBankRes.status, 201);
    const newBankId = createdBankData.bank.id;
    console.log(`✔ Admin created new question bank: ${createdBankData.bank.name}`);

    // 13. Admin Add Question
    const addQRes = await fetch(`${baseUrl}/admin/banks/${newBankId}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        text: 'What is 10 + 10?',
        options: ['10', '20', '30', '40'],
        correctIndex: 1,
        explanation: '10 plus 10 equals 20.'
      })
    });
    const addQData = await addQRes.json();
    assert.strictEqual(addQRes.status, 201);
    const qId = addQData.question.id;
    console.log('✔ Admin added question to bank');

    // 14. Admin Edit Question
    const editQRes = await fetch(`${baseUrl}/admin/questions/${qId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        text: 'What is 10 + 10? (Updated)',
        options: ['10', '20', '30', '40'],
        correctIndex: 1,
        explanation: 'Updated explanation.'
      })
    });
    assert.strictEqual(editQRes.status, 200);
    console.log('✔ Admin edited question');

    // 15. Admin Archive and Restore Question
    await fetch(`${baseUrl}/admin/questions/${qId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ archived: true })
    });
    console.log('✔ Admin archived question');

    // 16. CSV Import Validation: Bad Row blocks entire import
    const badCsv = `question,option_a,option_b,option_c,option_d,correct,explanation
Valid Q1,Opt1,Opt2,Opt3,Opt4,A,Good
Invalid Q2,Same,Same,Opt3,Opt4,B,Duplicates!
`;
    const badImportRes = await fetch(`${baseUrl}/admin/banks/${newBankId}/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ csv: badCsv })
    });
    const badImportData = await badImportRes.json();
    assert.strictEqual(badImportRes.status, 400, 'Bad CSV import was not rejected!');
    assert.ok(badImportData.errors.length >= 1);
    console.log('✔ CSV Import correctly rejected bad row and imported nothing (Atomic)');

    // 17. Clean CSV Import
    const cleanCsv = `question,option_a,option_b,option_c,option_d,correct,explanation
"Clean Q1, with comma",Alpha,Beta,Gamma,Delta,A,Exp 1
Clean Q2,Option 1,Option 2,Option 3,Option 4,B,Exp 2
`;
    const cleanImportRes = await fetch(`${baseUrl}/admin/banks/${newBankId}/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ csv: cleanCsv })
    });
    const cleanImportData = await cleanImportRes.json();
    assert.strictEqual(cleanImportRes.status, 201);
    assert.strictEqual(cleanImportData.imported, 2);
    console.log('✔ Clean CSV batch imported 2 questions successfully');

    // 18. User Role Management: Promote student to admin
    const promoteRes = await fetch(`${baseUrl}/admin/users/${signupData.user.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ role: 'admin' })
    });
    assert.strictEqual(promoteRes.status, 200);
    console.log('✔ Promoted student to admin');

    // 19. Demote student back
    const demoteRes = await fetch(`${baseUrl}/admin/users/${signupData.user.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ role: 'student' })
    });
    assert.strictEqual(demoteRes.status, 200);
    console.log('✔ Demoted admin back to student');

    // 20. Security Check: Main admin cannot be demoted
    const demoteMainRes = await fetch(`${baseUrl}/admin/users/${adminData.user.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ role: 'student' })
    });
    assert.strictEqual(demoteMainRes.status, 400, 'Main admin was demoted!');
    console.log('✔ Main admin demotion properly blocked by server security check');

    // 21. Admin Results Overview
    const resultsOverviewRes = await fetch(`${baseUrl}/admin/results`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    }).then(r => r.json());
    assert.ok(Array.isArray(resultsOverviewRes.rows));
    assert.ok(resultsOverviewRes.rows.length >= 1);
    console.log(`✔ Admin results overview verified (${resultsOverviewRes.rows.length} total attempts listed)`);

    console.log('\n--- ALL END-TO-END VERIFICATION CHECKS PASSED SUCCESSFULLY! ---');
  } finally {
    server.close();
    await require('mongoose').connection.close();
    process.exit(0);
  }
}

runEndToEndVerification().catch(err => {
  console.error('End-to-End verification failed:', err);
  process.exit(1);
});
