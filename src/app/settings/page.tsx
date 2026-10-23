'use client';

import { useState } from 'react';
import {
  Settings,
  Zap,
  Shield,
  HelpCircle,
  Database,
  Globe,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Key,
  Server,
  Info,
} from 'lucide-react';

interface TestResult {
  ok: boolean;
  model: string;
  message: string;
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontWeight: 500,
          fontSize: '0.9rem',
          color: 'var(--text-primary)',
          gap: '0.75rem',
        }}
      >
        {question}
        {open ? <ChevronUp size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} /> : <ChevronDown size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />}
      </button>
      {open && (
        <div
          className="fade-in"
          style={{
            paddingBottom: '1rem',
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
          }}
          dangerouslySetInnerHTML={{ __html: answer }}
        />
      )}
    </div>
  );
}

const FAQ_ITEMS = [
  {
    question: 'How do I set up my API key?',
    answer:
      'Create a file called <code style="background:#F4F4F5;padding:2px 6px;border-radius:4px;font-family:monospace">.env.local</code> in the root of the taskora project folder. Add this line:<br/><br/><code style="background:#F4F4F5;padding:8px 12px;border-radius:6px;display:block;font-family:monospace">GEMINI_API_KEY=your_api_key_here</code><br/>Then restart the development server. Get your API key from <a href="https://aistudio.google.com" target="_blank" style="color:var(--primary);text-decoration:underline">Google AI Studio</a>.',
  },
  {
    question: 'Which model should I use?',
    answer:
      'The default model is <code style="background:#F4F4F5;padding:2px 6px;border-radius:4px;font-family:monospace">gemini-3.5-flash-lite</code>. You can override this in <code style="background:#F4F4F5;padding:2px 6px;border-radius:4px;font-family:monospace">.env.local</code> by setting <code style="background:#F4F4F5;padding:2px 6px;border-radius:4px;font-family:monospace">GEMMA_MODEL=your-model-id</code>. Use the AI connection test to verify your model is accessible.',
  },
  {
    question: 'I see a "quota exceeded" or 429 error',
    answer:
      'Your Google AI API quota has been reached. Options: (1) Wait for quota to reset (usually hourly or daily), (2) Upgrade your Google AI plan, or (3) Use a different project with available quota.',
  },
  {
    question: 'The model returns invalid JSON or fails validation',
    answer:
      'This can happen if the model response is unexpected. Taskora automatically retries up to 2 times on transient errors. If it keeps failing, try a different model or simplify your message. Ensure your message is a business communication, not an arbitrary question.',
  },
  {
    question: 'I get a network error or connection timeout',
    answer:
      'Check your internet connection. Taskora retries transient failures with exponential backoff (up to 2 retries). If errors persist, Google AI servers may be temporarily overloaded — try again in a few minutes.',
  },
  {
    question: 'Authentication failed / Invalid API key',
    answer:
      'Your API key is incorrect or expired. Double-check it in <code style="background:#F4F4F5;padding:2px 6px;border-radius:4px;font-family:monospace">.env.local</code>. The key must start with <code>AIza</code> and must NOT be prefixed with <code>NEXT_PUBLIC_</code> (that would expose it to the browser).',
  },
  {
    question: 'Where is my data stored?',
    answer:
      'All records are stored locally in a <code style="background:#F4F4F5;padding:2px 6px;border-radius:4px;font-family:monospace">data/records.json</code> file on your machine. This is a local hackathon demo — data is not shared across machines or users, and it is not stored in any cloud or database.',
  },
  {
    question: 'Is my API key secure?',
    answer:
      'Yes. Taskora never exposes the API key to the browser. It lives only in <code style="background:#F4F4F5;padding:2px 6px;border-radius:4px;font-family:monospace">.env.local</code>, which is excluded from Git. All AI calls happen server-side through Next.js API routes.',
  },
];

