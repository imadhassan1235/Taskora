'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Sparkles,
  FileText,
  TrendingUp,
  Clock,
  Plus,
  ChevronRight,
  DollarSign,
  Users,
  Activity,
} from 'lucide-react';
import type { BusinessRecord } from '@/types';
import { format } from 'date-fns';

function formatAmount(amount: number | null, currency: string | null) {
  if (amount === null) return '—';
  const cur = currency ?? '';
  return `${cur} ${amount.toLocaleString()}`.trim();
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const map: Record<string, string> = {
    high: 'badge-green',
    medium: 'badge-yellow',
    low: 'badge-red',
  };
  return <span className={`badge ${map[confidence] ?? 'badge-gray'}`}>{confidence}</span>;
}

export default function OverviewPage() {
  const [records, setRecords] = useState<BusinessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/records')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setRecords(d.data);
        else setError(d.error);
      })
      .catch(() => setError('Failed to load records'))
      .finally(() => setLoading(false));
  }, []);

  const totalRecords = records.length;
  const totalAmount = records.reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const recentRecords = records.slice(0, 5);
  const uniqueCustomers = new Set(records.map((r) => r.customer).filter(Boolean)).size;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Overview</h1>
          <p className="page-subtitle">Welcome to Taskora — your AI-powered business organizer</p>
        </div>
        <Link href="/workspace" className="btn btn-primary">
          <Plus size={16} />
          New Record
        </Link>
      </div>

      <div className="page-body">
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '2rem 0' }}>
            <div className="spinner" />
            <span style={{ color: 'var(--text-secondary)' }}>Loading dashboard...</span>
          </div>
        ) : error ? (
          <div className="alert alert-error">
            <Activity size={18} />
            <span>{error}</span>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem',
              }}
            >
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'var(--primary-light)' }}>
                  <FileText size={20} color="var(--primary)" />
                </div>
                <div className="stat-value">{totalRecords}</div>
                <div className="stat-label">Total Records</div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#F0FDF4' }}>
                  <DollarSign size={20} color="#16A34A" />
                </div>
                <div className="stat-value" style={{ fontSize: totalAmount > 999999 ? '1.25rem' : '1.75rem' }}>
                  {totalAmount > 0 ? `PKR ${totalAmount.toLocaleString()}` : '—'}
                </div>
                <div className="stat-label">Total Amount Tracked</div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#FFF7ED' }}>
                  <Users size={20} color="#C2410C" />
                </div>
                <div className="stat-value">{uniqueCustomers}</div>
                <div className="stat-label">Unique Customers</div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#EFF6FF' }}>
                  <TrendingUp size={20} color="#1D4ED8" />
                </div>
                <div className="stat-value">{records.filter((r) => r.dueDate || r.dueDateRaw).length}</div>
                <div className="stat-label">Records with Due Dates</div>
              </div>
            </div>

            {/* Empty state */}
            {records.length === 0 && (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <Sparkles size={28} />
                  </div>
                  <div className="empty-state-title">Welcome to Taskora!</div>
                  <div className="empty-state-desc">
                    Start by going to the AI Workspace and entering a business message. Taskora will extract
                    structured information using AI.
                  </div>
                  <Link href="/workspace" className="btn btn-primary">
                    <Sparkles size={16} />
                    Open AI Workspace
                  </Link>
                </div>
              </div>
            )}

            {/* Recent Records */}
            {records.length > 0 && (
              <div className="card">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={18} color="var(--primary)" />
                    <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Recent Records</h2>
                  </div>
                  <Link
                    href="/records"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.875rem',
                      color: 'var(--primary)',
                      fontWeight: 500,
                    }}
                  >
                    View all <ChevronRight size={14} />
                  </Link>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {recentRecords.map((record, idx) => (
                    <div
                      key={record.id}
                      style={{
                        padding: '1rem 0',
                        borderBottom:
                          idx < recentRecords.length - 1 ? '1px solid var(--border)' : 'none',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '1rem',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            marginBottom: '0.25rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {record.customer ?? 'Unknown Customer'}
                        </div>
                        <div
                          style={{
                            fontSize: '0.8125rem',
                            color: 'var(--text-secondary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {record.task ?? 'No task description'}
                        </div>
                        <div style={{ marginTop: '0.375rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <ConfidenceBadge confidence={record.confidence} />
                          <span className="badge badge-gray">{record.language}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          {formatAmount(record.amount, record.currency)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          {format(new Date(record.createdAt), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1rem',
                marginTop: '1.5rem',
              }}
            >
              <Link
                href="/workspace"
                style={{
                  background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.5rem',
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(124,58,237,0.3)';
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = '';
                  (e.currentTarget as HTMLElement).style.boxShadow = '';
                }}
              >
                <Sparkles size={24} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>AI Workspace</div>
                  <div style={{ fontSize: '0.8125rem', opacity: 0.8, marginTop: '0.25rem' }}>
                    Extract business info from messages
                  </div>
                </div>
              </Link>

              <Link
                href="/chat"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.5rem',
                  color: 'var(--text-primary)',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = '';
                  (e.currentTarget as HTMLElement).style.boxShadow = '';
                }}
              >
                <LayoutDashboard size={24} color="var(--primary)" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>AI Assistant</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Chat with your business AI
                  </div>
                </div>
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}
