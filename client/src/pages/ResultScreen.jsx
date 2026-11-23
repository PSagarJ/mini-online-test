import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Award, CheckCircle2, XCircle, AlertCircle, ArrowLeft, RotateCcw } from 'lucide-react';

const VIOLATION_LABELS = {
  tab_switch: 'Tab switches (6)',
  window_switch: 'Window switches (6)',
  reload_or_close: 'Reloads or closing (6)',
  navigation: 'Back navigation (6)'
};

export const ResultScreen = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'correct', 'wrong'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadResult() {
      try {
        setLoading(true);
        const data = await api.get(`/attempts/${attemptId}`);
        setResult(data.attempt);
      } catch (err) {
        setError(err.message || 'Failed to load assessment results.');
      } finally {
        setLoading(false);
      }
    }
    loadResult();
  }, [attemptId]);

  if (loading) {
    return (
      <div className="container" style={{ padding: 'var(--space-12) 0', textAlign: 'center' }}>
        <p style={{ color: 'var(--muted-text)' }}>Calculating and compiling assessment results...</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="container" style={{ padding: 'var(--space-12) 0', textAlign: 'center' }}>
        <p style={{ color: 'var(--wrong)', marginBottom: 'var(--space-4)' }}>{error || 'Result not found.'}</p>
        <Link to="/" className="btn btn-primary">Return to Dashboard</Link>
      </div>
    );
  }

  const review = result.review || [];
  const correctCount = review.filter(q => q.isCorrect).length;
  const wrongCount = review.length - correctCount;

  // Filter reviews
  const filteredReview = review.filter(q => {
    if (filter === 'correct') return q.isCorrect;
    if (filter === 'wrong') return !q.isCorrect;
    return true;
  });

  // Ending banner rendering
  let banner = null;
  if (result.endReason === 'time_up') {
    banner = (
      <div className="card" style={{
        backgroundColor: 'var(--warning-bg)',
        borderColor: '#E2C29B',
        color: 'var(--warning)',
        marginBottom: 'var(--space-6)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)'
      }}>
        <AlertCircle size={20} />
        <span style={{ fontWeight: 500, fontSize: '14px' }}>
          Time ran out. Your answers were submitted.
        </span>
      </div>
    );
  } else if (['tab_switch', 'window_switch', 'reload_or_close', 'navigation'].includes(result.endReason)) {
    const reasonLabel = VIOLATION_LABELS[result.endReason] || result.endReason;
    banner = (
      <div className="card" style={{
        backgroundColor: 'var(--wrong-bg)',
        borderColor: '#EBB6AE',
        color: 'var(--wrong)',
        marginBottom: 'var(--space-6)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)'
      }}>
        <AlertCircle size={20} />
        <span style={{ fontWeight: 500, fontSize: '14px' }}>
          Submitted automatically after 6 violations. The last one was: {reasonLabel}.
        </span>
      </div>
    );
  } else if (result.endReason === 'deadline_passed') {
    banner = (
      <div className="card" style={{
        backgroundColor: 'var(--warning-bg)',
        borderColor: '#E2C29B',
        color: 'var(--warning)',
        marginBottom: 'var(--space-6)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)'
      }}>
        <AlertCircle size={20} />
        <span style={{ fontWeight: 500, fontSize: '14px' }}>
          The time limit passed before you came back, so your saved answers were scored.
        </span>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: 'var(--space-8) 0' }}>
      {/* Optional Reason Banner */}
      {banner}

      {/* Main Score Card */}
      <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center', marginBottom: 'var(--space-6)' }}>
        <span className="badge" style={{ marginBottom: 'var(--space-3)' }}>
          {result.bankName}
        </span>
        <h1 className="serif-title" style={{ fontSize: '24px', marginBottom: 'var(--space-4)' }}>
          Assessment Complete
        </h1>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px', marginBottom: 'var(--space-2)' }}>
          <span className="serif-title tabular-nums" style={{ fontSize: '64px', lineHeight: 1, color: 'var(--ink)' }}>
            {result.score}
          </span>
          <span style={{ fontSize: '24px', color: 'var(--muted-text)', fontWeight: 500 }}>
            / {result.total || 10}
          </span>
        </div>

        <div style={{ fontSize: '15px', color: 'var(--muted-text)', marginBottom: 'var(--space-4)' }}>
          You achieved a score of <strong style={{ color: 'var(--ink)' }}>{result.percentage}%</strong>.
          {wrongCount === 0
            ? ' Perfect score! Excellent performance.'
            : ` You got ${result.score} of ${result.total || 10}. Review the ${wrongCount} you missed.`}
        </div>

        {/* Thin Progress Bar */}
        <div style={{
          height: '6px',
          backgroundColor: 'var(--hairline)',
          borderRadius: '3px',
          maxWidth: '320px',
          margin: '0 auto var(--space-6)',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${result.percentage}%`,
            backgroundColor: result.percentage >= 60 ? 'var(--correct)' : 'var(--wrong)'
          }} />
        </div>

        {/* Quick Metrics */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 'var(--space-8)',
          borderTop: 'var(--border-hairline)',
          paddingTop: 'var(--space-4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={18} color="var(--correct)" />
            <span style={{ fontSize: '14px', fontWeight: 600 }}>{correctCount} Correct</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <XCircle size={18} color="var(--wrong)" />
            <span style={{ fontSize: '14px', fontWeight: 600 }}>{wrongCount} Incorrect</span>
          </div>
        </div>
      </div>

      {/* Action Navigation */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-6)'
      }}>
        {/* Filter Tabs */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--surface)',
          border: 'var(--border-hairline)',
          borderRadius: 'var(--radius-sm)',
          padding: '2px'
        }}>
          {['all', 'correct', 'wrong'].map(tabKey => (
            <button
              key={tabKey}
              onClick={() => setFilter(tabKey)}
              style={{
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: filter === tabKey ? 'var(--accent)' : 'transparent',
                color: filter === tabKey ? '#FFFFFF' : 'var(--muted-text)',
                textTransform: 'capitalize'
              }}
            >
              {tabKey} ({tabKey === 'all' ? review.length : tabKey === 'correct' ? correctCount : wrongCount})
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button onClick={() => navigate('/')} className="btn">
            <ArrowLeft size={16} />
            <span>Back to dashboard</span>
          </button>
          <button onClick={() => navigate('/')} className="btn btn-primary">
            <RotateCcw size={16} />
            <span>Take another test</span>
          </button>
        </div>
      </div>

      {/* Review Questions List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {filteredReview.map((q, idx) => {
          const isAnswered = q.selectedIndex !== null && q.selectedIndex !== undefined;
          let statusText = 'Not answered';
          let badgeClass = 'badge';

          if (isAnswered) {
            if (q.isCorrect) {
              statusText = 'Correct';
              badgeClass = 'badge badge-correct';
            } else {
              statusText = 'Wrong';
              badgeClass = 'badge badge-wrong';
            }
          }

          const originalIndex = review.findIndex(orig => orig.questionId === q.questionId);

          return (
            <div key={q.questionId} className="card" style={{ padding: 'var(--space-6)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted-text)' }}>
                  Question {originalIndex !== -1 ? originalIndex + 1 : idx + 1}
                </span>
                <span className={badgeClass}>
                  {statusText}
                </span>
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
                {q.text}
              </h3>

              {/* Options breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                {q.options.map((optText, optIdx) => {
                  const letter = String.fromCharCode(65 + optIdx);
                  const isUserSelection = isAnswered && q.selectedIndex === optIdx;
                  const isCorrectAnswer = q.correctIndex === optIdx;

                  let borderStyle = 'var(--border-hairline)';
                  let bgStyle = 'var(--surface)';
                  let icon = null;

                  if (isCorrectAnswer) {
                    borderStyle = '1px solid var(--correct)';
                    bgStyle = 'var(--correct-bg)';
                    icon = <CheckCircle2 size={16} color="var(--correct)" />;
                  } else if (isUserSelection && !q.isCorrect) {
                    borderStyle = '1px solid var(--wrong)';
                    bgStyle = 'var(--wrong-bg)';
                    icon = <XCircle size={16} color="var(--wrong)" />;
                  }

                  return (
                    <div
                      key={optIdx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        border: borderStyle,
                        backgroundColor: bgStyle,
                        fontSize: '14px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <span style={{ fontWeight: 600, width: '20px' }}>{letter}.</span>
                        <span>{optText}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                        {isUserSelection && (
                          <span style={{ color: isCorrectAnswer ? 'var(--correct)' : 'var(--wrong)', fontWeight: 600 }}>
                            Your answer
                          </span>
                        )}
                        {isCorrectAnswer && (
                          <span style={{ color: 'var(--correct)', fontWeight: 600 }}>
                            Correct answer
                          </span>
                        )}
                        {icon}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Explanation Note */}
              {q.explanation && (
                <div style={{
                  padding: 'var(--space-3)',
                  backgroundColor: 'var(--paper)',
                  border: 'var(--border-hairline)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  color: 'var(--muted-text)',
                  lineHeight: 1.4
                }}>
                  <strong style={{ color: 'var(--ink)' }}>Explanation:</strong> {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
