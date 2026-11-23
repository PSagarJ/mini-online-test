import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AdminNav } from '../../components/AdminNav';
import { BarChart3, Filter } from 'lucide-react';

const END_REASON_LABELS = {
  manual: 'Submitted by student',
  time_up: 'Time ran out (time_up)',
  tab_switch: 'Tab switches (6) (tab_switch)',
  window_switch: 'Window switches (6) (window_switch)',
  reload_or_close: 'Reloads or closing (6) (reload_or_close)',
  navigation: 'Back navigation (6) (navigation)',
  deadline_passed: 'Time passed while away (deadline_passed)'
};

export const AdminResults = () => {
  const [results, setResults] = useState([]);
  const [classes, setClasses] = useState([]);
  const [banks, setBanks] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedBankId, setSelectedBankId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Initial filter options loading
  useEffect(() => {
    async function loadFilterOptions() {
      try {
        const [classesData, banksData] = await Promise.all([
          api.get('/classes'),
          api.get('/admin/banks')
        ]);
        setClasses(classesData.classes || []);
        setBanks(banksData.banks || []);
      } catch (err) {
        console.error('Error loading filter options:', err);
      }
    }
    loadFilterOptions();
  }, []);

  // Results loading
  const loadResults = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (selectedClassId) params.append('classId', selectedClassId);
      if (selectedBankId) params.append('bankId', selectedBankId);

      const data = await api.get(`/admin/results?${params.toString()}`);
      setResults(data.rows || []);
    } catch (err) {
      setError(err.message || 'Failed to load assessment results.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResults();
  }, [selectedClassId, selectedBankId]);

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

  return (
    <div className="container-wide" style={{ padding: 'var(--space-8) var(--space-4)' }}>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h1 className="serif-title" style={{ fontSize: '28px', marginBottom: 'var(--space-1)' }}>
          Administration
        </h1>
        <p style={{ color: 'var(--muted-text)', fontSize: '14px' }}>
          Real-time analytics and grade reports across all student assessment attempts
        </p>
      </div>

      <AdminNav />

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

      {/* Filters Bar */}
      <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', alignItems: 'center' }}>
          <div style={{ minWidth: '180px' }}>
            <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>
              Filter by Class
            </label>
            <select
              className="form-select"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
            >
              <option value="">All Classes</option>
              {classes.map(c => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ minWidth: '220px' }}>
            <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>
              Filter by Question Bank
            </label>
            <select
              className="form-select"
              value={selectedBankId}
              onChange={(e) => setSelectedBankId(e.target.value)}
            >
              <option value="">All Question Banks</option>
              {banks.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--paper)', borderBottom: 'var(--border-hairline)' }}>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-text)', fontSize: '12px', textTransform: 'uppercase' }}>Student</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-text)', fontSize: '12px', textTransform: 'uppercase' }}>Email</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-text)', fontSize: '12px', textTransform: 'uppercase' }}>Class</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-text)', fontSize: '12px', textTransform: 'uppercase' }}>Bank</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-text)', fontSize: '12px', textTransform: 'uppercase' }}>Score</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-text)', fontSize: '12px', textTransform: 'uppercase' }}>%</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-text)', fontSize: '12px', textTransform: 'uppercase' }}>Submitted At</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-text)', fontSize: '12px', textTransform: 'uppercase' }}>Ended By</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--muted-text)' }}>
                  Loading assessment records...
                </td>
              </tr>
            ) : results.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--muted-text)' }}>
                  No assessment results found matching current criteria.
                </td>
              </tr>
            ) : (
              results.map(row => {
                const isSuccess = row.percentage >= 60;
                const endLabel = END_REASON_LABELS[row.endReason] || row.endReason || '—';

                return (
                  <tr key={row.id || row._id} style={{ borderBottom: 'var(--border-hairline)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                      {row.studentName}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--muted-text)' }}>
                      {row.email}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className="badge">{row.class}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {row.bank}
                    </td>
                    <td style={{ padding: '12px 16px' }} className="tabular-nums">
                      {row.score} / {row.total}
                    </td>
                    <td style={{ padding: '12px 16px' }} className="tabular-nums">
                      <span className={isSuccess ? 'badge badge-correct' : 'badge badge-wrong'}>
                        {row.percentage}%
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }} className="tabular-nums">
                      {formatDate(row.submittedAt)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--muted-text)' }}>
                      {endLabel}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
