import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { BookOpen, Clock, Award, Play, AlertCircle, ArrowRight } from 'lucide-react';

export const Dashboard = () => {
  const { user, updateUserClass } = useAuth();
  const navigate = useNavigate();

  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [banks, setBanks] = useState([]);
  const [activeAttempt, setActiveAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startingBankId, setStartingBankId] = useState(null);
  const [savingClass, setSavingClass] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      setError('');
      try {
        // If user has no class, fetch classes list for selection
        if (!user?.classId) {
          const classData = await api.get('/classes');
          setClasses(classData.classes || []);
        } else {
          // Check for active attempt first
          try {
            const activeData = await api.get('/attempts/active');
            if (activeData && activeData.attempt) {
              setActiveAttempt(activeData.attempt);
            }
          } catch (e) {
            console.error('Error checking active attempt:', e);
          }

          // Fetch banks for student's class
          const bankData = await api.get('/banks');
          setBanks(bankData.banks || []);
        }
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [user?.classId]);

  const handleSaveClass = async (e) => {
    e.preventDefault();
    if (!selectedClassId) return;

    try {
      setSavingClass(true);
      setError('');
      await updateUserClass(selectedClassId);
    } catch (err) {
      setError(err.message || 'Failed to save class.');
    } finally {
      setSavingClass(false);
    }
  };

  const handleStartTest = async (bankId) => {
    try {
      setStartingBankId(bankId);
      setError('');
      const data = await api.post('/attempts', { bankId });
      navigate(`/test/${data.attempt.id}`);
    } catch (err) {
      setError(err.message || 'Could not start test.');
      setStartingBankId(null);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: 'var(--space-12) 0', textAlign: 'center' }}>
        <p style={{ color: 'var(--muted-text)' }}>Loading dashboard...</p>
      </div>
    );
  }

  // 1. User has no class: "Choose your class" card
  if (!user?.classId) {
    return (
      <div className="container" style={{ padding: 'var(--space-8) 0' }}>
        <div className="card" style={{ maxWidth: '540px', margin: '0 auto', textAlign: 'center', padding: 'var(--space-8)' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'var(--warning-bg)',
            marginBottom: 'var(--space-4)'
          }}>
            <AlertCircle size={28} color="var(--warning)" />
          </div>
          <h2 className="serif-title" style={{ fontSize: '24px', marginBottom: 'var(--space-2)' }}>
            Choose your class
          </h2>
          <p style={{ color: 'var(--muted-text)', fontSize: '14px', marginBottom: 'var(--space-6)' }}>
            To view available assessments, please select your school class. Once chosen, this will filter tests suited to your grade.
          </p>

          {error && (
            <div style={{
              padding: 'var(--space-3)',
              backgroundColor: 'var(--wrong-bg)',
              color: 'var(--wrong)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 'var(--space-4)',
              fontSize: '13px'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSaveClass}>
            <div className="form-group" style={{ textAlign: 'left' }}>
              <label className="form-label" htmlFor="select-class">
                Class Grade
              </label>
              <select
                id="select-class"
                className="form-select"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                required
              >
                <option value="">Select your class...</option>
                {classes.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 'var(--space-2)' }}
              disabled={!selectedClassId || savingClass}
            >
              {savingClass ? 'Saving class...' : 'Save and continue'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: 'var(--space-8) 0' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 className="serif-title" style={{ fontSize: '28px', marginBottom: 'var(--space-1)' }}>
          Assessments
        </h1>
        <p style={{ color: 'var(--muted-text)', fontSize: '14px' }}>
          Enrolled in <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{user.className}</span>. Complete tests within the allocated time.
        </p>
      </div>

      {error && (
        <div style={{
          padding: 'var(--space-3)',
          backgroundColor: 'var(--wrong-bg)',
          color: 'var(--wrong)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: 'var(--space-6)',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {/* In-progress banner if active test exists */}
      {activeAttempt && (
        <div className="card" style={{
          backgroundColor: 'var(--warning-bg)',
          borderColor: '#E2C29B',
          marginBottom: 'var(--space-6)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-4)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--warning)', fontWeight: 600, marginBottom: '4px' }}>
              <Clock size={18} />
              <span>Assessment in progress</span>
            </div>
            <div style={{ fontWeight: 600, fontSize: '16px' }}>{activeAttempt.bankName}</div>
            <div style={{ fontSize: '13px', color: 'var(--muted-text)' }}>
              You have an active test underway. Your timer continues to run.
            </div>
          </div>
          <button
            onClick={() => navigate(`/test/${activeAttempt.id}`)}
            className="btn btn-primary"
            style={{ backgroundColor: 'var(--warning)', borderColor: 'var(--warning)' }}
          >
            <span>Resume test</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Question Banks List */}
      {banks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)' }}>
          <BookOpen size={36} color="var(--muted-text)" style={{ marginBottom: 'var(--space-3)' }} />
          <h3 className="serif-title" style={{ fontSize: '18px', marginBottom: 'var(--space-2)' }}>
            No question banks available
          </h3>
          <p style={{ color: 'var(--muted-text)', fontSize: '14px', maxWidth: '420px', margin: '0 auto' }}>
            There are currently no active question banks published for {user.className}. Please check back later or contact your instructor.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 'var(--space-4)'
        }}>
          {banks.map(bank => {
            const hasEnoughQuestions = bank.questionCount >= 10;
            const isStarting = startingBankId === bank.id;

            return (
              <div key={bank.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                    <span className="badge">
                      {user.className}
                    </span>
                    {bank.bestScore !== null && (
                      <span className="badge badge-correct" title="Your highest historical score">
                        <Award size={12} style={{ marginRight: '4px' }} />
                        Best: {bank.bestScore} / 10 ({bank.bestPercentage}%)
                      </span>
                    )}
                  </div>
                  <h3 className="serif-title" style={{ fontSize: '20px', marginBottom: 'var(--space-2)' }}>
                    {bank.subject}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', fontSize: '13px', color: 'var(--muted-text)', marginBottom: 'var(--space-6)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <BookOpen size={15} />
                      10 questions
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={15} />
                      10 minutes
                    </span>
                  </div>
                </div>

                <div>
                  {hasEnoughQuestions ? (
                    <button
                      onClick={() => handleStartTest(bank.id)}
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                      disabled={isStarting}
                    >
                      <Play size={16} />
                      <span>{isStarting ? 'Preparing test...' : 'Start test'}</span>
                    </button>
                  ) : (
                    <button
                      className="btn"
                      style={{ width: '100%', opacity: 0.6 }}
                      disabled
                      title="Requires at least 10 active questions"
                    >
                      <span>Unavailable ({bank.questionCount}/10 Qs)</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
