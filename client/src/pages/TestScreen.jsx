import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Clock, AlertTriangle, ChevronLeft, ChevronRight, CheckCircle2, ShieldAlert } from 'lucide-react';

export const TestScreen = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [attempt, setAttempt] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [questionId]: selectedIndex }
  const [timeLeft, setTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [ariaLiveMessage, setAriaLiveMessage] = useState('');
  const [announced60, setAnnounced60] = useState(false);
  const [announced30, setAnnounced30] = useState(false);

  // Violations & Tab Switch State
  const [violationCount, setViolationCount] = useState(0);
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [currentWarningNumber, setCurrentWarningNumber] = useState(0);
  const [lastViolationAction, setLastViolationAction] = useState('Switching tabs');
  const isFinishedRef = useRef(false);
  const serverOffsetRef = useRef(0);
  const lastTabSwitchTimeRef = useRef(0);
  const reloadCountedRef = useRef(false);
  const answersRef = useRef(answers);

  // Keep answersRef synced for beforeunload beacon
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // Submit test handler
  const handleSubmitTest = useCallback(async (forcedAnswers = null) => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    setSubmitting(true);

    const answersToSend = forcedAnswers || answersRef.current;
    const formattedAnswers = Object.entries(answersToSend).map(([questionId, selectedIndex]) => ({
      questionId,
      selectedIndex
    }));

    try {
      const data = await api.post(`/attempts/${attemptId}/submit`, { answers: formattedAnswers });
      localStorage.removeItem(`test_answers_${attemptId}`);
      navigate(`/results/${attemptId}`, { replace: true });
    } catch (err) {
      console.error('Submission error:', err);
      // Navigate to results anyway as the server likely finalized it
      navigate(`/results/${attemptId}`, { replace: true });
    }
  }, [attemptId, navigate]);

  // Record anti-cheat violation
  const recordViolation = useCallback(async (type) => {
    if (isFinishedRef.current || isAdmin) return;

    const actionMap = {
      tab_switch: 'Switching tabs',
      window_switch: 'Switching windows',
      reload_or_close: 'Reloading or closing',
      navigation: 'Navigating away'
    };
    setLastViolationAction(actionMap[type] || 'Switching tabs');

    try {
      const res = await api.post(`/attempts/${attemptId}/violations`, { type });
      setViolationCount(res.violationCount);

      if (res.finalized) {
        isFinishedRef.current = true;
        navigate(`/results/${attemptId}`, { replace: true });
        return;
      }

      if (res.violationCount >= 1 && res.violationCount <= 5) {
        setCurrentWarningNumber(res.violationCount);
        setWarningModalOpen(true);
      }
    } catch (e) {
      console.error('Failed to report violation:', e);
    }
  }, [attemptId, isAdmin, navigate]);

  // Load Attempt Data
  useEffect(() => {
    async function loadAttempt() {
      try {
        setLoading(true);
        const data = await api.get(`/attempts/${attemptId}`);
        const loadedAttempt = data.attempt;

        // If attempt is already completed, go to result page
        if (loadedAttempt.status !== 'in_progress') {
          isFinishedRef.current = true;
          navigate(`/results/${attemptId}`, { replace: true });
          return;
        }

        setAttempt(loadedAttempt);
        setViolationCount(loadedAttempt.violationCount || 0);

        // Server time sync
        const serverTimeMs = new Date(loadedAttempt.serverTime || Date.now()).getTime();
        serverOffsetRef.current = serverTimeMs - Date.now();

        // Calculate initial time left
        const deadlineMs = new Date(loadedAttempt.deadline).getTime();
        const initialRemaining = Math.max(0, Math.floor((deadlineMs - serverTimeMs) / 1000));
        setTimeLeft(initialRemaining);

        // Answers reconciliation: Server answers win on load
        const initialAnswers = {};
        if (Array.isArray(loadedAttempt.answers)) {
          loadedAttempt.answers.forEach(ans => {
            if (ans && ans.questionId && ans.selectedIndex !== null && ans.selectedIndex !== undefined) {
              initialAnswers[ans.questionId] = ans.selectedIndex;
            }
          });
        }

        // Check local storage for any unsaved client answers
        const cached = localStorage.getItem(`test_answers_${attemptId}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            Object.entries(parsed).forEach(([qId, sIdx]) => {
              if (initialAnswers[qId] === undefined) {
                initialAnswers[qId] = sIdx;
              }
            });
          } catch (e) {}
        }

        setAnswers(initialAnswers);
        answersRef.current = initialAnswers;
      } catch (err) {
        console.error('Failed to load assessment:', err);
        navigate('/');
      } finally {
        setLoading(false);
      }
    }

    loadAttempt();
  }, [attemptId, navigate]);

  // Timer Tick
  useEffect(() => {
    if (loading || !attempt || isFinishedRef.current) return;

    const interval = setInterval(() => {
      const nowSynced = Date.now() + serverOffsetRef.current;
      const deadlineMs = new Date(attempt.deadline).getTime();
      const remaining = Math.max(0, Math.floor((deadlineMs - nowSynced) / 1000));

      setTimeLeft(remaining);

      // Aria-live warnings
      if (remaining <= 60 && remaining > 30 && !announced60) {
        setAriaLiveMessage('Warning: One minute remaining.');
        setAnnounced60(true);
      } else if (remaining <= 30 && remaining > 0 && !announced30) {
        setAriaLiveMessage('Warning: Thirty seconds remaining.');
        setAnnounced30(true);
      }

      // Auto-submit at zero
      if (remaining <= 0) {
        clearInterval(interval);
        handleSubmitTest();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [loading, attempt, announced60, announced30, handleSubmitTest]);

  // Debounced Auto-Save to Server
  const saveTimeoutRef = useRef(null);
  const handleSelectOption = (questionId, optionIndex) => {
    if (isFinishedRef.current) return;

    const updated = {
      ...answers,
      [questionId]: optionIndex
    };
    setAnswers(updated);
    answersRef.current = updated;

    // Cache locally immediately
    localStorage.setItem(`test_answers_${attemptId}`, JSON.stringify(updated));

    // Debounce server PUT (500ms)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const formatted = Object.entries(updated).map(([qId, sIdx]) => ({
          questionId: qId,
          selectedIndex: sIdx
        }));
        await api.put(`/attempts/${attemptId}/answers`, { answers: formatted });
      } catch (e) {
        console.error('Autosave error:', e);
      }
    }, 500);
  };

  // Keyboard navigation: 1-4 for options, Left/Right arrows for questions
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isFinishedRef.current || showSubmitModal || warningModalOpen) return;

      const currentQ = attempt?.questions?.[currentIndex];
      if (!currentQ) return;

      if (['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        const optionIndex = parseInt(e.key, 10) - 1;
        handleSelectOption(currentQ.id, optionIndex);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentIndex > 0) {
          setCurrentIndex(prev => prev - 1);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentIndex < (attempt?.questions?.length || 10) - 1) {
          setCurrentIndex(prev => prev + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, attempt, answers, showSubmitModal, warningModalOpen]);

  // Anti-Cheat Event Listeners (tab_switch, window_switch, reload_or_close, navigation)
  useEffect(() => {
    if (loading || isFinishedRef.current || isAdmin) return;

    // 1. Tab switch: visibilitychange
    const handleVisibilityChange = () => {
      if (document.hidden) {
        lastTabSwitchTimeRef.current = Date.now();
        recordViolation('tab_switch');
      }
    };

    // 2. Window switch: blur (ignore if within 1 second of tab_switch)
    const handleWindowBlur = () => {
      const now = Date.now();
      if (now - lastTabSwitchTimeRef.current < 1000) {
        return; // Ignore window_switch right after tab_switch
      }
      recordViolation('window_switch');
    };

    // 3. Navigation: Back/Forward guard via history pushState
    window.history.pushState({ testGuard: true }, '');
    const handlePopState = (e) => {
      if (isFinishedRef.current) return;
      recordViolation('navigation');
      window.history.pushState({ testGuard: true }, '');
    };

    // 4. Reload or close tab: beforeunload
    const handleBeforeUnload = () => {
      if (isFinishedRef.current || reloadCountedRef.current) return;
      reloadCountedRef.current = true;

      // Send keepalive beacon
      const token = localStorage.getItem('token');
      const payload = JSON.stringify({ type: 'reload_or_close' });
      const url = `${api.getBaseUrl()}/api/attempts/${attemptId}/violations`;

      try {
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: payload,
          keepalive: true
        });
      } catch (e) {}
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [loading, attemptId, isAdmin, recordViolation]);

  if (loading || !attempt) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--muted-text)' }}>Preparing assessment questions...</p>
      </div>
    );
  }

  const questions = attempt.questions || [];
  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;

  // Format timer MM:SS
  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isTimerAmber = timeLeft !== null && timeLeft <= 60 && timeLeft > 30;
  const isTimerRed = timeLeft !== null && timeLeft <= 30;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--paper)',
      color: 'var(--ink)'
    }}>
      {/* Hidden ARIA Live Region for Screen Readers */}
      <div
        role="status"
        aria-live="assertive"
        aria-atomic="true"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0
        }}
      >
        {ariaLiveMessage}
      </div>

      {/* Focused Assessment Header (Nav Hidden) */}
      <header style={{
        backgroundColor: 'var(--surface)',
        borderBottom: 'var(--border-hairline)',
        padding: 'var(--space-3) var(--space-4)',
        position: 'sticky',
        top: 0,
        zIndex: 40
      }}>
        <div className="container" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-4)'
        }}>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--muted-text)', fontWeight: 500 }}>
              {attempt.bankName}
            </div>
            <div style={{ fontWeight: 600, fontSize: '15px' }}>
              Question {currentIndex + 1} of {questions.length}
            </div>
          </div>

          {/* Progress Indicator */}
          <div style={{ flex: 1, maxWidth: '240px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted-text)' }}>
              <span>Progress</span>
              <span>{answeredCount} / {questions.length} answered</span>
            </div>
            <div style={{ height: '6px', backgroundColor: 'var(--hairline)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${(answeredCount / questions.length) * 100}%`,
                backgroundColor: 'var(--accent)',
                transition: 'width var(--transition-speed) var(--transition-ease)'
              }} />
            </div>
          </div>

          {/* Timer Display */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            border: isTimerRed
              ? '1px solid var(--wrong)'
              : isTimerAmber
              ? '1px solid var(--warning)'
              : 'var(--border-hairline)',
            backgroundColor: isTimerRed
              ? 'var(--wrong-bg)'
              : isTimerAmber
              ? 'var(--warning-bg)'
              : 'var(--surface)',
            color: isTimerRed
              ? 'var(--wrong)'
              : isTimerAmber
              ? 'var(--warning)'
              : 'var(--ink)'
          }}>
            <Clock size={16} />
            <span className="tabular-nums" style={{ fontWeight: 700, fontSize: '15px' }}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>
      </header>

      {/* Assessment Body */}
      <main style={{ flex: 1, padding: 'var(--space-8) var(--space-4)' }}>
        <div className="container">
          {currentQ && (
            <div className="card" style={{ padding: 'var(--space-8)', marginBottom: 'var(--space-6)' }}>
              <div style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--accent)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 'var(--space-2)'
              }}>
                Question {currentIndex + 1}
              </div>

              <h2 style={{
                fontSize: '18px',
                fontWeight: 600,
                lineHeight: 1.4,
                marginBottom: 'var(--space-6)',
                color: 'var(--ink)'
              }}>
                {currentQ.text}
              </h2>

              {/* Options Radio Group */}
              <div
                role="radiogroup"
                aria-label={`Question ${currentIndex + 1} options`}
                style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
              >
                {currentQ.options.map((option, optIdx) => {
                  const letter = String.fromCharCode(65 + optIdx);
                  const isSelected = answers[currentQ.id] === optIdx;

                  return (
                    <div
                      key={optIdx}
                      role="radio"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onClick={() => handleSelectOption(currentQ.id, optIdx)}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          handleSelectOption(currentQ.id, optIdx);
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-4)',
                        padding: 'var(--space-4)',
                        borderRadius: 'var(--radius-sm)',
                        border: isSelected ? '2px solid var(--accent)' : 'var(--border-hairline)',
                        backgroundColor: isSelected ? 'var(--accent-light)' : 'var(--surface)',
                        cursor: 'pointer',
                        transition: 'background-color var(--transition-speed) var(--transition-ease), border-color var(--transition-speed) var(--transition-ease)'
                      }}
                    >
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        border: isSelected ? '2px solid var(--accent)' : '1px solid var(--hairline)',
                        backgroundColor: isSelected ? 'var(--accent)' : 'transparent',
                        color: isSelected ? '#FFFFFF' : 'var(--muted-text)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600,
                        fontSize: '13px',
                        flexShrink: 0
                      }}>
                        {letter}
                      </div>
                      <div style={{ fontSize: '15px', color: 'var(--ink)' }}>
                        {option}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: 'var(--space-4)', fontSize: '12px', color: 'var(--muted-text)' }}>
                Tip: Press keys 1–4 to select options. Use Left/Right arrows to navigate.
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Assessment Footer Controls & 1-10 Grid */}
      <footer style={{
        backgroundColor: 'var(--surface)',
        borderTop: 'var(--border-hairline)',
        padding: 'var(--space-4)',
        position: 'sticky',
        bottom: 0,
        zIndex: 30
      }}>
        <div className="container" style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-4)'
        }}>
          <button
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            className="btn"
            disabled={currentIndex === 0}
          >
            <ChevronLeft size={16} />
            <span>Previous</span>
          </button>

          {/* 1 to 10 Grid */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            overflowX: 'auto',
            padding: '4px 0'
          }}>
            {questions.map((q, idx) => {
              const isAnswered = answers[q.id] !== undefined && answers[q.id] !== null;
              const isCurrent = idx === currentIndex;
              const selectedLetter = isAnswered ? String.fromCharCode(65 + answers[q.id]) : '';

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Jump to Question ${idx + 1}: ${isAnswered ? `Answered ${selectedLetter}` : 'Unanswered'}`}
                  style={{
                    minWidth: '36px',
                    height: '36px',
                    padding: '0 4px',
                    borderRadius: 'var(--radius-sm)',
                    border: isCurrent
                      ? '2px solid var(--accent)'
                      : isAnswered
                      ? '1px solid var(--accent)'
                      : 'var(--border-hairline)',
                    backgroundColor: isCurrent
                      ? 'var(--accent-light)'
                      : isAnswered
                      ? 'var(--correct-bg)'
                      : 'var(--surface)',
                    color: isCurrent
                      ? 'var(--accent)'
                      : isAnswered
                      ? 'var(--correct)'
                      : 'var(--muted-text)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 600,
                    lineHeight: 1
                  }}
                >
                  <span>{idx + 1}</span>
                  <span style={{ fontSize: '9px', marginTop: '2px', opacity: 0.85 }}>
                    {isAnswered ? selectedLetter : '·'}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <button
              onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
              className="btn"
              disabled={currentIndex === questions.length - 1}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>

            <button
              onClick={() => setShowSubmitModal(true)}
              className="btn btn-primary"
              disabled={submitting}
            >
              <CheckCircle2 size={16} />
              <span>Submit test</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Persistent Red Warning Pill in Bottom-Right Corner */}
      {violationCount >= 1 && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          right: '20px',
          backgroundColor: 'var(--wrong)',
          color: '#FFFFFF',
          padding: '6px 14px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 700,
          boxShadow: 'var(--shadow-overlay)',
          zIndex: 60,
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <ShieldAlert size={14} />
          <span>Warnings {Math.min(5, violationCount)} of 5</span>
        </div>
      )}

      {/* Violation Warning Modal */}
      {warningModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card" role="alertdialog" aria-modal="true">
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: 'var(--wrong-bg)',
              color: 'var(--wrong)',
              marginBottom: 'var(--space-3)'
            }}>
              <AlertTriangle size={24} />
            </div>

            <h3 className="serif-title" style={{ fontSize: '20px', marginBottom: 'var(--space-2)', color: 'var(--wrong)' }}>
              {currentWarningNumber === 5 ? 'Final Warning' : `Warning ${currentWarningNumber} of 5`}
            </h3>

            <p style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.5, marginBottom: 'var(--space-6)' }}>
              {currentWarningNumber === 5
                ? 'Final warning. The next violation submits your test now.'
                : `Warning ${currentWarningNumber} of 5. ${lastViolationAction} is recorded. At 6 warnings your test is submitted automatically.`}
            </p>

            <button
              onClick={() => setWarningModalOpen(false)}
              className="btn btn-primary"
              style={{ width: '100%' }}
              autoFocus
            >
              Return to test
            </button>
          </div>
        </div>
      )}

      {/* Submit Confirmation Dialog */}
      {showSubmitModal && (
        <div className="modal-backdrop">
          <div className="modal-card" role="dialog" aria-modal="true">
            <h3 className="serif-title" style={{ fontSize: '20px', marginBottom: 'var(--space-2)' }}>
              Submit assessment?
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--muted-text)', lineHeight: 1.5, marginBottom: 'var(--space-4)' }}>
              {unansweredCount > 0 ? (
                <>
                  You have <strong style={{ color: 'var(--wrong)' }}>{unansweredCount} unanswered</strong>{' '}
                  {unansweredCount === 1 ? 'question' : 'questions'}. Are you sure you want to finalize and submit?
                </>
              ) : (
                'You have answered all 10 questions. Would you like to finalize and submit your test now?'
              )}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setShowSubmitModal(false)}
                disabled={submitting}
              >
                Continue test
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setShowSubmitModal(false);
                  handleSubmitTest();
                }}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Yes, submit test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
