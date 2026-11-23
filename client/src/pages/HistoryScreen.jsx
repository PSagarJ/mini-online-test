import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { History, Eye, Clock, Award } from 'lucide-react';

const END_REASON_LABELS = {
  manual: 'Submitted by you',
  time_up: 'Time ran out (time_up)',
  tab_switch: 'Tab switches (6) (tab_switch)',
  window_switch: 'Window switches (6) (window_switch)',
  reload_or_close: 'Reloads or closing (6) (reload_or_close)',
  navigation: 'Back navigation (6) (navigation)',
  deadline_passed: 'Time passed while away (deadline_passed)'
};

export const HistoryScreen = () => {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        const data = await api.get('/attempts');
        setAttempts(data.attempts || []);
      } catch (err) {
        setError(err.message || 'Failed to load assessment history.');
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: 'var(--space-12) 0', textAlign: 'center' }}>
        <p style={{ color: 'var(--muted-text)' }}>Loading assessment history...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: 'var(--space-8) 0' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 className="serif-title" style={{ fontSize: '28px', marginBottom: 'var(--space-1)' }}>
          Assessment History
        </h1>
        <p style={{ color: 'var(--muted-text)', fontSize: '14px' }}>
          Record of all your completed and evaluated attempts
        </p>
      </div>

      {error && (
        <div style={{
          padding: 'var(--space-3)',
          backgroundColor: 'var(--wrong-bg)',
          color: 'var(--wrong)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: 'var(--space-4)',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {attempts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)' }}>
          <History size={36} color="var(--muted-text)" style={{ marginBottom: 'var(--space-3)' }} />
          <h3 className="serif-title" style={{ fontSize: '18px', marginBottom: 'var(--space-2)' }}>
            No past attempts recorded
          </h3>
          <p style={{ color: 'var(--muted-text)', fontSize: '14px', maxWidth: '400px', margin: '0 auto var(--space-4)' }}>
            You haven't completed any assessments yet. Choose a question bank from your dashboard to begin.
          </p>
          <Link to="/" className="btn btn-primary">Go to Dashboard</Link>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="desktop-table-container card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--paper)', borderBottom: 'var(--border-hairline)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-text)', fontSize: '12px', textTransform: 'uppercase' }}>Date</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-text)', fontSize: '12px', textTransform: 'uppercase' }}>Bank</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-text)', fontSize: '12px', textTransform: 'uppercase' }}>Score</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-text)', fontSize: '12px', textTransform: 'uppercase' }}>Percentage</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-text)', fontSize: '12px', textTransform: 'uppercase' }}>Time Taken</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-text)', fontSize: '12px', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-text)', fontSize: '12px', textTransform: 'uppercase' }}>Ended By</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--muted-text)', fontSize: '12px', textTransform: 'uppercase' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map(att => {
                  const endLabel = END_REASON_LABELS[att.endReason] || att.endReason || '—';
                  const isSuccess = att.percentage >= 60;

                  return (
                    <tr key={att.id} style={{ borderBottom: 'var(--border-hairline)' }}>
                      <td style={{ padding: '12px 16px' }} className="tabular-nums">
                        {formatDate(att.startedAt)}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                        {att.bankName}
                      </td>
                      <td style={{ padding: '12px 16px' }} className="tabular-nums">
                        {att.score} / {att.total}
                      </td>
                      <td style={{ padding: '12px 16px' }} className="tabular-nums">
                        <span className={isSuccess ? 'badge badge-correct' : 'badge badge-wrong'}>
                          {att.percentage}%
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }} className="tabular-nums">
                        {formatDuration(att.durationSeconds)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className="badge" style={{ textTransform: 'capitalize' }}>
                          {att.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--muted-text)' }}>
                        {endLabel}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <Link
                          to={att.status === 'in_progress' ? `/test/${att.id}` : `/results/${att.id}`}
                          className="btn"
                          style={{ padding: '6px 12px', minHeight: '32px', fontSize: '13px' }}
                        >
                          <Eye size={14} />
                          <span>View</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards */}
          <div className="mobile-cards-container" style={{ display: 'none', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {attempts.map(att => {
              const endLabel = END_REASON_LABELS[att.endReason] || att.endReason || '—';

              return (
                <div key={att.id} className="card" style={{ padding: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '16px' }}>{att.bankName}</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted-text)' }} className="tabular-nums">
                        {formatDate(att.startedAt)}
                      </div>
                    </div>
                    <span className={att.percentage >= 60 ? 'badge badge-correct' : 'badge badge-wrong'}>
                      {att.percentage}%
                    </span>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '8px',
                    margin: 'var(--space-3) 0',
                    fontSize: '13px'
                  }}>
                    <div>
                      <span style={{ color: 'var(--muted-text)' }}>Score: </span>
                      <strong className="tabular-nums">{att.score} / {att.total}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--muted-text)' }}>Time: </span>
                      <strong className="tabular-nums">{formatDuration(att.durationSeconds)}</strong>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ color: 'var(--muted-text)' }}>Ended by: </span>
                      <span>{endLabel}</span>
                    </div>
                  </div>

                  <Link
                    to={att.status === 'in_progress' ? `/test/${att.id}` : `/results/${att.id}`}
                    className="btn btn-primary"
                    style={{ width: '100%', minHeight: '36px', fontSize: '13px' }}
                  >
                    <Eye size={14} />
                    <span>View Result</span>
                  </Link>
                </div>
              );
            })}
          </div>
        </>
      )}

      <style>{`
        @media (max-width: 640px) {
          .desktop-table-container {
            display: none !important;
          }
          .mobile-cards-container {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
};
