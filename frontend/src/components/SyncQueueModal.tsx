import React, { useState } from 'react';
import { X, RefreshCw, AlertTriangle, CheckCircle2, Clock, Trash2, ArrowUpRight } from 'lucide-react';
import { QueuedOfflineInvoice, clearSyncedInvoices } from '../syncQueue';

interface SyncQueueModalProps {
  queue: QueuedOfflineInvoice[];
  isSyncing: boolean;
  onSyncAll: () => Promise<void>;
  onClose: () => void;
  onRefreshQueue: () => void;
}

export const SyncQueueModal: React.FC<SyncQueueModalProps> = ({
  queue,
  isSyncing,
  onSyncAll,
  onClose,
  onRefreshQueue,
}) => {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED'>('ALL');

  const pendingCount = queue.filter((q) => q.status === 'PENDING' || q.status === 'FAILED').length;
  const resolvedCount = queue.filter((q) => q.status === 'SYNCED' || q.status === 'CONFLICT_RESOLVED').length;
  const conflictCount = queue.filter((q) => q.stockDeficitDetected).length;

  const filteredQueue = queue.filter((item) => {
    if (activeFilter === 'PENDING') return item.status === 'PENDING' || item.status === 'FAILED' || item.status === 'SYNCING';
    if (activeFilter === 'RESOLVED') return item.status === 'SYNCED' || item.status === 'CONFLICT_RESOLVED';
    return true;
  });

  const handleClear = () => {
    clearSyncedInvoices();
    onRefreshQueue();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '20px',
      }}
    >
      <div
        className="card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '960px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#fafafa',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Offline Sync Queue & Reconciliation
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Reconciles sales made while disconnected into PostgreSQL with conflict resolution
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Status Metrics Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            padding: '16px 24px',
            background: '#fafafa',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div style={{ background: 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total In Queue</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{queue.length}</div>
          </div>
          <div style={{ background: 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pending Sync</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{pendingCount}</div>
          </div>
          <div style={{ background: 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Reconciled to DB</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{resolvedCount}</div>
          </div>
          <div style={{ background: 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Stock Deficit Conflicts</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: conflictCount > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              {conflictCount}
            </div>
          </div>
        </div>

        {/* Toolbar & Filter */}
        <div
          style={{
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-color)',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`btn btn-secondary ${activeFilter === 'ALL' ? 'active' : ''}`}
              style={{
                fontSize: '0.8rem',
                padding: '6px 12px',
                background: activeFilter === 'ALL' ? '#000000' : 'var(--bg-tertiary)',
                color: activeFilter === 'ALL' ? '#ffffff' : 'var(--text-secondary)',
                border: activeFilter === 'ALL' ? '1px solid #000000' : '1px solid var(--border-color)',
              }}
            >
              All ({queue.length})
            </button>
            <button
              onClick={() => setActiveFilter('PENDING')}
              className={`btn btn-secondary ${activeFilter === 'PENDING' ? 'active' : ''}`}
              style={{
                fontSize: '0.8rem',
                padding: '6px 12px',
                background: activeFilter === 'PENDING' ? '#000000' : 'var(--bg-tertiary)',
                color: activeFilter === 'PENDING' ? '#ffffff' : 'var(--text-secondary)',
                border: activeFilter === 'PENDING' ? '1px solid #000000' : '1px solid var(--border-color)',
              }}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setActiveFilter('RESOLVED')}
              className={`btn btn-secondary ${activeFilter === 'RESOLVED' ? 'active' : ''}`}
              style={{
                fontSize: '0.8rem',
                padding: '6px 12px',
                background: activeFilter === 'RESOLVED' ? '#000000' : 'var(--bg-tertiary)',
                color: activeFilter === 'RESOLVED' ? '#ffffff' : 'var(--text-secondary)',
                border: activeFilter === 'RESOLVED' ? '1px solid #000000' : '1px solid var(--border-color)',
              }}
            >
              Synced ({resolvedCount})
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleClear}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Trash2 size={14} /> Clear Synced
            </button>
            <button
              onClick={onSyncAll}
              disabled={isSyncing || pendingCount === 0}
              className="btn btn-primary"
              style={{ fontSize: '0.8rem', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Synchronizing...' : 'Sync Pending to PostgreSQL'}
            </button>
          </div>
        </div>

        {/* Queue Items Table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {filteredQueue.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <Clock size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p style={{ margin: 0, fontWeight: 500 }}>No offline invoices in this view.</p>
              <p style={{ fontSize: '0.8rem', margin: '4px 0 0 0' }}>
                Invoices generated while offline will be securely queued here until reconnected.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredQueue.map((item) => (
                <div
                  key={item.clientOfflineId}
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="mono" style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                        {item.offlineInvoiceNumber}
                      </span>
                      {item.serverInvoiceNumber && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: 'var(--text-secondary)',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                          }}
                        >
                          <ArrowUpRight size={14} /> Assigned Server ID: {item.serverInvoiceNumber}
                        </span>
                      )}
                    </div>
                    <div>
                      {item.status === 'PENDING' && (
                        <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                          <Clock size={12} /> Pending Sync
                        </span>
                      )}
                      {item.status === 'SYNCING' && (
                        <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                          <RefreshCw size={12} className="animate-spin" /> Syncing...
                        </span>
                      )}
                      {item.status === 'SYNCED' && (
                        <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                          <CheckCircle2 size={12} /> Synced to PostgreSQL
                        </span>
                      )}
                      {item.status === 'CONFLICT_RESOLVED' && (
                        <span className="badge" style={{ fontSize: '0.75rem', background: '#f4f4f5', color: '#09090b', border: '1px solid #e4e4e7' }}>
                          <AlertTriangle size={12} /> Conflict Reconciled
                        </span>
                      )}
                      {item.status === 'FAILED' && (
                        <span className="badge badge-danger" style={{ fontSize: '0.75rem' }}>
                          <AlertTriangle size={12} /> Sync Failed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Conflict Notice if Stock Deficit */}
                  {item.conflictMessage && (
                    <div
                      style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '0.8rem',
                        color: '#991b1b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <AlertTriangle size={16} />
                      <span>{item.conflictMessage}</span>
                    </div>
                  )}

                  {/* Item Details */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <div>
                      <span>Customer: <strong style={{ color: 'var(--text-primary)' }}>{item.customerName || 'Walk-in'}</strong></span>
                      <span style={{ margin: '0 8px' }}>•</span>
                      <span>Items: <strong style={{ color: 'var(--text-primary)' }}>{item.items.length}</strong></span>
                      <span style={{ margin: '0 8px' }}>•</span>
                      <span>Offline Time: {new Date(item.offlineTimestamp).toLocaleTimeString()}</span>
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      ₹{item.grandTotal.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
