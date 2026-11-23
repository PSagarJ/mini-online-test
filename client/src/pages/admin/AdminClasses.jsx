import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AdminNav } from '../../components/AdminNav';
import { School, Plus, Edit2, Check, X } from 'lucide-react';

export const AdminClasses = () => {
  const [classes, setClasses] = useState([]);
  const [newClassName, setNewClassName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadClasses = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.get('/admin/classes');
      setClasses(data.classes || []);
    } catch (err) {
      setError(err.message || 'Failed to load school classes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      await api.post('/admin/classes', { name: newClassName.trim() });
      setNewClassName('');
      setSuccess('Class added successfully.');
      loadClasses();
    } catch (err) {
      setError(err.message || 'Failed to create class.');
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (cls) => {
    setEditingId(cls._id);
    setEditingName(cls.name);
    setError('');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleRenameClass = async (classId) => {
    if (!editingName.trim()) return;

    try {
      setError('');
      setSuccess('');
      await api.patch(`/admin/classes/${classId}`, { name: editingName.trim() });
      setEditingId(null);
      setSuccess('Class renamed successfully.');
      loadClasses();
    } catch (err) {
      setError(err.message || 'Failed to rename class.');
    }
  };

  return (
    <div className="container-wide" style={{ padding: 'var(--space-8) var(--space-4)' }}>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h1 className="serif-title" style={{ fontSize: '28px', marginBottom: 'var(--space-1)' }}>
          Administration
        </h1>
        <p style={{ color: 'var(--muted-text)', fontSize: '14px' }}>
          Configure grade levels and class designations
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

      {/* Add Class Form */}
      <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <form onSubmit={handleAddClass} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Class 13 (Foundation)"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving || !newClassName.trim()}>
            <Plus size={16} />
            <span>Add Class</span>
          </button>
        </form>
      </div>

      {/* Classes Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--paper)', borderBottom: 'var(--border-hairline)' }}>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-text)', fontSize: '12px', textTransform: 'uppercase', width: '80px' }}>Order</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-text)', fontSize: '12px', textTransform: 'uppercase' }}>Class Name</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--muted-text)', fontSize: '12px', textTransform: 'uppercase', width: '140px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--muted-text)' }}>
                  Loading classes...
                </td>
              </tr>
            ) : classes.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--muted-text)' }}>
                  No classes configured yet.
                </td>
              </tr>
            ) : (
              classes.map((cls) => {
                const isEditing = editingId === cls._id;

                return (
                  <tr key={cls._id} style={{ borderBottom: 'var(--border-hairline)' }}>
                    <td style={{ padding: '12px 16px' }} className="tabular-nums">
                      {cls.order}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          className="form-input"
                          style={{ minHeight: '32px', padding: '4px 8px', maxWidth: '300px' }}
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameClass(cls._id);
                            if (e.key === 'Escape') cancelEditing();
                          }}
                        />
                      ) : (
                        <span style={{ fontWeight: 600 }}>{cls.name}</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {isEditing ? (
                        <div style={{ display: 'inline-flex', gap: '4px' }}>
                          <button
                            onClick={() => handleRenameClass(cls._id)}
                            className="btn btn-primary"
                            style={{ padding: '4px 8px', minHeight: '30px' }}
                            title="Save name"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="btn"
                            style={{ padding: '4px 8px', minHeight: '30px' }}
                            title="Cancel"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditing(cls)}
                          className="btn"
                          style={{ padding: '4px 10px', minHeight: '30px', fontSize: '13px' }}
                        >
                          <Edit2 size={13} />
                          <span>Rename</span>
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
    </div>
  );
};
