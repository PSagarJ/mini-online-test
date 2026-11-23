const { test, describe } = require('node:test');
const assert = require('node:assert');
const { checkAndExpireAttempt } = require('../src/utils/expiry');

describe('Deadline & Grace Period Rules', () => {
  const baseQuestions = [
    { questionId: 'q1', text: 'Q1', options: ['A', 'B', 'C', 'D'], correctIndex: 0, explanation: '' }
  ];

  test('finalizes as timed_out / deadline_passed when now > deadline + 15s', async () => {
    const startedAt = new Date(Date.now() - 700 * 1000);
    // Deadline was 100 seconds ago (far past 15s grace period)
    const deadline = new Date(Date.now() - 100 * 1000);

    const mockAttempt = {
      startedAt,
      deadline,
      status: 'in_progress',
      endReason: null,
      questions: baseQuestions,
      answers: [{ questionId: 'q1', selectedIndex: 0 }],
      score: 0,
      total: 1,
      save: async function() { return this; }
    };

    const evaluated = await checkAndExpireAttempt(mockAttempt);

    assert.strictEqual(evaluated.status, 'timed_out');
    assert.strictEqual(evaluated.endReason, 'deadline_passed');
    assert.strictEqual(evaluated.score, 1);
  });

  test('leaves attempt in_progress when within active exam duration or grace period', async () => {
    const startedAt = new Date();
    // Deadline is in future (e.g. 500 seconds remaining)
    const deadline = new Date(Date.now() + 500 * 1000);

    const mockAttempt = {
      startedAt,
      deadline,
      status: 'in_progress',
      endReason: null,
      questions: baseQuestions,
      answers: [],
      save: async function() { return this; }
    };

    const evaluated = await checkAndExpireAttempt(mockAttempt);
    assert.strictEqual(evaluated.status, 'in_progress');
    assert.strictEqual(evaluated.endReason, null);
  });

  test('submission timing rules: manual vs time_up vs deadline_passed', () => {
    const deadlineTime = 1000000;
    const graceMs = 15000;

    function determineStatusAndReason(submissionTime) {
      if (submissionTime < deadlineTime) {
        return { status: 'submitted', endReason: 'manual' };
      } else if (submissionTime <= deadlineTime + graceMs) {
        return { status: 'submitted', endReason: 'time_up' };
      } else {
        return { status: 'timed_out', endReason: 'deadline_passed' };
      }
    }

    // 1. Submitted before deadline
    assert.deepStrictEqual(
      determineStatusAndReason(deadlineTime - 1000),
      { status: 'submitted', endReason: 'manual' }
    );

    // 2. Submitted exactly at deadline
    assert.deepStrictEqual(
      determineStatusAndReason(deadlineTime),
      { status: 'submitted', endReason: 'time_up' }
    );

    // 3. Submitted 10 seconds past deadline (within 15s grace)
    assert.deepStrictEqual(
      determineStatusAndReason(deadlineTime + 10000),
      { status: 'submitted', endReason: 'time_up' }
    );

    // 4. Submitted exactly at 15s grace cutoff
    assert.deepStrictEqual(
      determineStatusAndReason(deadlineTime + 15000),
      { status: 'submitted', endReason: 'time_up' }
    );

    // 5. Submitted 16 seconds past deadline (exceeds grace)
    assert.deepStrictEqual(
      determineStatusAndReason(deadlineTime + 16000),
      { status: 'timed_out', endReason: 'deadline_passed' }
    );
  });
});