export default function SettingsPage() {
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/ai-test');
      const data = await res.json();
      setTestResult(data.data);
    } catch {
      setTestResult({
        ok: false,
        model: 'unknown',
        message: 'Network error: Could not reach the test endpoint.',
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings & Help</h1>
          <p className="page-subtitle">Configure Taskora, test your AI connection, and learn how it works</p>
        </div>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* AI Connection Status */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Zap size={20} color="var(--primary)" />
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>AI Connection</h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '1.25rem',
            }}
          >
            <div className="card-sm" style={{ background: 'var(--bg-main)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '0.25rem' }}>
                <Server size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }} />
                AI Provider
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Google Gen AI</div>
            </div>
            <div className="card-sm" style={{ background: 'var(--bg-main)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '0.25rem' }}>
                <Zap size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }} />
                Configured Model
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', fontFamily: 'monospace' }}>
                {process.env.NEXT_PUBLIC_DISPLAY_MODEL ?? 'gemini-3.5-flash-lite'}
              </div>
            </div>
            <div className="card-sm" style={{ background: 'var(--bg-main)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '0.25rem' }}>
                <Key size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }} />
                API Key
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                Server-side only <span style={{ color: '#16A34A', fontSize: '0.75rem' }}>✓ Secure</span>
              </div>
            </div>
          </div>

          <button
            className="btn btn-secondary"
            onClick={testConnection}
            disabled={testing}
          >
            {testing ? (
              <>
                <div className="spinner spinner-sm" />
                Testing connection...
              </>
            ) : (
              <>
                <Zap size={16} />
                Test AI Connection
              </>
            )}
          </button>

          {testResult && (
            <div
              className={`alert ${testResult.ok ? 'alert-success' : 'alert-error'} fade-in`}
              style={{ marginTop: '1rem' }}
            >
              {testResult.ok ? <CheckCircle size={18} /> : <XCircle size={18} />}
              <div>
                <strong>{testResult.ok ? 'Connected!' : 'Connection failed'}</strong>
                <div style={{ marginTop: '0.25rem', fontSize: '0.8125rem' }}>{testResult.message}</div>
                {testResult.model && (
                  <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', fontFamily: 'monospace', opacity: 0.8 }}>
                    Model: {testResult.model}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* API Key Setup */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Key size={20} color="var(--primary)" />
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>API Key Configuration</h2>
          </div>

          <div className="alert alert-info" style={{ marginBottom: '1.25rem' }}>
            <Info size={18} style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.875rem' }}>
              Your API key is never sent to the browser. It stays on the server in <code style={{ background: 'rgba(124,58,237,0.1)', padding: '2px 6px', borderRadius: '4px' }}>.env.local</code>.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <span style={{ background: 'var(--primary)', color: '#fff', width: '1.5rem', height: '1.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>1</span>
              <div>
                Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Google AI Studio</a> and create a free API key.
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <span style={{ background: 'var(--primary)', color: '#fff', width: '1.5rem', height: '1.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>2</span>
              <div>
                Create a file named <code style={{ background: '#F4F4F5', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>.env.local</code> in the project root with:
                <div style={{ background: '#18181B', color: '#A78BFA', borderRadius: '6px', padding: '0.75rem 1rem', marginTop: '0.5rem', fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                  GEMINI_API_KEY=AIza...your_key<br/>
                  GEMMA_MODEL=gemini-3.5-flash-lite
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <span style={{ background: 'var(--primary)', color: '#fff', width: '1.5rem', height: '1.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>3</span>
              <div>Restart the dev server: <code style={{ background: '#F4F4F5', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>npm run dev</code></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <span style={{ background: 'var(--primary)', color: '#fff', width: '1.5rem', height: '1.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>4</span>
              <div>Click "Test AI Connection" above to verify everything works.</div>
            </div>
          </div>
        </div>

        {/* Supported Languages */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Globe size={20} color="var(--primary)" />
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Supported Languages</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {[
              { flag: '🇬🇧', name: 'English', desc: 'Full support' },
              { flag: '🇵🇰', name: 'Urdu (اردو)', desc: 'Arabic script messages' },
              { flag: '✍️', name: 'Roman Urdu', desc: 'Urdu in Latin script' },
              { flag: '🔍', name: 'Auto-detect', desc: 'Let AI identify language' },
            ].map(({ flag, name, desc }) => (
              <div key={name} className="card-sm" style={{ background: 'var(--bg-main)', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>{flag}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{name}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy & Storage */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Shield size={20} color="var(--primary)" />
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Privacy & Data Storage</h2>
          </div>
          <div className="alert alert-warning" style={{ marginBottom: '1.25rem' }}>
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.875rem' }}>
              <strong>Local storage only.</strong> Records are saved to <code style={{ background: 'rgba(217,119,6,0.1)', padding: '2px 4px', borderRadius: '3px', fontFamily: 'monospace' }}>data/records.json</code> on your local machine. This is suitable for a single-machine hackathon demo.
            </div>
          </div>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem', color: 'var(--text-secondary)', listStyle: 'none' }}>
            {[
              '✓ No cloud database — all data stays on your machine',
              '✓ API key is never exposed to the browser',
              '✓ No user authentication or multi-user isolation',
              '✓ .env.local and data/ directories are excluded from Git',
              '⚠ Not suitable for concurrent serverless production deployments',
              '⚠ Not suitable for multi-user or shared environments',
            ].map((item) => (
              <li key={item} style={{ color: item.startsWith('⚠') ? 'var(--warning)' : 'var(--text-secondary)' }}>{item}</li>
            ))}
          </ul>
        </div>

        {/* FAQ / Troubleshooting */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <HelpCircle size={20} color="var(--primary)" />
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Troubleshooting & FAQ</h2>
          </div>
          <div>
            {FAQ_ITEMS.map((item) => (
              <FaqItem key={item.question} {...item} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
