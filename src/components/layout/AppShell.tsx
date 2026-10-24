'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Sparkles,
  FileText,
  BarChart3,
  Settings,
  Menu,
  X,
  Zap,
  MessageSquare,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/workspace', label: 'AI Workspace', icon: Sparkles },
  { href: '/records', label: 'Saved Records', icon: FileText },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/chat', label: 'AI Assistant', icon: MessageSquare },
  { href: '/settings', label: 'Settings & Help', icon: Settings },
];

type HealthResponse = {
  success?: boolean;
  data?: {
    status?: string;
    storage?: { type?: string };
  };
};

function AiStatusDot() {
  const [status, setStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [storageType, setStorageType] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health')
      .then(async (r) => {
        const data = await r.json() as HealthResponse;
        if (!cancelled) {
          setStatus(r.ok && data.success ? 'ok' : 'error');
          setStorageType(data.data?.storage?.type ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => { cancelled = true; };
  }, []);

  const colors = {
    checking: 'dot-yellow',
    ok: 'dot-green',
    error: 'dot-red',
  };

  const labels = {
    checking: 'Checking...',
    ok: 'App Online',
    error: 'App Offline',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span className={`dot ${colors[status]}`} />
      <span style={{ fontSize: '0.75rem', color: '#71717A' }}>
        {labels[status]}{status === 'ok' && storageType === 'local-json' ? ' · Local storage' : ''}
      </span>
    </div>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="sidebar-logo-text">
              <span style={{ color: '#A78BFA' }}>⬡</span> Taskora
            </div>
            <div className="sidebar-logo-tagline">Your Business, Organized by AI</div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                color: '#71717A',
                padding: '0.25rem',
                borderRadius: '0.25rem',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <AiStatusDot />
        <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#52525B' }}>
          {storageType === 'local-json' ? 'Local JSON storage · MVP v1.0' : 'Taskora · MVP v1.0'}
        </div>
      </div>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-layout">
      {/* Desktop Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </aside>

      {/* Mobile overlay */}
      <div
        className={`mobile-overlay ${mobileOpen ? 'visible' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Main content */}
      <main className="main-content">
        {/* Mobile header */}
        <header className="mobile-header">
          <button
            onClick={() => setMobileOpen(true)}
            style={{
              color: '#18181B',
              padding: '0.375rem',
              border: '1px solid #E4E4E7',
              borderRadius: '0.375rem',
              background: 'transparent',
              cursor: 'pointer',
            }}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div style={{ fontWeight: 700, fontSize: '1.125rem', color: '#18181B' }}>
            <span style={{ color: '#7C3AED' }}>⬡</span> Taskora
          </div>
          <div style={{ width: 32 }} />
        </header>

        {children}
      </main>
    </div>
  );
}
