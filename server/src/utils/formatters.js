const { evaluateAttempt } = require('./scoring');

/**
 * Format an in-progress attempt for safe client consumption.
 * Never includes correct answers or explanations!
 */
function formatInProgressPayload(attempt, bankName = '') {
  return {
    id: attempt._id,
    bankName: bankName || (attempt.bank && attempt.bank.name ? attempt.bank.name : 'Assessment'),
    status: attempt.status,
    startedAt: attempt.startedAt,
    serverTime: new Date().toISOString(),
    deadline: attempt.deadline,
    durationSeconds: attempt.durationSeconds || 0,
    violationCount: attempt.violationCount || 0,
    violationLimit: 6,
    questions: attempt.questions.map(q => ({
      id: q.questionId,
      text: q.text,
      options: q.options
    })),
    answers: attempt.answers || []
  };
}

/**
 * Format a finalized result payload for client review.
 */
function formatResultPayload(attempt, bankName = '') {
  const { score, total, percentage, review } = evaluateAttempt(attempt);

  return {
    id: attempt._id,
    bankName: bankName || (attempt.bank && attempt.bank.name ? attempt.bank.name : 'Assessment'),
    status: attempt.status,
    endReason: attempt.endReason,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    durationSeconds: attempt.durationSeconds,
    score: attempt.score !== undefined ? attempt.score : score,
    total: attempt.total || total,
    percentage: percentage,
    violationCount: attempt.violationCount || 0,
    review
  };
}

module.exports = {
  formatInProgressPayload,
  formatResultPayload
};
