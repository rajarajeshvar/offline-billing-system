import React from 'react';
import { Activity, ArrowUpRight, ArrowDownRight, Clock, ShieldCheck } from 'lucide-react';
import { StockMovement } from '../types';

interface StockMovementLedgerProps {
  movements: StockMovement[];
}

export const StockMovementLedger: React.FC<StockMovementLedgerProps> = ({ movements }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Activity size={24} color="var(--accent-blue)" />
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Stock Movement Audit Ledger
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Immutable database audit history of every inward, outward, and retail stock transition.
            </p>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Product Description</th>
                <th>Movement Type</th>
                <th style={{ textAlign: 'right' }}>Before</th>
                <th style={{ textAlign: 'center' }}>Change</th>
                <th style={{ textAlign: 'right' }}>After</th>
                <th>Audit Reason / Reference</th>
                <th>Responsible Operator</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((mov) => {
                const isInward =
                  mov.movementType === 'OPENING' ||
                  mov.movementType === 'PURCHASE' ||
                  mov.movementType === 'ADJUSTMENT_IN' ||
                  mov.movementType === 'RETURN_IN';

                return (
                  <tr key={mov.id}>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }} className="mono">
                      {new Date(mov.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{mov.productName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} className="mono">
                        {mov.sku}
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${isInward ? 'success' : 'danger'}`}>
                        {mov.movementType}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }} className="mono">
                      {mov.quantityBefore}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        fontWeight: 700,
                        color: isInward ? 'var(--accent-emerald)' : 'var(--accent-rose)'
                      }} className="mono">
                        {isInward ? '+' : '-'}{mov.quantity}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }} className="mono">
                      {mov.quantityAfter}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      <div>{mov.reason || 'Standard operational transaction'}</div>
                      {mov.referenceType && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Ref: {mov.referenceType} #{mov.referenceId || 'N/A'}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        @{mov.createdBy}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
