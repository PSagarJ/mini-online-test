const { test, describe } = require('node:test');
const assert = require('node:assert');
const { evaluateAttempt } = require('../src/utils/scoring');

describe('Attempt Scoring & Review Generation', () => {
  const sampleSnapshotQuestions = [
    { questionId: 'q1', text: 'Q1', options: ['A', 'B', 'C', 'D'], correctIndex: 0, explanation: 'Exp 1' },
    { questionId: 'q2', text: 'Q2', options: ['A', 'B', 'C', 'D'], correctIndex: 1, explanation: 'Exp 2' },
    { questionId: 'q3', text: 'Q3', options: ['A', 'B', 'C', 'D'], correctIndex: 2, explanation: 'Exp 3' },
    { questionId: 'q4', text: 'Q4', options: ['A', 'B', 'C', 'D'], correctIndex: 3, explanation: 'Exp 4' },
    { questionId: 'q5', text: 'Q5', options: ['A', 'B', 'C', 'D'], correctIndex: 0, explanation: 'Exp 5' },
    { questionId: 'q6', text: 'Q6', options: ['A', 'B', 'C', 'D'], correctIndex: 1, explanation: 'Exp 6' },
    { questionId: 'q7', text: 'Q7', options: ['A', 'B', 'C', 'D'], correctIndex: 2, explanation: 'Exp 7' },
    { questionId: 'q8', text: 'Q8', options: ['A', 'B', 'C', 'D'], correctIndex: 3, explanation: 'Exp 8' },
    { questionId: 'q9', text: 'Q9', options: ['A', 'B', 'C', 'D'], correctIndex: 0, explanation: 'Exp 9' },
    { questionId: 'q10', text: 'Q10', options: ['A', 'B', 'C', 'D'], correctIndex: 1, explanation: 'Exp 10' }
  ];

  test('accurately calculates score for mixed correct, wrong, and unanswered questions', () => {
    const attempt = {
      questions: sampleSnapshotQuestions,
      answers: [
        { questionId: 'q1', selectedIndex: 0 }, // Correct (+1)
        { questionId: 'q2', selectedIndex: 1 }, // Correct (+1)
        { questionId: 'q3', selectedIndex: 0 }, // Wrong (0)
        { questionId: 'q4', selectedIndex: 3 }, // Correct (+1)
        { questionId: 'q5', selectedIndex: 0 }, // Correct (+1)
        { questionId: 'q6', selectedIndex: 2 }, // Wrong (0)
        { questionId: 'q7', selectedIndex: 2 }, // Correct (+1)
        // q8, q9, q10 unanswered
      ]
    };

    const result = evaluateAttempt(attempt);

    assert.strictEqual(result.score, 5);
    assert.strictEqual(result.total, 10);
    assert.strictEqual(result.percentage, 50);
    assert.strictEqual(result.review.length, 10);

    // Verify individual review attributes
    assert.strictEqual(result.review[0].isCorrect, true);
    assert.strictEqual(result.review[2].isCorrect, false);
    assert.strictEqual(result.review[7].selectedIndex, null);
    assert.strictEqual(result.review[7].isCorrect, false);
  });

  test('scores 10/10 with 100% when all answers match correctIndex', () => {
    const attempt = {
      questions: sampleSnapshotQuestions,
      answers: sampleSnapshotQuestions.map(q => ({
        questionId: q.questionId,
        selectedIndex: q.correctIndex
      }))
    };

    const result = evaluateAttempt(attempt);
    assert.strictEqual(result.score, 10);
    assert.strictEqual(result.percentage, 100);
  });

  test('scores 0/10 with 0% when no answers provided', () => {
    const attempt = {
      questions: sampleSnapshotQuestions,
      answers: []
    };

    const result = evaluateAttempt(attempt);
    assert.strictEqual(result.score, 0);
    assert.strictEqual(result.percentage, 0);
  });
});
