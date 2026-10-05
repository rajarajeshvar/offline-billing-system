import React from 'react';
import { X, Printer, CheckCircle, Download } from 'lucide-react';
import { CompanySetting, Invoice } from '../types';

interface InvoicePrintModalProps {
  invoice: Invoice;
  company: CompanySetting;
  onClose: () => void;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({ invoice, company, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '520px', padding: '0', background: '#ffffff', color: '#111827' }}>
        {/* Header Bar (Hidden in Print) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          background: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          borderTopLeftRadius: 'var(--radius-xl)',
          borderTopRightRadius: 'var(--radius-xl)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={20} color="var(--text-primary)" />
            <strong style={{ fontSize: '1rem' }}>Invoice Generated #{invoice.invoiceNumber}</strong>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Printable Receipt Paper */}
        <div id="thermal-receipt" style={{
          padding: '24px',
          fontFamily: 'Courier New, monospace',
          fontSize: '12px',
          lineHeight: '1.4'
        }}>
          {/* Business Header */}
          <div style={{ textAlign: 'center', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
              {company.companyName}
            </h2>
            {company.legalName && <div style={{ fontSize: '11px' }}>{company.legalName}</div>}
            <div>{company.addressLine1}, {company.city} - {company.pincode}</div>
            <div>GSTIN: <strong>{company.gstin || '29ABCDE1234F1Z5'}</strong> | Phone: {company.phone}</div>
            <div style={{ borderBottom: '1px dashed #111', margin: '8px 0' }} />
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase' }}>TAX INVOICE</h3>
            <div style={{ borderBottom: '1px dashed #111', margin: '8px 0' }} />
          </div>

          {/* Invoice Info */}
          <div style={{ marginBottom: '12px' }}>
            <div><strong>Invoice No:</strong> {invoice.invoiceNumber}</div>
            <div><strong>Date & Time:</strong> {new Date(invoice.invoiceDate).toLocaleString()}</div>
            <div><strong>Customer:</strong> {invoice.customerName || 'Walk-in Retail Buyer'}</div>
            {invoice.customerPhone && <div><strong>Phone:</strong> {invoice.customerPhone}</div>}
            {invoice.customerGstin && <div><strong>GSTIN:</strong> {invoice.customerGstin}</div>}
            <div><strong>Biller / Cashier:</strong> {invoice.employeeName}</div>
          </div>

          <div style={{ borderBottom: '1px solid #111', margin: '8px 0' }} />

          {/* Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '10px' }}>
            <thead>
              <tr style={{ borderBottom: '1px dashed #111' }}>
                <th style={{ paddingBottom: '4px' }}>Item</th>
                <th style={{ textAlign: 'center', paddingBottom: '4px' }}>Qty</th>
                <th style={{ textAlign: 'right', paddingBottom: '4px' }}>Rate</th>
                <th style={{ textAlign: 'right', paddingBottom: '4px' }}>Amt (₹)</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
                <tr key={idx} style={{ verticalAlign: 'top' }}>
                  <td style={{ padding: '4px 0' }}>
                    <div>{item.productName}</div>
                    <div style={{ fontSize: '10px', color: '#555' }}>
                      HSN: {item.hsnCode || 'N/A'} | GST: {item.taxRate}%
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', padding: '4px 0' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right', padding: '4px 0' }}>{item.unitPrice.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', padding: '4px 0' }}>{item.lineTotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ borderBottom: '1px dashed #111', margin: '8px 0' }} />

          {/* Totals */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Item Subtotal:</span>
              <span>₹{invoice.subtotal.toFixed(2)}</span>
            </div>
            {invoice.discountTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#000000', fontWeight: 600 }}>
                <span>Discount Total:</span>
                <span>-₹{invoice.discountTotal.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Taxable Value:</span>
              <span>₹{invoice.taxableAmount.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>CGST Total:</span>
              <span>₹{invoice.cgstTotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>SGST Total:</span>
              <span>₹{invoice.sgstTotal.toFixed(2)}</span>
            </div>
            {invoice.roundOff !== 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Round Off:</span>
                <span>₹{invoice.roundOff.toFixed(2)}</span>
              </div>
            )}
            <div style={{ borderBottom: '1px double #111', margin: '6px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 'bold' }}>
              <span>GRAND TOTAL:</span>
              <span>₹{invoice.grandTotal.toFixed(2)}</span>
            </div>
            <div style={{ borderBottom: '1px double #111', margin: '6px 0' }} />
          </div>

          {/* Payment breakdown */}
          <div style={{ margin: '10px 0' }}>
            <strong>Payment Mode:</strong> {invoice.payments && invoice.payments.length > 0 ? invoice.payments[0].paymentMethod : 'CASH'}
            {invoice.payments && invoice.payments[0]?.paymentReference && (
              <span style={{ fontSize: '11px', display: 'block' }}>Ref: {invoice.payments[0].paymentReference}</span>
            )}
            <div><strong>Status:</strong> {invoice.paymentStatus}</div>
          </div>

          {/* Footer Terms */}
          <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '10px', color: '#444' }}>
            <div>Goods once sold cannot be returned without original receipt.</div>
            <div>Thank you for shopping with us! Have a great day.</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          padding: '16px 20px',
          background: 'var(--bg-tertiary)',
          borderTop: '1px solid var(--border-color)',
          borderBottomLeftRadius: 'var(--radius-xl)',
          borderBottomRightRadius: 'var(--radius-xl)'
        }}>
          <button
            onClick={handlePrint}
            className="btn btn-primary"
            style={{ flex: 1, padding: '12px' }}
          >
            <Printer size={18} /> Print Thermal Receipt
          </button>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '12px 20px' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
