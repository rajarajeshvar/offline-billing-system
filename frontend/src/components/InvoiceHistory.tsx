import React, { useState } from 'react';
import { FileText, Printer, Search, Calendar, User, DollarSign } from 'lucide-react';
import { Invoice } from '../types';

interface InvoiceHistoryProps {
  invoices: Invoice[];
  onViewInvoice: (invoice: Invoice) => void;
}

export const InvoiceHistory: React.FC<InvoiceHistoryProps> = ({ invoices, onViewInvoice }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filtered = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.customerName && inv.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (inv.customerPhone && inv.customerPhone.includes(searchTerm));

    const matchesStatus = statusFilter === 'ALL' || inv.paymentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalSalesRevenue = invoices
    .filter((inv) => inv.invoiceStatus !== 'CANCELLED')
    .reduce((sum, inv) => sum + inv.grandTotal, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Sales Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Invoices Generated</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
            {invoices.length}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cumulative Gross Billing</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }} className="mono">
            ₹{totalSalesRevenue.toFixed(2)}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Settled / Paid Invoices</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
            {invoices.filter((i) => i.paymentStatus === 'PAID').length}
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ position: 'relative', width: '380px' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} size={18} />
          <input
            type="text"
            className="input-field"
            placeholder="Search by Invoice No, Customer or Phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '38px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {['ALL', 'PAID', 'PARTIALLY_PAID', 'UNPAID'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className="btn"
              style={{
                background: statusFilter === status ? '#000000' : '#ffffff',
                color: statusFilter === status ? '#ffffff' : 'var(--text-secondary)',
                border: statusFilter === status ? '1px solid #000000' : '1px solid #e4e4e7',
                fontSize: '0.8rem',
                fontWeight: 700,
                padding: '6px 14px',
              }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Invoice Number</th>
                <th>Date & Time</th>
                <th>Customer Name</th>
                <th style={{ textAlign: 'center' }}>Items</th>
                <th style={{ textAlign: 'right' }}>Taxable Amt</th>
                <th style={{ textAlign: 'right' }}>Grand Total</th>
                <th>Payment Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No invoices found.
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }} className="mono">
                        {inv.invoiceNumber}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Biller: {inv.employeeName}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {new Date(inv.invoiceDate).toLocaleString()}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{inv.customerName || 'Walk-in Customer'}</div>
                      {inv.customerPhone && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inv.customerPhone}</div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }} className="mono">
                      {inv.items.length}
                    </td>
                    <td style={{ textAlign: 'right' }} className="mono">
                      ₹{inv.taxableAmount.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--text-primary)' }} className="mono">
                      ₹{inv.grandTotal.toFixed(2)}
                    </td>
                    <td>
                      <span className={`badge badge-${inv.paymentStatus === 'PAID' ? 'paid' : inv.paymentStatus === 'PARTIALLY_PAID' ? 'partial' : 'unpaid'}`}>
                        {inv.paymentStatus}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => onViewInvoice(inv)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                      >
                        <Printer size={14} /> View / Print
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
