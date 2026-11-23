const { test, describe } = require('node:test');
const assert = require('node:assert');
const { evaluateAttempt } = require('../src/utils/scoring');

describe('Violation Counter & Anti-Cheat Engine', () => {
  // Pure logic engine test matching server/src/routes/attempts.js behavior
  function processViolation(attempt, type, timestamp = Date.now()) {
    if (attempt.status !== 'in_progress') {
      return {
        violationCount: attempt.violationCount,
        limit: 6,
        finalized: true
      };
    }

    // 1-second deduplication rule
    if (attempt.violations && attempt.violations.length > 0) {
      const last = attempt.violations[attempt.violations.length - 1];
      const lastTime = new Date(last.at).getTime();
      if (timestamp - lastTime < 1000) {
        return {
          violationCount: attempt.violationCount,
          limit: 6,
          finalized: false
        };
      }
    }

    attempt.violationCount = (attempt.violationCount || 0) + 1;
    attempt.violations.push({ type, at: new Date(timestamp) });

    if (attempt.violationCount >= 6) {
      const { score, total } = evaluateAttempt(attempt);
      attempt.status = 'submitted';
      attempt.endReason = type;
      attempt.score = score;
      attempt.total = total;
      attempt.submittedAt = new Date(timestamp);
      return {
        violationCount: 6,
        limit: 6,
        finalized: true
      };
    }

    return {
      violationCount: attempt.violationCount,
      limit: 6,
      finalized: false
    };
  }

  test('increments warnings on counts 1 to 5 without finalizing', () => {
    const attempt = {
      status: 'in_progress',
      violationCount: 0,
      violations: [],
      questions: [],
      answers: []
    };

    let baseTime = 1000000;
    for (let i = 1; i <= 5; i++) {
      baseTime += 1500; // Spaced > 1000ms apart
      const res = processViolation(attempt, 'tab_switch', baseTime);
      assert.strictEqual(res.violationCount, i);
      assert.strictEqual(res.finalized, false);
      assert.strictEqual(attempt.status, 'in_progress');
    }
  });

  test('auto-submits on 6th violation with correct endReason matching violation type', () => {
    const attempt = {
      status: 'in_progress',
      violationCount: 5,
      violations: [{ type: 'tab_switch', at: new Date(1000000) }],
      questions: [
        { questionId: 'q1', text: 'Q1', options: ['A', 'B', 'C', 'D'], correctIndex: 0, explanation: '' }
      ],
      answers: [{ questionId: 'q1', selectedIndex: 0 }]
    };

    const res = processViolation(attempt, 'window_switch', 1002000);
    assert.strictEqual(res.violationCount, 6);
    assert.strictEqual(res.finalized, true);
    assert.strictEqual(attempt.status, 'submitted');
    assert.strictEqual(attempt.endReason, 'window_switch');
    assert.strictEqual(attempt.score, 1);
  });

  test('ignores duplicate violations occurring within 1000 milliseconds', () => {
    const attempt = {
      status: 'in_progress',
      violationCount: 2,
      violations: [{ type: 'tab_switch', at: new Date(1000000) }],
      questions: [],
      answers: []
    };

    // Fired 300ms after previous violation
    const res = processViolation(attempt, 'window_switch', 1000300);
    assert.strictEqual(res.violationCount, 2); // Unchanged
    assert.strictEqual(res.finalized, false);
    assert.strictEqual(attempt.violations.length, 1);
  });

  test('ignores subsequent violations once attempt is already finalized', () => {
    const attempt = {
      status: 'submitted',
      endReason: 'manual',
      violationCount: 2,
      violations: [],
      questions: [],
      answers: []
    };

    const res = processViolation(attempt, 'tab_switch', 2000000);
    assert.strictEqual(res.violationCount, 2);
    assert.strictEqual(res.finalized, true);
    assert.strictEqual(attempt.endReason, 'manual'); // Kept original end reason
  });
});
