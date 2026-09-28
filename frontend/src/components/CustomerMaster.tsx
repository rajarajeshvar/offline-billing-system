import React, { useState } from 'react';
import { Users, Plus, Search, Phone, Mail, MapPin } from 'lucide-react';
import { Customer } from '../types';

interface CustomerMasterProps {
  customers: Customer[];
  onAddCustomer: (customer: Omit<Customer, 'id' | 'isActive'>) => void;
}

export const CustomerMaster: React.FC<CustomerMasterProps> = ({ customers, onAddCustomer }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [gstin, setGstin] = useState('');

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone && c.phone.includes(searchTerm)) ||
      (c.gstin && c.gstin.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddCustomer({
      customerCode: `CUST-${String(customers.length + 1).padStart(3, '0')}`,
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      city: city.trim(),
      state: 'Karnataka',
      stateCode: '29',
      pincode: '560001',
      gstin: gstin.trim() || undefined,
    });

    setIsModalOpen(false);
    setName('');
    setPhone('');
    setEmail('');
    setGstin('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ position: 'relative', width: '380px' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} size={18} />
          <input
            type="text"
            className="input-field"
            placeholder="Search by customer name, phone, or GSTIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '38px' }}
          />
        </div>

        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <Plus size={18} /> Register New Customer
        </button>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Customer Code</th>
                <th>Customer Name</th>
                <th>Contact Phone</th>
                <th>Email Address</th>
                <th>Location</th>
                <th>GSTIN (Tax ID)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td className="mono" style={{ color: 'var(--text-secondary)' }}>
                    {c.customerCode || `CUST-00${c.id}`}
                  </td>
                  <td>
                    <strong style={{ color: '#fff' }}>{c.name}</strong>
                  </td>
                  <td>
                    {c.phone ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} className="mono">
                        <Phone size={14} color="var(--accent-blue)" /> {c.phone}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>N/A</span>
                    )}
                  </td>
                  <td>{c.email || 'N/A'}</td>
                  <td>
                    {c.city}, {c.state || 'Karnataka'}
                  </td>
                  <td className="mono" style={{ color: c.gstin ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                    {c.gstin || 'Unregistered B2C'}
                  </td>
                  <td>
                    <span className="badge badge-paid">Active</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Customer Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px', padding: '24px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', marginBottom: '16px' }}>
              Register Customer Account
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  CUSTOMER / BUSINESS NAME *
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="e.g. Ramesh Kumar / ABC Trading"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  MOBILE / PHONE
                </label>
                <input
                  type="text"
                  className="input-field mono"
                  placeholder="e.g. 9845012345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="e.g. ramesh@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  GSTIN (OPTIONAL FOR B2B INVOICES)
                </label>
                <input
                  type="text"
                  className="input-field mono"
                  placeholder="e.g. 29ABCDE1234F1Z5"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
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
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
