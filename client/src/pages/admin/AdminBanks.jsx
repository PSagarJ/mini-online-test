import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { AdminNav } from '../../components/AdminNav';
import { BookOpen, Plus, Archive, RotateCcw, ArrowRight } from 'lucide-react';

export const AdminBanks = () => {
  const navigate = useNavigate();
  const [banks, setBanks] = useState([]);
  const [classes, setClasses] = useState([]);
  const [classFilter, setClassFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create Bank Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createClassId, setCreateClassId] = useState('');
  const [createSubject, setCreateSubject] = useState('');
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (classFilter) params.append('classId', classFilter);

      const [banksData, classesData] = await Promise.all([
        api.get(`/admin/banks?${params.toString()}`),
        api.get('/classes')
      ]);

      setBanks(banksData.banks || []);
      setClasses(classesData.classes || []);
    } catch (err) {
      setError(err.message || 'Failed to load question banks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [classFilter]);

  const handleCreateBank = async (e) => {
    e.preventDefault();
    if (!createClassId || !createSubject.trim()) return;

    try {
      setCreating(true);
      setError('');
      setSuccess('');
      await api.post('/admin/banks', {
        classId: createClassId,
        subject: createSubject.trim()
      });
      setSuccess('Question bank created.');
      setShowCreateModal(false);
      setCreateSubject('');
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to create question bank.');
    } finally {
      setCreating(false);
    }
  };

  const toggleArchiveBank = async (bankId, currentArchived) => {
    try {
      setError('');
      setSuccess('');
      await api.patch(`/admin/banks/${bankId}`, { archived: !currentArchived });
      setSuccess(currentArchived ? 'Bank restored.' : 'Bank archived.');
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to update bank archive status.');
    }
  };

  return (
    <div className="container-wide" style={{ padding: 'var(--space-8) var(--space-4)' }}>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h1 className="serif-title" style={{ fontSize: '28px', marginBottom: 'var(--space-1)' }}>
          Administration
        </h1>
        <p style={{ color: 'var(--muted-text)', fontSize: '14px' }}>
          Question banks catalogue, subjects, and test inventories
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

      {success && (
        <div style={{
          padding: 'var(--space-3)',
          backgroundColor: 'var(--correct-bg)',
          color: 'var(--correct)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: 'var(--space-4)',
          fontSize: '14px'
        }}>
          {success}
        </div>
      )}

      {/* Action / Filter Header */}
      <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div style={{ minWidth: '200px' }}>
            <select
              className="form-select"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              <option value="">All Classes</option>
              {classes.map(c => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            <Plus size={16} />
            <span>New Bank</span>
          </button>
        </div>
      </div>

      {/* Banks Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--paper)', borderBottom: 'var(--border-hairline)' }}>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-text)', fontSize: '12px', textTransform: 'uppercase' }}>Bank Name</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-text)', fontSize: '12px', textTransform: 'uppercase' }}>Class</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-text)', fontSize: '12px', textTransform: 'uppercase' }}>Subject</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-text)', fontSize: '12px', textTransform: 'uppercase' }}>Active Questions</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-text)', fontSize: '12px', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--muted-text)', fontSize: '12px', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--muted-text)' }}>
                  Loading banks...
                </td>
              </tr>
            ) : banks.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--muted-text)' }}>
                  No question banks found.
                </td>
              </tr>
            ) : (
              banks.map(bank => {
                return (
                  <tr key={bank.id} style={{ borderBottom: 'var(--border-hairline)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                      <Link
                        to={`/admin/banks/${bank.id}`}
                        style={{ color: 'var(--ink)', textDecoration: 'none' }}
                        onMouseOver={(e) => e.target.style.color = 'var(--accent)'}
                        onMouseOut={(e) => e.target.style.color = 'var(--ink)'}
                      >
                        {bank.name}
                      </Link>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className="badge">{bank.className}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {bank.subject}
                    </td>
                    <td style={{ padding: '12px 16px' }} className="tabular-nums">
                      {bank.questionCount}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {bank.archived ? (
                        <span className="badge badge-warning">Archived</span>
                      ) : (
                        <span className="badge badge-correct">Active</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 'var(--space-2)' }}>
                        <button
                          onClick={() => toggleArchiveBank(bank.id, bank.archived)}
                          className="btn"
                          style={{ padding: '4px 10px', minHeight: '32px', fontSize: '13px' }}
                          title={bank.archived ? 'Restore bank' : 'Archive bank'}
                        >
                          {bank.archived ? (
                            <>
                              <RotateCcw size={14} />
                              <span>Restore</span>
                            </>
                          ) : (
                            <>
                              <Archive size={14} />
                              <span>Archive</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => navigate(`/admin/banks/${bank.id}`)}
                          className="btn btn-primary"
                          style={{ padding: '4px 12px', minHeight: '32px', fontSize: '13px' }}
                        >
                          <span>Manage</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* New Bank Modal */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-card" role="dialog" aria-modal="true">
            <h3 className="serif-title" style={{ fontSize: '20px', marginBottom: 'var(--space-2)' }}>
              Create Question Bank
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--muted-text)', marginBottom: 'var(--space-4)' }}>
              Each question bank is unique to a class and subject. Banks are archived, never permanently deleted.
            </p>

            <form onSubmit={handleCreateBank}>
              <div className="form-group">
                <label className="form-label" htmlFor="create-bank-class">
                  Class
                </label>
                <select
                  id="create-bank-class"
                  className="form-select"
                  value={createClassId}
                  onChange={(e) => setCreateClassId(e.target.value)}
                  required
                >
                  <option value="">Select class...</option>
                  {classes.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
                <label className="form-label" htmlFor="create-bank-subject">
                  Subject Name
                </label>
                <input
                  id="create-bank-subject"
                  type="text"
                  className="form-input"
                  placeholder="e.g. History"
                  value={createSubject}
                  onChange={(e) => setCreateSubject(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating || !createClassId || !createSubject.trim()}
                >
                  {creating ? 'Creating...' : 'Create Bank'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
