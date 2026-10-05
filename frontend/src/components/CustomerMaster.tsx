import React, { useState } from 'react';
import { Users, Plus, Search, Phone, Mail, MapPin, Building2, User, Percent, History, X, ShoppingBag, Calendar, CheckCircle2 } from 'lucide-react';
import { Customer, CustomerSummary, Invoice } from '../types';
import { fetchCustomerSummary } from '../api';

interface CustomerMasterProps {
  customers: Customer[];
  invoices?: Invoice[];
  onAddCustomer: (customer: Omit<Customer, 'id' | 'isActive'>) => Promise<Customer | null | void> | void;
}

export const CustomerMaster: React.FC<CustomerMasterProps> = ({ customers, invoices = [], onAddCustomer }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'B2C' | 'B2B'>('ALL');
  const [segmentFilter, setSegmentFilter] = useState<'ALL' | 'SMALL' | 'LARGE'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [customerType, setCustomerType] = useState<'B2C' | 'B2B'>('B2C');
  const [customerSegment, setCustomerSegment] = useState<'SMALL' | 'LARGE'>('SMALL');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [state, setState] = useState('Karnataka');
  const [stateCode, setStateCode] = useState('29');
  const [pincode, setPincode] = useState('560001');
  const [gstin, setGstin] = useState('');
  const [gstRegistered, setGstRegistered] = useState(false);
  const [concessionPct, setConcessionPct] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // History Modal State
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<Customer | null>(null);
  const [customerSummary, setCustomerSummary] = useState<CustomerSummary | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const filtered = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone && c.phone.includes(searchTerm)) ||
      (c.gstin && c.gstin.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.companyName && c.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.customerCode && c.customerCode.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = typeFilter === 'ALL' || c.customerType === typeFilter;
    const matchesSegment = segmentFilter === 'ALL' || c.customerSegment === segmentFilter;

    return matchesSearch && matchesType && matchesSegment;
  });

  const handleOpenHistory = async (customer: Customer) => {
    setSelectedCustomerForHistory(customer);
    setIsLoadingHistory(true);
    setCustomerSummary(null);

    try {
      const summary = await fetchCustomerSummary(customer.id);
      if (summary) {
        setCustomerSummary(summary);
      } else {
        // Fallback to client-side derivation from cached invoices
        deriveLocalCustomerSummary(customer);
      }
    } catch {
      deriveLocalCustomerSummary(customer);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const deriveLocalCustomerSummary = (customer: Customer) => {
    const custInvoices = invoices.filter(
      (inv) => inv.customerId === customer.id && inv.invoiceStatus !== 'CANCELLED'
    );
    const totalOrders = custInvoices.length;
    const totalSpent = custInvoices.reduce((acc, inv) => acc + inv.grandTotal, 0);
    const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
    const lastPurchaseDate = custInvoices.length > 0 ? custInvoices[0].invoiceDate : undefined;

    // Frequently purchased products
    const productCounts: Record<number, { name: string; sku: string; qty: number; count: number }> = {};
    custInvoices.forEach((inv) => {
      inv.items.forEach((item) => {
        if (!productCounts[item.productId]) {
          productCounts[item.productId] = {
            name: item.productName,
            sku: item.sku,
            qty: 0,
            count: 0,
          };
        }
        productCounts[item.productId].qty += item.quantity;
        productCounts[item.productId].count += 1;
      });
    });

    const frequentlyPurchasedProducts = Object.entries(productCounts)
      .map(([idStr, val]) => ({
        productId: Number(idStr),
        productName: val.name,
        sku: val.sku,
        totalQuantity: val.qty,
        purchaseCount: val.count,
      }))
      .sort((a, b) => b.purchaseCount - a.purchaseCount)
      .slice(0, 5);

    setCustomerSummary({
      customer,
      totalOrders,
      totalSpent,
      averageOrderValue,
      lastPurchaseDate,
      isReturningCustomer: totalOrders > 0,
      recentInvoices: custInvoices.slice(0, 5).map((inv) => ({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        grandTotal: inv.grandTotal,
        paymentStatus: inv.paymentStatus,
        invoiceStatus: inv.invoiceStatus,
        itemCount: inv.items.length,
      })),
      frequentlyPurchasedProducts,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Customer or business name is required.');
      return;
    }

    if (customerType === 'B2B' && gstRegistered && (!gstin.trim() || gstin.trim().length !== 15)) {
      setFormError('A valid 15-character GSTIN is required for GST-registered B2B customers.');
      return;
    }

    try {
      await onAddCustomer({
        customerCode: `CUST-${String(customers.length + 1).padStart(4, '0')}`,
        customerType,
        customerSegment,
        name: name.trim(),
        companyName: companyName.trim() || undefined,
        contactPerson: contactPerson.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        addressLine1: addressLine1.trim() || undefined,
        city: city.trim() || 'Bengaluru',
        state: state.trim() || 'Karnataka',
        stateCode: stateCode.trim() || '29',
        pincode: pincode.trim() || '560001',
        gstin: gstin.trim().toUpperCase() || undefined,
        gstRegistered,
        defaultDiscountPercentage: Number(concessionPct || 0),
        notes: notes.trim() || undefined,
      });

      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save customer');
    }
  };

  const resetForm = () => {
    setName('');
    setCompanyName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setAddressLine1('');
    setGstin('');
    setGstRegistered(false);
    setConcessionPct(0);
    setNotes('');
    setCustomerType('B2C');
    setCustomerSegment('SMALL');
    setFormError(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Search, Filters & Action Bar */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '320px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '320px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} size={18} />
            <input
              type="text"
              className="input-field"
              placeholder="Search by name, phone, GSTIN, code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
          </div>

          {/* Type Filter Buttons */}
          <div style={{ display: 'inline-flex', background: '#f4f4f5', borderRadius: '8px', padding: '3px', border: '1px solid #e4e4e7' }}>
            {(['ALL', 'B2C', 'B2B'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  background: typeFilter === t ? '#000000' : 'transparent',
                  color: typeFilter === t ? '#ffffff' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                }}
              >
                {t === 'ALL' ? 'All Types' : t}
              </button>
            ))}
          </div>

          {/* Segment Filter Buttons */}
          <div style={{ display: 'inline-flex', background: '#f4f4f5', borderRadius: '8px', padding: '3px', border: '1px solid #e4e4e7' }}>
            {(['ALL', 'SMALL', 'LARGE'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSegmentFilter(s)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  background: segmentFilter === s ? '#000000' : 'transparent',
                  color: segmentFilter === s ? '#ffffff' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                }}
              >
                {s === 'ALL' ? 'All Segments' : s === 'LARGE' ? 'Large Buyers' : 'Small Buyers'}
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> Register New Customer
        </button>
      </div>

      {/* Customer Registry Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Customer / Business</th>
                <th>Classification</th>
                <th>Concession</th>
                <th>Phone / Contact</th>
                <th>GSTIN (Tax ID)</th>
                <th>Location</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td className="mono" style={{ color: 'var(--text-secondary)' }}>
                    {c.customerCode || `CUST-00${c.id}`}
                  </td>
                  <td>
                    <div>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{c.name}</strong>
                      {c.companyName && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {c.companyName}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    {(() => {
                      const cType = c.customerType || (c.gstin ? 'B2B' : 'B2C');
                      const cSeg = c.customerSegment || (c.gstin ? 'LARGE' : 'SMALL');
                      return (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: '#000000',
                              color: '#ffffff',
                              border: '1px solid #000000',
                            }}
                          >
                            {cType}
                          </span>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: '#f4f4f5',
                              color: '#09090b',
                              border: '1px solid #e4e4e7',
                            }}
                          >
                            {cSeg}
                          </span>
                        </div>
                      );
                    })()}
                  </td>
                  <td>
                    {(c.defaultDiscountPercentage || 0) > 0 ? (
                      <span style={{ color: 'var(--accent-green)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Percent size={14} /> {c.defaultDiscountPercentage}%
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>0%</span>
                    )}
                  </td>
                  <td>
                    {c.phone ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} className="mono">
                        <Phone size={14} color="var(--accent-blue)" /> {c.phone}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>N/A</span>
                    )}
                    {c.contactPerson && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Attn: {c.contactPerson}
                      </div>
                    )}
                  </td>
                  <td className="mono" style={{ color: c.gstin ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                    {c.gstin ? (
                      <span>{c.gstin}</span>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Unregistered</span>
                    )}
                  </td>
                  <td>
                    {c.city || 'Bengaluru'}, {c.state || 'KA'}
                  </td>
                  <td>
                    <button
                      onClick={() => handleOpenHistory(c)}
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      title="View Customer Order & Purchase History"
                    >
                      <History size={14} /> History
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No matching customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Customer Modal (Progressive Disclosure) */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Register Customer Account
              </h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', color: '#f87171', fontSize: '0.85rem', marginBottom: '14px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Type Switcher */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  CUSTOMER TYPE
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => { setCustomerType('B2C'); setGstRegistered(false); }}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: customerType === 'B2C' ? '2px solid var(--accent-green)' : '1px solid var(--border-color)',
                      background: customerType === 'B2C' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-secondary)',
                      color: customerType === 'B2C' ? '#34d399' : 'var(--text-secondary)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <User size={18} /> B2C (Consumer)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCustomerType('B2B'); setGstRegistered(true); }}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: customerType === 'B2B' ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)',
                      background: customerType === 'B2B' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-secondary)',
                      color: customerType === 'B2B' ? '#60a5fa' : 'var(--text-secondary)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <Building2 size={18} /> B2B (Business / Wholesale)
                  </button>
                </div>
              </div>

              {/* Segment Switcher */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  CUSTOMER SEGMENT
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setCustomerSegment('SMALL')}
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      border: customerSegment === 'SMALL' ? '2px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                      background: customerSegment === 'SMALL' ? 'rgba(6, 182, 212, 0.15)' : 'var(--bg-secondary)',
                      color: customerSegment === 'SMALL' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Standard / Small Buyer
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerSegment('LARGE')}
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      border: customerSegment === 'LARGE' ? '2px solid var(--accent-amber, #f59e0b)' : '1px solid var(--border-color)',
                      background: customerSegment === 'LARGE' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-secondary)',
                      color: customerSegment === 'LARGE' ? '#fbbf24' : 'var(--text-secondary)',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Large / Wholesale Buyer
                  </button>
                </div>
              </div>

              {/* Name & Contact */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    {customerType === 'B2B' ? 'LEGAL / BUSINESS NAME *' : 'CUSTOMER NAME *'}
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder={customerType === 'B2B' ? 'e.g. Apex Traders Pvt Ltd' : 'e.g. Rahul Sharma'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    MOBILE PHONE
                  </label>
                  <input
                    type="text"
                    className="input-field mono"
                    placeholder="e.g. 9845012345"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* B2B specific progressive disclosure */}
              {customerType === 'B2B' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        TRADE / BRAND NAME
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="e.g. Apex Wholesale Hub"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        CONTACT PERSON
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="e.g. Vikram Mehta (Purchaser)"
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        GSTIN (15-DIGIT TAX ID)
                      </label>
                      <input
                        type="text"
                        maxLength={15}
                        className="input-field mono"
                        placeholder="29AAACG8976R1ZO"
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        EMAIL ADDRESS
                      </label>
                      <input
                        type="email"
                        className="input-field"
                        placeholder="accounts@apex.in"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      BILLING ADDRESS
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. 102 Industrial Area, Phase II"
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* Commercial Terms / Concession */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    COMMERCIAL CONCESSION (%)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      className="input-field mono"
                      placeholder="0.00"
                      value={concessionPct || ''}
                      onChange={(e) => setConcessionPct(parseFloat(e.target.value) || 0)}
                      style={{ paddingRight: '32px' }}
                    />
                    <Percent size={16} style={{ position: 'absolute', right: '10px', top: '12px', color: 'var(--text-muted)' }} />
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Automatically applied to line items during checkout
                  </span>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    CITY / REGION
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  COMMERCIAL TERMS / NOTES
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Payment due in 15 days; authorized wholesale buyer"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save & Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Purchase History Modal */}
      {selectedCustomerForHistory && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Customer Purchase History
                </h2>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>
                    {selectedCustomerForHistory.name}
                  </span>
                  <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>
                    {selectedCustomerForHistory.customerType} • {selectedCustomerForHistory.customerSegment}
                  </span>
                  {selectedCustomerForHistory.gstin && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }} className="mono">
                      GSTIN: {selectedCustomerForHistory.gstin}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomerForHistory(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {isLoadingHistory ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Loading purchase ledger...
              </div>
            ) : customerSummary ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Metrics Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Orders</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                      {customerSummary.totalOrders}
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Spent</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-green)', marginTop: '4px' }}>
                      ₹{customerSummary.totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Avg Order</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '4px' }}>
                      ₹{customerSummary.averageOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Concession</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fbbf24', marginTop: '4px' }}>
                      {selectedCustomerForHistory.defaultDiscountPercentage || 0}%
                    </div>
                  </div>
                </div>

                {/* Frequently Purchased Products */}
                {customerSummary.frequentlyPurchasedProducts.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Frequently Purchased Products
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {customerSummary.frequentlyPurchasedProducts.map((p) => (
                        <div
                          key={p.productId}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'var(--bg-secondary)',
                            padding: '10px 14px',
                            borderRadius: '6px',
                          }}
                        >
                          <div>
                            <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{p.productName}</strong>
                            <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              SKU: {p.sku}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>
                              {p.totalQuantity} units
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                              ({p.purchaseCount} orders)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Invoices */}
                <div>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Recent Invoices
                  </h3>
                  {customerSummary.recentInvoices.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {customerSummary.recentInvoices.map((inv) => (
                        <div
                          key={inv.invoiceId}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'var(--bg-secondary)',
                            padding: '10px 14px',
                            borderRadius: '6px',
                          }}
                        >
                          <div>
                            <span className="mono" style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>
                              {inv.invoiceNumber}
                            </span>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {new Date(inv.invoiceDate).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })} • {inv.itemCount} items
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                              ₹{inv.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: inv.paymentStatus === 'PAID' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                color: inv.paymentStatus === 'PAID' ? '#34d399' : '#f87171',
                              }}
                            >
                              {inv.paymentStatus}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No prior invoices recorded for this customer yet.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                No transaction records available.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
