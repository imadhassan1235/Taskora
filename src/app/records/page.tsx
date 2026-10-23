'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Search,
  Trash2,
  Edit3,
  X,
  CheckCircle,
  ChevronDown,
  AlertTriangle,
  RefreshCw,
  Calendar,
  DollarSign,
  User,
  Clock,
  Filter,
} from 'lucide-react';
import type { BusinessRecord } from '@/types';
import { format } from 'date-fns';
import Link from 'next/link';

function formatAmount(amount: number | null, currency: string | null) {
  if (amount === null) return '—';
  return `${currency ?? ''} ${amount.toLocaleString()}`.trim();
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const map: Record<string, string> = {
    high: 'badge-green',
    medium: 'badge-yellow',
    low: 'badge-red',
  };
  return (
    <span className={`badge ${map[confidence] ?? 'badge-gray'}`} style={{ textTransform: 'capitalize' }}>
      {confidence}
    </span>
  );
}

interface EditModalProps {
  record: BusinessRecord;
  onClose: () => void;
  onSave: (updated: BusinessRecord) => void;
}

function EditModal({ record, onClose, onSave }: EditModalProps) {
  const [values, setValues] = useState({ ...record });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function change(key: string, value: string | number | null) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/records/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: values.customer,
          task: values.task,
          amount: values.amount,
          currency: values.currency,
          dueDate: values.dueDate,
          dueDateRaw: values.dueDateRaw,
          notes: values.notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onSave(data.data);
        onClose();
      } else {
        setError(data.error ?? 'Failed to save');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="card fade-in"
        style={{ width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Edit Record</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            { key: 'customer', label: 'Customer', type: 'text' },
            { key: 'task', label: 'Task / Work', type: 'text' },
            { key: 'amount', label: 'Amount', type: 'number' },
            { key: 'currency', label: 'Currency', type: 'text' },
            { key: 'dueDateRaw', label: 'Due Date (Original Text)', type: 'text' },
            { key: 'dueDate', label: 'Due Date (ISO)', type: 'date' },
            { key: 'notes', label: 'Notes', type: 'text' },
          ].map(({ key, label, type }) => (
            <div key={key}>
              <label className="form-label" htmlFor={`edit-${key}`}>{label}</label>
              <input
                id={`edit-${key}`}
                type={type}
                className="form-input"
                value={values[key as keyof BusinessRecord] !== null ? String(values[key as keyof BusinessRecord]) : ''}
                onChange={(e) =>
                  change(key, key === 'amount' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value || null)
                }
              />
            </div>
          ))}
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginTop: '1rem' }}>
            <X size={16} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <><div className="spinner spinner-sm" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> Saving...</> : <><CheckCircle size={16} /> Save Changes</>}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

interface DeleteConfirmProps {
  record: BusinessRecord;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}

