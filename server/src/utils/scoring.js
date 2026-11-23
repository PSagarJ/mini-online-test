/**
 * Calculates score and builds review items from an attempt snapshot and submitted answers
 */
function evaluateAttempt(attempt) {
  const answerMap = new Map();
  if (Array.isArray(attempt.answers)) {
    attempt.answers.forEach(ans => {
      if (ans && ans.questionId) {
        answerMap.set(ans.questionId.toString(), ans.selectedIndex);
      }
    });
  }

  let score = 0;
  const review = attempt.questions.map(q => {
    const qIdStr = q.questionId.toString();
    const selectedIndex = answerMap.has(qIdStr) && answerMap.get(qIdStr) !== null && answerMap.get(qIdStr) !== undefined
      ? Number(answerMap.get(qIdStr))
      : null;

    const isCorrect = selectedIndex !== null && selectedIndex === q.correctIndex;
    if (isCorrect) {
      score += 1;
    }

    return {
      questionId: q.questionId,
      text: q.text,
      options: q.options,
      selectedIndex,
      correctIndex: q.correctIndex,
      isCorrect,
      explanation: q.explanation || ''
    };
  });

  const total = attempt.questions.length || 10;
  const percentage = Math.round((score / total) * 100);

  return {
    score,
    total,
    percentage,
    review
  };
}

module.exports = {
  evaluateAttempt
};
