import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { AdminNav } from '../../components/AdminNav';
import { Search, Shield, UserCheck, UserMinus, AlertTriangle } from 'lucide-react';

export const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    user: null,
    targetRole: null
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);

      const [usersData, classesData] = await Promise.all([
        api.get(`/admin/users?${params.toString()}`),
        api.get('/classes')
      ]);

      setUsers(usersData.users || []);
      setClasses(classesData.classes || []);
    } catch (err) {
      setError(err.message || 'Failed to load user directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [roleFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleClassChange = async (userId, newClassId) => {
    try {
      setError('');
      setSuccessMsg('');
      await api.patch(`/admin/users/${userId}`, { classId: newClassId || null });
      setSuccessMsg('User class enrollment updated.');
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to update user class.');
    }
  };

  const executeRoleChange = async () => {
    if (!confirmModal.user || !confirmModal.targetRole) return;
    try {
      setError('');
      setSuccessMsg('');
      await api.patch(`/admin/users/${confirmModal.user.id}`, { role: confirmModal.targetRole });
      setSuccessMsg(`User role successfully updated to ${confirmModal.targetRole}.`);
      setConfirmModal({ open: false, user: null, targetRole: null });
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to update user role.');
      setConfirmModal({ open: false, user: null, targetRole: null });
    }
  };

  return (
    <div className="container-wide" style={{ padding: 'var(--space-8) var(--space-4)' }}>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h1 className="serif-title" style={{ fontSize: '28px', marginBottom: 'var(--space-1)' }}>
          Administration
        </h1>
        <p style={{ color: 'var(--muted-text)', fontSize: '14px' }}>
          Manage user accounts, privileges, classes, and question banks
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

      {successMsg && (
        <div style={{
          padding: 'var(--space-3)',
          backgroundColor: 'var(--correct-bg)',
          color: 'var(--correct)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: 'var(--space-4)',
          fontSize: '14px'
        }}>
          {successMsg}
        </div>
      )}

      {/* Filters Bar */}
      <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <form onSubmit={handleSearchSubmit} style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 'var(--space-3)'
        }}>
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '36px' }}
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={16} color="var(--muted-text)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          </div>

          <div style={{ minWidth: '160px' }}>
            <select
              className="form-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="student">Students</option>
              <option value="admin">Administrators</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary">
            Filter
          </button>
        </form>
      </div>

      {/* Users Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--paper)', borderBottom: 'var(--border-hairline)' }}>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-text)', fontSize: '12px', textTransform: 'uppercase' }}>User</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-text)', fontSize: '12px', textTransform: 'uppercase' }}>Email</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-text)', fontSize: '12px', textTransform: 'uppercase' }}>Role</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-text)', fontSize: '12px', textTransform: 'uppercase' }}>Class</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--muted-text)', fontSize: '12px', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--muted-text)' }}>
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--muted-text)' }}>
                  No users found matching current filters.
                </td>
              </tr>
            ) : (
              users.map(u => {
                const isSelf = u.id === currentUser?.id;
                const isMain = u.isMainAdmin;

                return (
                  <tr key={u.id} style={{ borderBottom: 'var(--border-hairline)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{u.name}</span>
                        {isSelf && <span className="badge">You</span>}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--muted-text)' }}>
                      {u.email}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {isMain ? (
                        <span className="badge badge-admin">
                          <Shield size={12} style={{ marginRight: '4px' }} />
                          Main admin
                        </span>
                      ) : u.role === 'admin' ? (
                        <span className="badge badge-admin">
                          Administrator
                        </span>
                      ) : (
                        <span className="badge">
                          Student
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {isMain ? (
                        <span style={{ fontSize: '13px', color: 'var(--muted-text)' }}>—</span>
                      ) : (
                        <select
                          className="form-select"
                          style={{ minHeight: '32px', padding: '4px 8px', fontSize: '13px', maxWidth: '160px' }}
                          value={u.classId || ''}
                          onChange={(e) => handleClassChange(u.id, e.target.value)}
                        >
                          <option value="">No class</option>
                          {classes.map(c => (
                            <option key={c._id} value={c._id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {isMain ? (
                        <span style={{ fontSize: '12px', color: 'var(--muted-text)', fontStyle: 'italic' }}>
                          The main admin can't be changed.
                        </span>
                      ) : u.role === 'admin' ? (
                        <button
                          onClick={() => setConfirmModal({ open: true, user: u, targetRole: 'student' })}
                          className="btn btn-danger"
                          style={{ padding: '4px 10px', minHeight: '32px', fontSize: '12px' }}
                          disabled={isSelf}
                          title={isSelf ? "You cannot remove your own admin role" : "Demote to student"}
                        >
                          <UserMinus size={13} />
                          <span>Remove admin</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmModal({ open: true, user: u, targetRole: 'admin' })}
                          className="btn btn-primary"
                          style={{ padding: '4px 10px', minHeight: '32px', fontSize: '12px' }}
                        >
                          <UserCheck size={13} />
                          <span>Make admin</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Role Change Confirmation Dialog */}
      {confirmModal.open && (
        <div className="modal-backdrop">
          <div className="modal-card" role="dialog" aria-modal="true">
            <h3 className="serif-title" style={{ fontSize: '20px', marginBottom: 'var(--space-2)' }}>
              Confirm Role Change
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--muted-text)', lineHeight: 1.5, marginBottom: 'var(--space-6)' }}>
              Are you sure you want to change the role of{' '}
              <strong style={{ color: 'var(--ink)' }}>{confirmModal.user?.name}</strong> to{' '}
              <strong style={{ color: 'var(--accent)' }}>{confirmModal.targetRole}</strong>?
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setConfirmModal({ open: false, user: null, targetRole: null })}
              >
                Cancel
              </button>
              <button
                type="button"
                className={confirmModal.targetRole === 'admin' ? 'btn btn-primary' : 'btn btn-danger'}
                onClick={executeRoleChange}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