function DeleteConfirm({ record, onConfirm, onCancel, deleting }: DeleteConfirmProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div className="card fade-in" style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ width: '2.5rem', height: '2.5rem', background: 'var(--error-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 size={18} color="var(--error)" />
          </div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Delete Record</h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Are you sure you want to delete the record for <strong>{record.customer ?? 'this customer'}</strong>? This action cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-danger" onClick={onConfirm} disabled={deleting}>
            {deleting ? <><div className="spinner spinner-sm" /> Deleting...</> : <><Trash2 size={16} /> Delete</>}
          </button>
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function RecordsPage() {
  const [records, setRecords] = useState<BusinessRecord[]>([]);
  const [filtered, setFiltered] = useState<BusinessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'amount'>('newest');
  const [editRecord, setEditRecord] = useState<BusinessRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<BusinessRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/records');
      const data = await res.json();
      if (data.success) {
        setRecords(data.data);
      } else {
        setError(data.error ?? 'Failed to load');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  useEffect(() => {
    let result = [...records];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.customer?.toLowerCase().includes(q) ||
          r.task?.toLowerCase().includes(q) ||
          r.originalMessage?.toLowerCase().includes(q) ||
          r.notes?.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'newest') result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (sortBy === 'oldest') result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    else if (sortBy === 'amount') result.sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));

    setFiltered(result);
  }, [records, search, sortBy]);

  async function handleDelete() {
    if (!deleteRecord) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/records/${deleteRecord.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setRecords((prev) => prev.filter((r) => r.id !== deleteRecord.id));
        setDeleteRecord(null);
      }
    } catch {
      // ignore, just close
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {editRecord && (
        <EditModal
          record={editRecord}
          onClose={() => setEditRecord(null)}
          onSave={(updated) => {
            setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
          }}
        />
      )}
      {deleteRecord && (
        <DeleteConfirm
          record={deleteRecord}
          onConfirm={handleDelete}
          onCancel={() => setDeleteRecord(null)}
          deleting={deleting}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Saved Records</h1>
          <p className="page-subtitle">
            {records.length} record{records.length !== 1 ? 's' : ''} stored locally
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadRecords} disabled={loading}>
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      <div className="page-body">
        {/* Search and filter bar */}
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.25rem' }}
              placeholder="Search by customer, task, message..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={14} color="var(--text-secondary)" />
            <select
              className="form-input form-select"
              style={{ width: 'auto', paddingRight: '2.25rem' }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="amount">Highest Amount</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '2rem 0' }}>
            <div className="spinner" />
            <span style={{ color: 'var(--text-secondary)' }}>Loading records...</span>
          </div>
        ) : error ? (
          <div className="alert alert-error">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">
                <FileText size={28} />
              </div>
              <div className="empty-state-title">
                {search ? 'No records match your search' : 'No records yet'}
              </div>
              <div className="empty-state-desc">
                {search
                  ? 'Try different search terms.'
                  : 'Use the AI Workspace to extract and save your first business record.'}
              </div>
              {!search && (
                <Link href="/workspace" className="btn btn-primary">
                  Go to AI Workspace
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filtered.map((record) => (
              <div
                key={record.id}
                className="card"
                style={{ padding: '1.25rem', cursor: 'pointer' }}
                onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.375rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                        {record.customer ?? <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>Unknown Customer</span>}
                      </span>
                      <ConfidenceBadge confidence={record.confidence} />
                      <span className="badge badge-gray">{record.language}</span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      {record.task ?? <span style={{ fontStyle: 'italic' }}>No task description</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.8125rem' }}>
                      {(record.amount !== null) && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#16A34A', fontWeight: 600 }}>
                          <DollarSign size={13} />
                          {formatAmount(record.amount, record.currency)}
                        </span>
                      )}
                      {(record.dueDate || record.dueDateRaw) && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-secondary)' }}>
                          <Calendar size={13} />
                          {record.dueDateRaw ?? record.dueDate}
                        </span>
                      )}
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)' }}>
                        <Clock size={13} />
                        {format(new Date(record.createdAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setEditRecord(record)}
                      aria-label="Edit record"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => setDeleteRecord(record)}
                      aria-label="Delete record"
                    >
                      <Trash2 size={14} />
                    </button>
                    <ChevronDown
                      size={16}
                      color="var(--text-muted)"
                      style={{ transition: 'transform 0.2s', transform: expandedId === record.id ? 'rotate(180deg)' : '' }}
                    />
                  </div>
                </div>

                {/* Expanded detail */}
                {expandedId === record.id && (
                  <div
                    className="fade-in"
                    style={{
                      marginTop: '1rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid var(--border)',
                      fontSize: '0.875rem',
                    }}
                  >
                    <div
                      style={{
                        background: 'var(--bg-main)',
                        borderRadius: 'var(--radius)',
                        padding: '0.75rem',
                        marginBottom: '0.75rem',
                        color: 'var(--text-secondary)',
                        fontStyle: 'italic',
                      }}
                    >
                      "{record.originalMessage}"
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
                      {[
                        { label: 'ID', value: record.id.slice(0, 8) + '...' },
                        { label: 'Language', value: record.language },
                        { label: 'Confidence', value: record.confidence },
                        { label: 'Updated', value: format(new Date(record.updatedAt), 'MMM d, yyyy HH:mm') },
                        ...(record.notes ? [{ label: 'Notes', value: record.notes }] : []),
                        ...(record.uncertain?.length ? [{ label: 'Uncertain Fields', value: record.uncertain.join(', ') }] : []),
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{label}: </span>
                          <span style={{ color: 'var(--text-primary)' }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
