'use client';

import { useState, useRef, ChangeEvent, FormEvent } from 'react';
import {
  Sparkles,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Edit3,
  Trash2,
  Save,
  ChevronDown,
  Loader2,
  Image as ImageIcon,
  FileText,
  Info,
} from 'lucide-react';
import type { ExtractedDraft, Language } from '@/types';

const EXAMPLE_MESSAGES = {
  english: 'Ali ordered 3 website designs for PKR 15,000. Delivery is due Friday.',
  'roman-urdu': 'Ahmed ko 2 landing pages banani hain, total 20000 rupay. Deadline aglay Monday hai.',
  urdu: 'سارہ نے 5 سوشل میڈیا پوسٹیں بنوانی ہیں، کل رقم 8000 روپے ہے۔ جمعہ تک کام مکمل کرنا ہے۔',
};

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'english', label: 'English' },
  { value: 'urdu', label: 'Urdu (اردو)' },
  { value: 'roman-urdu', label: 'Roman Urdu' },
];

interface DraftField {
  key: keyof Omit<ExtractedDraft, 'originalMessage' | 'language' | 'extractedAt' | 'uncertain' | 'confidence'>;
  label: string;
  type: 'text' | 'number' | 'date';
  placeholder: string;
}

const DRAFT_FIELDS: DraftField[] = [
  { key: 'customer', label: 'Customer / Contact', type: 'text', placeholder: 'Customer name' },
  { key: 'task', label: 'Task / Work Description', type: 'text', placeholder: 'What work needs to be done' },
  { key: 'amount', label: 'Amount', type: 'number', placeholder: 'Numeric amount' },
  { key: 'currency', label: 'Currency', type: 'text', placeholder: 'e.g. PKR, USD' },
  { key: 'dueDateRaw', label: 'Due Date (Original)', type: 'text', placeholder: 'e.g. Friday, next Monday' },
  { key: 'dueDate', label: 'Due Date (ISO)', type: 'date', placeholder: 'YYYY-MM-DD if deterministic' },
  { key: 'notes', label: 'Notes', type: 'text', placeholder: 'Additional notes' },
];

