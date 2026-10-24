'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, BarChart3, DollarSign, Package, Printer, RefreshCw, ShoppingBag, TrendingDown, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import type { BusinessRecord } from '@/types';
import { buildReportSummary } from '@/lib/reports';

function formatAmount(amount: number, currency: string) {
  return `${currency === 'Unspecified' ? '' : `${currency} `}${amount.toLocaleString()}`.trim() || '0';
}

function formatQuantity(quantity: number) {
  return quantity.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function ReportsPage() {
  const [records, setRecords] = useState<BusinessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/records');
      const result = await response.json();
      if (result.success) setRecords(result.data);
      else setError(result.error ?? 'Failed to load report data.');
    } catch {
      setError('Network error while loading report data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const report = useMemo(() => buildReportSummary(records), [records]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Business Reports</h1>
          <p className="page-subtitle">Sales, received payments, pending balances, purchases, and stock on hand</p>
        </div>
        <div className="report-actions no-print">
          <button className="btn btn-secondary btn-sm" onClick={() => void loadRecords()} disabled={loading}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => window.print()} disabled={loading || report.transactions.length === 0}>
            <Printer size={14} /> Print Report
          </button>
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '2rem 0' }}>
            <div className="spinner" />
            <span style={{ color: 'var(--text-secondary)' }}>Preparing report...</span>
          </div>
        ) : error ? (
          <div className="alert alert-error">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        ) : (
          <>
            <div className="alert alert-warning report-note">
              <AlertTriangle size={17} />
              <span>
                Stock is calculated from recorded purchases minus sales, matched by item name. Use the same item name on each entry.
                Older records are treated as “Other” until you edit them. Amounts are kept separate by currency.
              </span>
            </div>

            {report.transactions.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-state-icon"><BarChart3 size={28} /></div>
                  <div className="empty-state-title">No sales or purchases to report yet</div>
                  <div className="empty-state-desc">
                    Add a sale or bulk purchase in your next record, or edit an existing record to include its type, amount paid, and quantity.
                  </div>
                  <Link href="/workspace" className="btn btn-primary">Add a Business Record</Link>
                </div>
              </div>
            ) : (
              <>
                <div className="report-heading">
                  <h2>Money Summary</h2>
                  <span>{report.savedRecordCount} saved records</span>
                </div>

                <div className="report-currency-list">
                  {report.currencies.map((summary) => (
                    <section className="card report-currency-card" key={summary.currency}>
                      <h3>{summary.currency} {summary.currency === 'Unspecified' ? 'Currency' : ''}</h3>
                      <div className="report-metrics">
                        <div><span><TrendingUp size={15} /> Sales</span><strong>{formatAmount(summary.sales, summary.currency)}</strong></div>
                        <div><span><DollarSign size={15} /> Received</span><strong className="report-positive">{formatAmount(summary.received, summary.currency)}</strong></div>
                        <div><span><TrendingDown size={15} /> Customer Pending</span><strong className="report-pending">{formatAmount(summary.receivable, summary.currency)}</strong></div>
                        <div><span><ShoppingBag size={15} /> Bulk Purchases</span><strong>{formatAmount(summary.purchases, summary.currency)}</strong></div>
                        <div><span><DollarSign size={15} /> Paid to Suppliers</span><strong className="report-positive">{formatAmount(summary.paidToSuppliers, summary.currency)}</strong></div>
                        <div><span><TrendingDown size={15} /> Purchase Pending</span><strong className="report-pending">{formatAmount(summary.payable, summary.currency)}</strong></div>
                      </div>
                    </section>
                  ))}
                </div>

                <div className="report-heading">
                  <h2><Package size={19} /> Stock Remaining</h2>
                  <span>Bulk purchases − sales</span>
                </div>
                {report.inventory.length === 0 ? (
                  <div className="card report-empty-stock">No quantities recorded yet. Add purchased and sold quantities to see remaining stock.</div>
                ) : (
                  <div className="card report-table-wrap">
                    <table className="report-table">
                      <thead>
                        <tr><th>Item / Work</th><th>Purchased</th><th>Sold</th><th>Remaining Stock</th></tr>
                      </thead>
                      <tbody>
                        {report.inventory.map((item) => (
                          <tr key={item.item.toLocaleLowerCase()}>
                            <td>{item.item}</td>
                            <td>{formatQuantity(item.purchased)}</td>
                            <td>{formatQuantity(item.sold)}</td>
                            <td className={item.remaining < 0 ? 'report-pending' : 'report-positive'}>
                              {formatQuantity(item.remaining)}{item.remaining < 0 ? ' (stock short)' : ''}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="report-heading">
                  <h2>Sales & Purchase Details</h2>
                  <span>{report.transactions.length} transactions</span>
                </div>
                <div className="card report-table-wrap">
                  <table className="report-table">
                    <thead>
                      <tr><th>Date</th><th>Type</th><th>Item / Work</th><th>Customer / Supplier</th><th>Qty</th><th>Total</th><th>Paid / Received</th><th>Pending</th></tr>
                    </thead>
                    <tbody>
                      {report.transactions.map((record) => {
                        const currency = record.currency?.trim().toUpperCase() || 'Unspecified';
                        const total = record.amount ?? 0;
                        const paid = record.amountPaid ?? 0;
                        const pending = Math.max(total - paid, 0);
                        const isSale = record.transactionType === 'sale';
                        return (
                          <tr key={record.id}>
                            <td>{format(new Date(record.createdAt), 'MMM d, yyyy')}</td>
                            <td><span className={`badge ${isSale ? 'badge-green' : 'badge-yellow'}`}>{isSale ? 'Sale' : 'Purchase'}</span></td>
                            <td>{record.task ?? '—'}</td>
                            <td>{record.customer ?? '—'}</td>
                            <td>{record.quantity === null || record.quantity === undefined ? '—' : formatQuantity(record.quantity)}</td>
                            <td>{formatAmount(total, currency)}</td>
                            <td>{formatAmount(paid, currency)}</td>
                            <td className={pending > 0 ? 'report-pending' : 'report-positive'}>{formatAmount(pending, currency)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
