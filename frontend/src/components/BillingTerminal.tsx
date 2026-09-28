import React, { useState, useRef, useEffect } from 'react';
import { Search, Barcode, Plus, Trash2, User, CreditCard, DollarSign, Smartphone, ShoppingBag, AlertCircle, Check } from 'lucide-react';
import { Customer, Invoice, InvoiceItem, Payment, Product } from '../types';
import { AuthSession } from '../api';

interface CartItem extends InvoiceItem {
  availableStock: number;
}

interface BillingTerminalProps {
  products: Product[];
  customers: Customer[];
  onCompleteSale: (invoice: Omit<Invoice, 'id' | 'invoiceNumber'>, payments: Payment[]) => void;
  currentSession?: AuthSession | null;
  onAddCustomer?: (customer: Omit<Customer, 'id' | 'isActive'>) => Promise<Customer | null | void> | void;
}

export const BillingTerminal: React.FC<BillingTerminalProps> = ({
  products,
  customers,
  onCompleteSale,
  currentSession,
  onAddCustomer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  // Quick Customer Registration state
  const [isNewCustModalOpen, setIsNewCustModalOpen] = useState(false);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custGstin, setCustGstin] = useState('');
  const [custCity, setCustCity] = useState('Bengaluru');
  const [custError, setCustError] = useState<string | null>(null);
  const [isSavingCust, setIsSavingCust] = useState(false);
  const [discountPercentOverall, setDiscountPercentOverall] = useState<number>(0);
  const [roundOffManual, setRoundOffManual] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER'>('CASH');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [paymentRef, setPaymentRef] = useState('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Focus barcode input on mount for instant hardware barcode scanner operation
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  const handleQuickAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim()) {
      setCustError('Customer name is required');
      return;
    }

    setIsSavingCust(true);
    setCustError(null);
    try {
      const payload: Omit<Customer, 'id' | 'isActive'> = {
        customerCode: `CUST-${String(customers.length + 1).padStart(3, '0')}`,
        name: custName.trim(),
        phone: custPhone.trim() || undefined,
        email: custEmail.trim() || undefined,
        city: custCity.trim() || 'Bengaluru',
        state: 'Karnataka',
        stateCode: '29',
        pincode: '560001',
        gstin: custGstin.trim() || undefined,
      };

      if (onAddCustomer) {
        const newCust = await onAddCustomer(payload);
        if (newCust && typeof newCust === 'object' && 'id' in newCust) {
          setSelectedCustomerId(newCust.id);
        }
      }

      setIsNewCustModalOpen(false);
      setCustName('');
      setCustPhone('');
      setCustEmail('');
      setCustGstin('');
    } catch (err: any) {
      setCustError(err.message || 'Failed to register customer');
    } finally {
      setIsSavingCust(false);
    }
  };

  // Filter products for quick search
  const filteredProducts = searchQuery.trim()
    ? products.filter(
        (p) =>
          p.isActive &&
          (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.barcode && p.barcode.includes(searchQuery)))
      )
    : [];

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const matchedProduct = products.find(
      (p) => p.isActive && (p.barcode === barcodeInput.trim() || p.sku.toLowerCase() === barcodeInput.trim().toLowerCase())
    );

    if (matchedProduct) {
      addToCart(matchedProduct);
      setBarcodeInput('');
    } else {
      alert(`No active product found matching barcode/SKU: ${barcodeInput}`);
    }
  };

  const addToCart = (product: Product) => {
    if (product.trackStock && product.currentStock <= 0) {
      alert(`"${product.name}" is completely out of stock!`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (product.trackStock && existing.quantity >= product.currentStock) {
          alert(`Cannot add more than ${product.currentStock} units in stock for ${product.name}`);
          return prev;
        }
        return prev.map((item) =>
          item.productId === product.id
            ? recalculateLineItem({ ...item, quantity: item.quantity + 1 }, product)
            : item
        );
      }

      const initialItem: CartItem = {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        hsnCode: product.hsnCode,
        quantity: 1,
        unitPrice: product.sellingPrice,
        discountPercentage: 0,
        discountAmount: 0,
        taxRate: product.taxRatePercent || 0,
        taxableAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        cessAmount: 0,
        lineTotal: 0,
        availableStock: product.currentStock,
      };

      return [...prev, recalculateLineItem(initialItem, product)];
    });

    setSearchQuery('');
  };

  const updateQuantity = (productId: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    const product = products.find((p) => p.id === productId);
    if (product && product.trackStock && newQty > product.currentStock) {
      alert(`Only ${product.currentStock} units available for ${product.name}`);
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId && product
          ? recalculateLineItem({ ...item, quantity: newQty }, product)
          : item
      )
    );
  };

  const updateDiscount = (productId: number, discountPct: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? recalculateLineItem({ ...item, discountPercentage: Math.max(0, Math.min(100, discountPct)) }, product)
          : item
      )
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const recalculateLineItem = (item: CartItem, product: Product): CartItem => {
    const rawTotal = Number((item.unitPrice * item.quantity).toFixed(2));
    const discountAmt = Number(((rawTotal * item.discountPercentage) / 100).toFixed(2));
    const taxable = Number((rawTotal - discountAmt).toFixed(2));

    const cgstPct = product.cgstRate || (item.taxRate / 2);
    const sgstPct = product.sgstRate || (item.taxRate / 2);

    const cgst = Number(((taxable * cgstPct) / 100).toFixed(2));
    const sgst = Number(((taxable * sgstPct) / 100).toFixed(2));
    const finalLineTotal = Number((taxable + cgst + sgst).toFixed(2));

    return {
      ...item,
      discountAmount: discountAmt,
      taxableAmount: taxable,
      cgstAmount: cgst,
      sgstAmount: sgst,
      lineTotal: finalLineTotal,
    };
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const lineDiscountTotal = cart.reduce((acc, item) => acc + item.discountAmount, 0);
  const taxableTotal = cart.reduce((acc, item) => acc + item.taxableAmount, 0);
  const cgstTotal = cart.reduce((acc, item) => acc + item.cgstAmount, 0);
  const sgstTotal = cart.reduce((acc, item) => acc + item.sgstAmount, 0);
  const rawGrandTotal = taxableTotal + cgstTotal + sgstTotal;
  
  // Calculate round off to nearest rupee
  const calculatedGrandTotal = Math.round(rawGrandTotal);
  const autoRoundOff = Number((calculatedGrandTotal - rawGrandTotal).toFixed(2));
  const grandTotal = calculatedGrandTotal;

  const handleCheckoutClick = () => {
    if (cart.length === 0) {
      alert('Cart is empty! Add products first.');
      return;
    }
    setPaidAmount(grandTotal.toString());
    setIsPaymentModalOpen(true);
  };

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const paid = parseFloat(paidAmount) || 0;
    if (paid < 0) {
      alert('Payment amount cannot be negative.');
      return;
    }

    const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

    const invoicePayload: Omit<Invoice, 'id' | 'invoiceNumber'> = {
      invoiceDate: new Date().toISOString(),
      customerId: selectedCustomer ? selectedCustomer.id : null,
      customerName: selectedCustomer ? selectedCustomer.name : 'Walk-in Customer',
      customerPhone: selectedCustomer?.phone,
      customerGstin: selectedCustomer?.gstin,
      employeeId: currentSession?.userId || 1,
      employeeName: currentSession?.employeeName || 'Active Cashier',
      subtotal: Number(subtotal.toFixed(2)),
      discountTotal: Number(lineDiscountTotal.toFixed(2)),
      taxableAmount: Number(taxableTotal.toFixed(2)),
      cgstTotal: Number(cgstTotal.toFixed(2)),
      sgstTotal: Number(sgstTotal.toFixed(2)),
      igstTotal: 0,
      cessTotal: 0,
      roundOff: autoRoundOff,
      grandTotal: Number(grandTotal.toFixed(2)),
      paymentStatus: paid >= grandTotal ? 'PAID' : paid > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
      invoiceStatus: 'COMPLETED',
      notes: notes,
      items: cart.map(({ availableStock, ...rest }) => rest),
    };

    const paymentRecords: Payment[] = [
      {
        paymentMethod: paymentMethod,
        amount: paid,
        paymentReference: paymentRef || undefined,
        paymentDate: new Date().toISOString(),
      },
    ];

    onCompleteSale(invoicePayload, paymentRecords);
    setIsPaymentModalOpen(false);
    setCart([]);
    setSelectedCustomerId(null);
    setNotes('');
    setPaymentRef('');
    barcodeInputRef.current?.focus();
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '20px', minHeight: 'calc(100vh - 110px)' }}>
      {/* Left Column: Product Selection & Cart */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Top Action Bar: Barcode Input + Search Bar */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', gap: '14px', alignItems: 'center', position: 'relative', zIndex: 30 }}>
          {/* Barcode Scanner Input */}
          <form onSubmit={handleBarcodeSubmit} style={{ flex: '1', display: 'flex', position: 'relative' }}>
            <Barcode style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--accent-blue)' }} size={20} />
            <input
              ref={barcodeInputRef}
              type="text"
              className="input-field mono"
              placeholder="Scan Barcode / Enter SKU and Press Enter..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              style={{ paddingLeft: '40px', borderColor: barcodeInput ? 'var(--accent-blue)' : undefined }}
            />
          </form>

          {/* Product Keyword Search */}
          <div style={{ flex: '1.2', position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} size={18} />
            <input
              type="text"
              className="input-field"
              placeholder="Search product by name, brand, or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />

            {/* Quick Search Dropdown Results */}
            {searchQuery.trim() && (
              <div style={{
                position: 'absolute',
                top: '48px',
                left: 0,
                right: 0,
                background: '#182234',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 20px 35px -5px rgba(0, 0, 0, 0.8), 0 10px 15px -5px rgba(0, 0, 0, 0.6)',
                zIndex: 100,
                maxHeight: '340px',
                overflowY: 'auto'
              }}>
                {filteredProducts.length === 0 ? (
                  <div style={{ padding: '14px', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                    No products matching "{searchQuery}"
                  </div>
                ) : (
                  filteredProducts.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => addToCart(p)}
                      style={{
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        cursor: 'pointer',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{p.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          SKU: <span className="mono">{p.sku}</span> | GST: {p.taxRatePercent}% | Stock:{' '}
                          <span style={{ color: p.currentStock <= p.minimumStock ? 'var(--accent-rose)' : 'var(--accent-emerald)', fontWeight: 600 }}>
                            {p.currentStock} {p.unitSymbol}
                          </span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: 'var(--accent-blue)', fontSize: '0.95rem' }}>
                          ₹{p.sellingPrice.toFixed(2)}
                        </div>
                        <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>+ Add Item</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cart Line Items Table */}
        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
          <div style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingBag size={18} color="var(--accent-blue)" />
              <strong style={{ fontSize: '0.95rem' }}>Billed Items ({cart.length})</strong>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                style={{ background: 'transparent', border: 'none', color: 'var(--accent-rose)', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Clear All
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {cart.length === 0 ? (
              <div style={{ height: '350px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <Barcode size={48} strokeWidth={1.2} style={{ marginBottom: '12px', opacity: 0.5 }} />
                <p style={{ fontWeight: 600 }}>Cart is empty</p>
                <p style={{ fontSize: '0.8rem' }}>Scan a barcode or use the search bar above to begin billing.</p>
              </div>
            ) : (
              <div className="custom-table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Item Description</th>
                      <th style={{ textAlign: 'right' }}>Unit Price</th>
                      <th style={{ textAlign: 'center' }}>Qty</th>
                      <th style={{ textAlign: 'center' }}>Disc %</th>
                      <th style={{ textAlign: 'right' }}>GST</th>
                      <th style={{ textAlign: 'right' }}>Total (₹)</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item, idx) => (
                      <tr key={item.productId}>
                        <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#fff' }}>{item.productName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <span className="mono">{item.sku}</span> | HSN: {item.hsnCode || 'N/A'}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }} className="mono">
                          ₹{item.unitPrice.toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                              style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: '#fff', cursor: 'pointer' }}
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={item.availableStock}
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 1)}
                              style={{ width: '45px', textAlign: 'center', padding: '3px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', color: '#fff' }}
                            />
                            <button
                              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: '#fff', cursor: 'pointer' }}
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discountPercentage}
                            onChange={(e) => updateDiscount(item.productId, parseFloat(e.target.value) || 0)}
                            style={{ width: '50px', textAlign: 'center', padding: '3px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', color: '#fff' }}
                          />
                        </td>
                        <td style={{ textAlign: 'right', fontSize: '0.8rem' }}>
                          <div>{item.taxRate}%</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            (₹{(item.cgstAmount + item.sgstAmount).toFixed(2)})
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }} className="mono">
                          ₹{item.lineTotal.toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => removeFromCart(item.productId)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer' }}
                            title="Remove item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Customer Selection & Payment Summary */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Customer Box */}
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={18} color="var(--accent-blue)" />
              <strong style={{ fontSize: '0.95rem' }}>Customer Details</strong>
            </div>
            <button
              type="button"
              onClick={() => {
                setCustError(null);
                setIsNewCustModalOpen(true);
              }}
              className="btn btn-secondary"
              style={{
                padding: '4px 10px',
                fontSize: '0.75rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(59, 130, 246, 0.15)',
                borderColor: 'rgba(59, 130, 246, 0.3)',
                color: '#60a5fa',
              }}
              title="Quickly Register New Customer"
            >
              <Plus size={13} />
              <span>+ Add Customer</span>
            </button>
          </div>
          <select
            className="input-field"
            value={selectedCustomerId || ''}
            onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Walk-in Retail Customer (Anonymous)</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.phone ? `(${c.phone})` : ''} {c.gstin ? `[GSTIN: ${c.gstin}]` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Invoice Summary Card */}
        <div className="glass-panel" style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', color: '#fff', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              Financial Breakdown
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Subtotal (Items):</span>
                <span className="mono">₹{subtotal.toFixed(2)}</span>
              </div>

              {lineDiscountTotal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-rose)' }}>
                  <span>Discount Total:</span>
                  <span className="mono">-₹{lineDiscountTotal.toFixed(2)}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Taxable Value:</span>
                <span className="mono">₹{taxableTotal.toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>CGST:</span>
                <span className="mono">₹{cgstTotal.toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>SGST:</span>
                <span className="mono">₹{sgstTotal.toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <span>Round Off:</span>
                <span className="mono">{autoRoundOff >= 0 ? `+₹${autoRoundOff.toFixed(2)}` : `-₹${Math.abs(autoRoundOff).toFixed(2)}`}</span>
              </div>

              <div style={{ borderBottom: '1px dashed var(--border-color)', margin: '6px 0' }} />

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                background: 'rgba(59, 130, 246, 0.1)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(59, 130, 246, 0.25)'
              }}>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>TOTAL PAYABLE:</span>
                <span className="mono" style={{ fontWeight: 800, fontSize: '1.45rem', color: 'var(--accent-blue)' }}>
                  ₹{grandTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Checkout CTA */}
          <div style={{ marginTop: '20px' }}>
            <button
              onClick={handleCheckoutClick}
              disabled={cart.length === 0}
              className="btn btn-success"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '1rem',
                opacity: cart.length === 0 ? 0.5 : 1,
                cursor: cart.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              <CreditCard size={20} /> Collect Payment & Generate Invoice
            </button>
          </div>
        </div>
      </div>

      {/* Payment Settlement Modal */}
      {isPaymentModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px', padding: '24px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px', color: '#fff' }}>
              Payment Settlement
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Select payment method to complete invoice generation.
            </p>

            <form onSubmit={handleProcessPayment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Payment Method Selector */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                  PAYMENT TENDER
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  {[
                    { id: 'CASH', label: 'Cash Tender', icon: DollarSign },
                    { id: 'UPI', label: 'UPI / QR Scan', icon: Smartphone },
                    { id: 'CARD', label: 'Card Swipe', icon: CreditCard },
                    { id: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Check },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = paymentMethod === m.id;
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => setPaymentMethod(m.id as any)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '12px',
                          borderRadius: 'var(--radius-md)',
                          border: isSelected ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)',
                          background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-tertiary)',
                          color: isSelected ? '#fff' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.85rem'
                        }}
                      >
                        <Icon size={18} color={isSelected ? 'var(--accent-blue)' : 'var(--text-muted)'} />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  AMOUNT RECEIVED (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="input-field mono"
                  style={{ fontSize: '1.25rem', fontWeight: 700 }}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                />
              </div>

              {/* Reference */}
              {paymentMethod !== 'CASH' && (
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                    TRANSACTION REFERENCE / UTR / CARD AUTH
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. UPI Ref / Txn ID..."
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-success" style={{ flex: 2, padding: '12px' }}>
                  Confirm & Finalize Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Customer Registration Modal for Cashier at Checkout */}
      {isNewCustModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={18} color="#60a5fa" />
                <span>Quick Customer Registration</span>
              </h2>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Add a customer and immediately apply them to the current invoice.
            </p>

            {custError && (
              <div style={{ marginBottom: '14px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.8rem' }}>
                {custError}
              </div>
            )}

            <form onSubmit={handleQuickAddCustomerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px', fontWeight: 600 }}>
                  CUSTOMER NAME *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  className="input-field"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px', fontWeight: 600 }}>
                  PHONE NUMBER
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +91 9876543210"
                  className="input-field mono"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px', fontWeight: 600 }}>
                    EMAIL (OPTIONAL)
                  </label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    className="input-field"
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px', fontWeight: 600 }}>
                    CITY
                  </label>
                  <input
                    type="text"
                    placeholder="Bengaluru"
                    className="input-field"
                    value={custCity}
                    onChange={(e) => setCustCity(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px', fontWeight: 600 }}>
                  GSTIN (OPTIONAL FOR B2B)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 29ABCDE1234F1Z5"
                  className="input-field mono"
                  value={custGstin}
                  onChange={(e) => setCustGstin(e.target.value.toUpperCase())}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsNewCustModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  disabled={isSavingCust}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  disabled={isSavingCust}
                >
                  <Check size={16} />
                  <span>{isSavingCust ? 'Registering...' : 'Register & Select'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
