const Attempt = require('../models/Attempt');
const { evaluateAttempt } = require('./scoring');

/**
 * Checks and finalizes any in-progress attempt that is more than 15 seconds past its deadline.
 * Grace period: 15,000 milliseconds.
 */
async function checkAndExpireAttempt(attempt) {
  if (!attempt || attempt.status !== 'in_progress') {
    return attempt;
  }

  const now = Date.now();
  const deadlineTime = new Date(attempt.deadline).getTime();
  const gracePeriodMs = 15 * 1000;

  if (now > deadlineTime + gracePeriodMs) {
    const { score, total } = evaluateAttempt(attempt);
    attempt.status = 'timed_out';
    attempt.endReason = 'deadline_passed';
    attempt.score = score;
    attempt.total = total;
    attempt.submittedAt = new Date(deadlineTime + gracePeriodMs);
    attempt.durationSeconds = Math.max(0, Math.round((attempt.submittedAt.getTime() - new Date(attempt.startedAt).getTime()) / 1000));
    await attempt.save();
  }

  return attempt;
}

/**
 * Checks and expires all active attempts for a given user or system-wide if past deadline + 15s.
 */
async function expireUserActiveAttempts(userId) {
  const query = {
    status: 'in_progress'
  };
  if (userId) {
    query.user = userId;
  }

  const activeAttempts = await Attempt.find(query);
  for (const attempt of activeAttempts) {
    await checkAndExpireAttempt(attempt);
  }
}

module.exports = {
  checkAndExpireAttempt,
  expireUserActiveAttempts
};