type ExtractionStatus = 'idle' | 'loading' | 'success' | 'error';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function WorkspacePage() {
  const [message, setMessage] = useState('');
  const [language, setLanguage] = useState<Language>('auto');
  const [extractStatus, setExtractStatus] = useState<ExtractionStatus>('idle');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [draft, setDraft] = useState<ExtractedDraft | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [saveErrorMsg, setSaveErrorMsg] = useState('');
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_CHARS = 2000;
  const charCount = message.length;

  function loadExample(type: keyof typeof EXAMPLE_MESSAGES) {
    setMessage(EXAMPLE_MESSAGES[type]);
    setLanguage(type === 'english' ? 'english' : type === 'urdu' ? 'urdu' : 'roman-urdu');
    setExtractStatus('idle');
    setDraft(null);
    setErrorMsg('');
    setSaveStatus('idle');
    setSavedRecordId(null);
  }

  async function handleExtract(e?: FormEvent) {
    e?.preventDefault();
    if (!message.trim() || message.length < 3) return;

    setExtractStatus('loading');
    setErrorMsg('');
    setDraft(null);
    setSaveStatus('idle');
    setSavedRecordId(null);

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim(), language }),
      });
      const data = await res.json();

      if (data.success) {
        setDraft(data.data);
        setExtractStatus('success');
      } else {
        setErrorMsg(data.details ?? data.error ?? 'Extraction failed.');
        setExtractStatus('error');
      }
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.');
      setExtractStatus('error');
    }
  }

  function handleDraftChange(key: string, value: string) {
    if (!draft) return;
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [key]: key === 'amount' ? (value === '' ? null : Number(value)) : value === '' ? null : value,
      };
    });
    setSaveStatus('idle');
    setSavedRecordId(null);
  }

  function handleDiscard() {
    setDraft(null);
    setExtractStatus('idle');
    setErrorMsg('');
    setSaveStatus('idle');
    setSavedRecordId(null);
  }

  async function handleSave() {
    if (!draft) return;
    setSaveStatus('saving');
    setSaveErrorMsg('');

    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft }),
      });
      const data = await res.json();

      if (data.success) {
        setSaveStatus('saved');
        setSavedRecordId(data.data.id);
        setDraft(null);
        setMessage('');
        setExtractStatus('idle');
      } else {
        setSaveErrorMsg(data.details ?? data.error ?? 'Failed to save record.');
        setSaveStatus('error');
      }
    } catch {
      setSaveErrorMsg('Network error while saving. Please try again.');
      setSaveStatus('error');
    }
  }

  function isUncertain(key: string) {
    return draft?.uncertain?.includes(key) ?? false;
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Workspace</h1>
          <p className="page-subtitle">
            Enter a business message and let AI extract structured information
          </p>
        </div>
      </div>

      <div className="page-body">
        {/* Success banner */}
        {saveStatus === 'saved' && savedRecordId && (
          <div className="alert alert-success fade-in" style={{ marginBottom: '1.5rem' }}>
            <CheckCircle size={18} />
            <div>
              <strong>Record saved successfully!</strong> Find it in{' '}
              <a href="/records" style={{ textDecoration: 'underline', fontWeight: 600 }}>
                Saved Records
              </a>
              .
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          {/* Message Composer */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <Sparkles size={20} color="var(--primary)" />
              <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Message Composer</h2>
            </div>

            {/* Example buttons */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 500 }}>
                Load example:
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button className="btn btn-sm btn-secondary" onClick={() => loadExample('english')}>
                  🇬🇧 English
                </button>
                <button className="btn btn-sm btn-secondary" onClick={() => loadExample('roman-urdu')}>
                  Roman Urdu
                </button>
                <button className="btn btn-sm btn-secondary" onClick={() => loadExample('urdu')}>
                  اردو Urdu
                </button>
              </div>
            </div>

            <form onSubmit={handleExtract}>
              {/* Language selector */}
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label" htmlFor="language-select">
                  Message Language
                </label>
                <select
                  id="language-select"
                  className="form-input form-select"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Message textarea */}
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label" htmlFor="message-input">
                  Business Message
                </label>
                <textarea
                  id="message-input"
                  className={`form-input form-textarea ${charCount > MAX_CHARS ? 'error' : ''}`}
                  style={{ minHeight: '140px', resize: 'vertical' }}
                  placeholder="e.g. Ali ne 3 website designs ka order diya hai, total 15000 rupees. Friday tak deliver karna hai."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={extractStatus === 'loading'}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginTop: '0.375rem',
                    fontSize: '0.8125rem',
                    color: charCount > MAX_CHARS ? 'var(--error)' : 'var(--text-muted)',
                  }}
                >
                  {charCount}/{MAX_CHARS}
                </div>
              </div>

              {/* Extract button */}
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
                disabled={
                  extractStatus === 'loading' ||
                  !message.trim() ||
                  message.length < 3 ||
                  charCount > MAX_CHARS
                }
              >
                {extractStatus === 'loading' ? (
                  <>
                    <div className="spinner spinner-sm" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />
                    Extracting Information...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Extract Information
                  </>
                )}
              </button>
            </form>

            {/* Error state */}
            {extractStatus === 'error' && (
              <div className="alert alert-error fade-in" style={{ marginTop: '1rem' }}>
                <XCircle size={18} style={{ flexShrink: 0 }} />
                <div>
                  <strong>Extraction failed.</strong> {errorMsg}
                  <div style={{ marginTop: '0.5rem' }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleExtract()}>
                      <RefreshCw size={14} />
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Draft Review Form */}
          {draft && extractStatus === 'success' && (
            <div className="card fade-in">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.25rem',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Edit3 size={20} color="var(--primary)" />
                  <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Extracted Draft</h2>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className={`badge ${draft.confidence === 'high' ? 'badge-green' : draft.confidence === 'medium' ? 'badge-yellow' : 'badge-red'}`}>
                    {draft.confidence} confidence
                  </span>
                  <span className="badge badge-gray">{draft.language}</span>
                </div>
              </div>

              {/* Info: original message */}
              <div
                style={{
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '0.75rem 1rem',
                  marginBottom: '1.25rem',
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <div style={{ fontWeight: 500, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
                  <Info size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }} />
                  Original Message
                </div>
                <div style={{ fontStyle: 'italic' }}>{draft.originalMessage}</div>
              </div>

              {/* Uncertain fields warning */}
              {draft.uncertain && draft.uncertain.length > 0 && (
                <div className="alert alert-warning" style={{ marginBottom: '1.25rem' }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Fields flagged as uncertain:</strong>{' '}
                    {draft.uncertain.join(', ')}. Please review and correct if needed.
                  </div>
                </div>
              )}

              {/* Editable fields */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.5rem',
                }}
              >
                {DRAFT_FIELDS.map(({ key, label, type, placeholder }) => (
                  <div key={key}>
                    <label className="form-label" htmlFor={`field-${key}`}>
                      {label}
                      {isUncertain(key) && (
                        <span
                          style={{
                            marginLeft: '0.375rem',
                            color: 'var(--warning)',
                            fontSize: '0.75rem',
                          }}
                        >
                          ⚠ uncertain
                        </span>
                      )}
                    </label>
                    <input
                      id={`field-${key}`}
                      type={type}
                      className={`form-input ${isUncertain(key) ? 'error' : ''}`}
                      style={isUncertain(key) ? { borderColor: 'var(--warning)', boxShadow: '0 0 0 3px rgba(217,119,6,0.08)' } : {}}
                      placeholder={placeholder}
                      value={
                        draft[key] !== null && draft[key] !== undefined
                          ? String(draft[key])
                          : ''
                      }
                      onChange={(e) => handleDraftChange(key, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              {/* Save error */}
              {saveStatus === 'error' && (
                <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                  <XCircle size={16} />
                  <span>{saveErrorMsg}</span>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={saveStatus === 'saving'}
                >
                  {saveStatus === 'saving' ? (
                    <>
                      <div className="spinner spinner-sm" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Confirm & Save
                    </>
                  )}
                </button>
                <button className="btn btn-secondary" onClick={() => handleExtract()}>
                  <RefreshCw size={16} />
                  Re-extract
                </button>
                <button className="btn btn-ghost" onClick={handleDiscard}>
                  <Trash2 size={16} />
                  Discard Draft
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
