import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { AdminNav } from '../../components/AdminNav';
import {
  ArrowLeft, Plus, Search, Edit3, Trash2, Archive, RotateCcw,
  Upload, Download, AlertCircle, CheckCircle2, Check
} from 'lucide-react';

export const AdminBankDetail = () => {
  const { bankId } = useParams();

  const [bank, setBank] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // active, archived, all
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add Question Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newText, setNewText] = useState('');
  const [newOptions, setNewOptions] = useState(['', '', '', '']);
  const [newCorrectIndex, setNewCorrectIndex] = useState(0);
  const [newExplanation, setNewExplanation] = useState('');
  const [savingQuestion, setSavingQuestion] = useState(false);

  // Edit Question Modal State
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editText, setEditText] = useState('');
  const [editOptions, setEditOptions] = useState(['', '', '', '']);
  const [editCorrectIndex, setEditCorrectIndex] = useState(0);
  const [editExplanation, setEditExplanation] = useState('');
  const [updatingQuestion, setUpdatingQuestion] = useState(false);

  // Delete Confirmation Modal State
  const [deleteConfirmQ, setDeleteConfirmQ] = useState(null);

  // CSV Import State
  const [csvFile, setCsvFile] = useState(null);
  const [csvContent, setCsvContent] = useState('');
  const [csvErrors, setCsvErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const data = await api.get(`/admin/banks/${bankId}/questions?${params.toString()}`);
      setBank(data.bank);
      setQuestions(data.questions || []);
    } catch (err) {
      setError(err.message || 'Failed to load bank questions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [bankId, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadQuestions();
  };

  // Add Question Handler
  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newText.trim()) {
      setError('Question text is required.');
      return;
    }

    if (newOptions.some(opt => !opt.trim())) {
      setError('All four options must be filled out.');
      return;
    }

    if (new Set(newOptions.map(o => o.trim())).size !== 4) {
      setError('All four options must be distinct.');
      return;
    }

    try {
      setSavingQuestion(true);
      await api.post(`/admin/banks/${bankId}/questions`, {
        text: newText.trim(),
        options: newOptions.map(o => o.trim()),
        correctIndex: newCorrectIndex,
        explanation: newExplanation.trim()
      });

      setSuccess('Question added successfully.');
      setShowAddForm(false);
      setNewText('');
      setNewOptions(['', '', '', '']);
      setNewCorrectIndex(0);
      setNewExplanation('');
      loadQuestions();
    } catch (err) {
      setError(err.message || 'Failed to add question.');
    } finally {
      setSavingQuestion(false);
    }
  };

  // Edit Question Handlers
  const openEditModal = (q) => {
    setEditingQuestion(q);
    setEditText(q.text);
    setEditOptions([...q.options]);
    setEditCorrectIndex(q.correctIndex);
    setEditExplanation(q.explanation || '');
    setError('');
  };

  const handleUpdateQuestion = async (e) => {
    e.preventDefault();
    if (!editingQuestion) return;

    if (!editText.trim()) {
      setError('Question text is required.');
      return;
    }

    if (editOptions.some(opt => !opt.trim())) {
      setError('All four options must be filled out.');
      return;
    }

    if (new Set(editOptions.map(o => o.trim())).size !== 4) {
      setError('All four options must be distinct.');
      return;
    }

    try {
      setUpdatingQuestion(true);
      setError('');
      await api.put(`/admin/questions/${editingQuestion.id || editingQuestion._id}`, {
        text: editText.trim(),
        options: editOptions.map(o => o.trim()),
        correctIndex: editCorrectIndex,
        explanation: editExplanation.trim()
      });

      setSuccess('Question updated successfully.');
      setEditingQuestion(null);
      loadQuestions();
    } catch (err) {
      setError(err.message || 'Failed to update question.');
    } finally {
      setUpdatingQuestion(false);
    }
  };

  // Toggle Archive Question
  const handleToggleArchive = async (questionId, currentArchived) => {
    try {
      setError('');
      await api.patch(`/admin/questions/${questionId}`, { archived: !currentArchived });
      setSuccess(currentArchived ? 'Question restored.' : 'Question archived.');
      loadQuestions();
    } catch (err) {
      setError(err.message || 'Failed to update question status.');
    }
  };

  // Delete Question
  const handleDeleteQuestion = async () => {
    if (!deleteConfirmQ) return;
    try {
      setError('');
      await api.del(`/admin/questions/${deleteConfirmQ.id || deleteConfirmQ._id}`);
      setSuccess('Question permanently deleted.');
      setDeleteConfirmQ(null);
      loadQuestions();
    } catch (err) {
      setError(err.message || 'Failed to delete question.');
    }
  };

  // CSV File Handler
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCsvFile(file);
    setCsvErrors([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvContent(event.target.result);
    };
    reader.readAsText(file);
  };

  const handleImportCsv = async () => {
    if (!csvContent) {
      setError('Please select a valid CSV file.');
      return;
    }

    try {
      setImporting(true);
      setError('');
      setCsvErrors([]);

      const data = await api.post(`/admin/banks/${bankId}/import`, { csv: csvContent });
      setSuccess(`Successfully imported ${data.imported} questions.`);
      setCsvFile(null);
      setCsvContent('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadQuestions();
    } catch (err) {
      setError(err.message || 'CSV Import failed.');
      if (Array.isArray(err.errors)) {
        setCsvErrors(err.errors);
      }
    } finally {
      setImporting(false);
    }
  };

  // Download CSV Template
  const handleDownloadTemplate = () => {
    const header = 'question,option_a,option_b,option_c,option_d,correct,explanation';
    const sampleRow = '"What is the capital of France?",Paris,London,Berlin,Rome,A,"Paris is the capital and largest city of France."';
    const csvData = `${header}\n${sampleRow}\n`;

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'question_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container-wide" style={{ padding: 'var(--space-8) var(--space-4)' }}>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <Link
          to="/admin/banks"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: 'var(--muted-text)',
            marginBottom: 'var(--space-2)'
          }}
        >
          <ArrowLeft size={14} />
          <span>Back to Question Banks</span>
        </Link>
        <h1 className="serif-title" style={{ fontSize: '28px', marginBottom: 'var(--space-1)' }}>
          {bank?.name || 'Question Bank Management'}
        </h1>
        <p style={{ color: 'var(--muted-text)', fontSize: '14px' }}>
          Manage test questions, import CSV archives, and monitor active question pools
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

      {/* CSV Import / Actions Card */}
      <div className="card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-4)'
        }}>
          <div>
            <h3 className="serif-title" style={{ fontSize: '18px', marginBottom: '4px' }}>
              Batch Import Questions
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--muted-text)' }}>
              Upload up to 500 questions via CSV. All rows are validated before any data is saved.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <button
              onClick={handleDownloadTemplate}
              className="btn"
              type="button"
              style={{ fontSize: '13px' }}
            >
              <Download size={14} />
              <span>Download template</span>
            </button>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn btn-primary"
              type="button"
              style={{ fontSize: '13px' }}
            >
              <Plus size={14} />
              <span>{showAddForm ? 'Cancel New Question' : 'Add Question'}</span>
            </button>
          </div>
        </div>

        {/* File Picker & Import Button */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          marginTop: 'var(--space-4)',
          flexWrap: 'wrap',
          borderTop: 'var(--border-hairline)',
          paddingTop: 'var(--space-4)'
        }}>
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv,text/csv"
            onChange={handleFileSelect}
            style={{ fontSize: '13px' }}
          />

          <button
            onClick={handleImportCsv}
            className="btn btn-primary"
            disabled={!csvFile || importing}
            style={{ minHeight: '36px', padding: '6px 14px', fontSize: '13px' }}
          >
            <Upload size={14} />
            <span>{importing ? 'Validating & Importing...' : 'Import CSV'}</span>
          </button>
        </div>

        {/* CSV Row Errors Display */}
        {csvErrors.length > 0 && (
          <div style={{
            marginTop: 'var(--space-4)',
            padding: 'var(--space-3)',
            backgroundColor: 'var(--wrong-bg)',
            border: '1px solid #EBB6AE',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px'
          }}>
            <div style={{ fontWeight: 600, color: 'var(--wrong)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle size={16} />
              <span>Import rejected: {csvErrors.length} row {csvErrors.length === 1 ? 'error' : 'errors'} found. Nothing was imported.</span>
            </div>
            <ul style={{ paddingLeft: '20px', color: 'var(--wrong)', maxHeight: '160px', overflowY: 'auto' }}>
              {csvErrors.map((err, i) => (
                <li key={i}>
                  Row {err.row}: {err.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Inline Add Question Form */}
      {showAddForm && (
        <div className="card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)', border: '2px solid var(--accent)' }}>
          <h3 className="serif-title" style={{ fontSize: '18px', marginBottom: 'var(--space-4)' }}>
            Add New Question
          </h3>

          <form onSubmit={handleCreateQuestion}>
            <div className="form-group">
              <label className="form-label" htmlFor="new-q-text">
                Question Text
              </label>
              <textarea
                id="new-q-text"
                className="form-input"
                style={{ minHeight: '80px' }}
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Enter clear, concise question prompt..."
                required
              />
            </div>

            <div style={{ marginBottom: 'var(--space-4)' }}>
              <label className="form-label" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                Options (Select the radio for the correct option)
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {newOptions.map((opt, idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <input
                        type="radio"
                        id={`new-opt-radio-${idx}`}
                        name="new-correct-option"
                        checked={newCorrectIndex === idx}
                        onChange={() => setNewCorrectIndex(idx)}
                        style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                      />
                      <label htmlFor={`new-opt-radio-${idx}`} style={{ fontWeight: 600, width: '20px', cursor: 'pointer' }}>
                        {letter}.
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        style={{ minHeight: '36px', fontSize: '14px' }}
                        placeholder={`Option ${letter}`}
                        value={opt}
                        onChange={(e) => {
                          const updated = [...newOptions];
                          updated[idx] = e.target.value;
                          setNewOptions(updated);
                        }}
                        required
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="new-q-explanation">
                Explanation (Optional, 1 sentence)
              </label>
              <input
                id="new-q-explanation"
                type="text"
                className="form-input"
                placeholder="Why this answer is factually correct..."
                value={newExplanation}
                onChange={(e) => setNewExplanation(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={savingQuestion}
              >
                {savingQuestion ? 'Saving...' : 'Add Question'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '36px' }}
              placeholder="Search question text..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={16} color="var(--muted-text)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          </div>

          <div style={{ minWidth: '160px' }}>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="archived">Archived Only</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary">
            Filter
          </button>
        </form>
      </div>

      {/* Questions Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--paper)', borderBottom: 'var(--border-hairline)' }}>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-text)', fontSize: '12px', textTransform: 'uppercase', width: '50px' }}>#</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-text)', fontSize: '12px', textTransform: 'uppercase' }}>Question & Options</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-text)', fontSize: '12px', textTransform: 'uppercase', width: '100px' }}>Correct</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-text)', fontSize: '12px', textTransform: 'uppercase', width: '90px' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--muted-text)', fontSize: '12px', textTransform: 'uppercase', width: '180px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--muted-text)' }}>
                  Loading questions...
                </td>
              </tr>
            ) : questions.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--muted-text)' }}>
                  No questions found in this bank.
                </td>
              </tr>
            ) : (
              questions.map((q, idx) => {
                const correctLetter = String.fromCharCode(65 + q.correctIndex);

                return (
                  <tr key={q.id || q._id} style={{ borderBottom: 'var(--border-hairline)' }}>
                    <td style={{ padding: '12px 16px', verticalAlign: 'top' }} className="tabular-nums">
                      {idx + 1}
                    </td>
                    <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 600, marginBottom: '6px' }}>{q.text}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px', fontSize: '12px', color: 'var(--muted-text)' }}>
                        {q.options.map((opt, i) => (
                          <div key={i} style={{ color: i === q.correctIndex ? 'var(--correct)' : 'inherit', fontWeight: i === q.correctIndex ? 600 : 400 }}>
                            {String.fromCharCode(65 + i)}. {opt}
                          </div>
                        ))}
                      </div>
                      {q.explanation && (
                        <div style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--muted-text)', marginTop: '4px' }}>
                          Note: {q.explanation}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                      <span className="badge badge-correct">
                        Option {correctLetter}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                      {q.archived ? (
                        <span className="badge badge-warning">Archived</span>
                      ) : (
                        <span className="badge badge-correct">Active</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', verticalAlign: 'top' }}>
                      <div style={{ display: 'inline-flex', gap: '4px' }}>
                        <button
                          onClick={() => openEditModal(q)}
                          className="btn"
                          style={{ padding: '4px 8px', minHeight: '30px' }}
                          title="Edit question"
                        >
                          <Edit3 size={13} />
                        </button>

                        <button
                          onClick={() => handleToggleArchive(q.id || q._id, q.archived)}
                          className="btn"
                          style={{ padding: '4px 8px', minHeight: '30px' }}
                          title={q.archived ? 'Restore question' : 'Archive question'}
                        >
                          {q.archived ? <RotateCcw size={13} /> : <Archive size={13} />}
                        </button>

                        <button
                          onClick={() => setDeleteConfirmQ(q)}
                          className="btn btn-danger"
                          style={{ padding: '4px 8px', minHeight: '30px' }}
                          title="Delete question permanently"
                        >
                          <Trash2 size={13} />
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

      {/* Edit Question Modal */}
      {editingQuestion && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '600px' }} role="dialog" aria-modal="true">
            <h3 className="serif-title" style={{ fontSize: '20px', marginBottom: 'var(--space-4)' }}>
              Edit Question
            </h3>

            <form onSubmit={handleUpdateQuestion}>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-q-text">
                  Question Text
                </label>
                <textarea
                  id="edit-q-text"
                  className="form-input"
                  style={{ minHeight: '80px' }}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label className="form-label" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                  Options (Select radio for correct answer)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {editOptions.map((opt, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <input
                        type="radio"
                        id={`edit-opt-radio-${idx}`}
                        name="edit-correct-option"
                        checked={editCorrectIndex === idx}
                        onChange={() => setEditCorrectIndex(idx)}
                        style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                      />
                      <label htmlFor={`edit-opt-radio-${idx}`} style={{ fontWeight: 600, width: '20px', cursor: 'pointer' }}>
                        {String.fromCharCode(65 + idx)}.
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        style={{ minHeight: '36px' }}
                        value={opt}
                        onChange={(e) => {
                          const updated = [...editOptions];
                          updated[idx] = e.target.value;
                          setEditOptions(updated);
                        }}
                        required
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="edit-q-explanation">
                  Explanation
                </label>
                <input
                  id="edit-q-explanation"
                  type="text"
                  className="form-input"
                  value={editExplanation}
                  onChange={(e) => setEditExplanation(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setEditingQuestion(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={updatingQuestion}
                >
                  {updatingQuestion ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmQ && (
        <div className="modal-backdrop">
          <div className="modal-card" role="dialog" aria-modal="true">
            <h3 className="serif-title" style={{ fontSize: '20px', marginBottom: 'var(--space-2)', color: 'var(--wrong)' }}>
              Delete Question?
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--muted-text)', lineHeight: 1.5, marginBottom: 'var(--space-6)' }}>
              Are you sure you want to permanently delete this question? Existing attempts keep their own immutable snapshot, so past tests and scores will not be altered.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setDeleteConfirmQ(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteQuestion}
              >
                Delete Question
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
