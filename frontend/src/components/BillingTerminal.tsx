import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  User,
  CreditCard,
  DollarSign,
  Smartphone,
  ShoppingBag,
  Building2,
  Percent,
  History,
  X,
  Sparkles,
  ArrowRight,
  Receipt,
  Layers,
  ChevronRight,
  Package,
  Tag,
  CheckCircle2,
  Clock,
  Laptop,
} from 'lucide-react';
import { Customer, CustomerSummary, Invoice, InvoiceItem, Payment, Product } from '../types';
import { AuthSession, fetchCustomerSummary } from '../api';

interface CartItem extends InvoiceItem {
  availableStock: number;
  baseUnitPrice: number;
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
  // Category & Product Navigation State
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  // Customer Management State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomerSelectorOpen, setIsCustomerSelectorOpen] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<'ALL' | 'B2C' | 'B2B'>('ALL');
  const [customerSegmentFilter, setCustomerSegmentFilter] = useState<'ALL' | 'SMALL' | 'LARGE'>('ALL');

  // Customer History & Returning Customer Recognition State
  const [customerSummary, setCustomerSummary] = useState<CustomerSummary | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Quick Customer Registration State (Progressive Disclosure)
  const [isNewCustModalOpen, setIsNewCustModalOpen] = useState(false);
  const [newCustType, setNewCustType] = useState<'B2C' | 'B2B'>('B2C');
  const [newCustSegment, setNewCustSegment] = useState<'SMALL' | 'LARGE'>('SMALL');
  const [newCustName, setNewCustName] = useState('');
  const [newCustCompanyName, setNewCustCompanyName] = useState('');
  const [newCustContactPerson, setNewCustContactPerson] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustGstin, setNewCustGstin] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustCity, setNewCustCity] = useState('Bengaluru');
  const [newCustConcession, setNewCustConcession] = useState<number>(0);
  const [newCustError, setNewCustError] = useState<string | null>(null);
  const [isSavingCust, setIsSavingCust] = useState(false);

  // Checkout & Payment State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER'>('CASH');
  const [tenderAmount, setTenderAmount] = useState<string>('');
  const [paymentRef, setPaymentRef] = useState('');
  const [notes, setNotes] = useState('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Focus barcode input on mount for instant hardware barcode scanner operation
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Fetch or derive customer summary when customer is selected
  useEffect(() => {
    if (!selectedCustomer) {
      setCustomerSummary(null);
      return;
    }

    let isMounted = true;
    setIsLoadingHistory(true);

    fetchCustomerSummary(selectedCustomer.id)
      .then((summary) => {
        if (isMounted) {
          if (summary) {
            setCustomerSummary(summary);
          } else {
            setCustomerSummary({
              customer: selectedCustomer,
              totalOrders: 0,
              totalSpent: 0,
              averageOrderValue: 0,
              isReturningCustomer: false,
              recentInvoices: [],
              frequentlyPurchasedProducts: [],
            });
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          setCustomerSummary({
            customer: selectedCustomer,
            totalOrders: 0,
            totalSpent: 0,
            averageOrderValue: 0,
            isReturningCustomer: false,
            recentInvoices: [],
            frequentlyPurchasedProducts: [],
          });
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingHistory(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCustomer]);

  // When customer changes, recalculate existing cart line items with customer's concession
  useEffect(() => {
    if (cart.length === 0) return;

    const concession = selectedCustomer?.defaultDiscountPercentage || 0;
    setCart((prev) =>
      prev.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return item;
        return recalculateLineItem({ ...item, discountPercentage: concession }, product);
      })
    );
  }, [selectedCustomer]);

  // Unique Categories from Products
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      if (p.isActive) {
        const cat = p.categoryName || 'General';
        map.set(cat, (map.get(cat) || 0) + 1);
      }
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [products]);

  // Filtered Products for the Kiosk Grid
  const displayProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.isActive) return false;

      const matchesSearch =
        searchQuery.trim() === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchQuery));

      if (!matchesSearch) return false;

      if (selectedCategory === 'ALL') return true;
      if (selectedCategory === 'POPULAR') {
        return p.currentStock > 10;
      }
      return (p.categoryName || 'General') === selectedCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Recalculate line totals with historical snapshot precision
  const recalculateLineItem = (item: CartItem, product: Product): CartItem => {
    const rawTotal = Number((item.unitPrice * item.quantity).toFixed(2));
    const discountAmt = Number(((rawTotal * item.discountPercentage) / 100).toFixed(2));
    const taxable = Number((rawTotal - discountAmt).toFixed(2));

    const cgstPct = product.cgstRate !== undefined ? product.cgstRate : item.taxRate / 2;
    const sgstPct = product.sgstRate !== undefined ? product.sgstRate : item.taxRate / 2;

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

  const addToCart = (product: Product) => {
    if (product.trackStock && product.currentStock <= 0) {
      alert(`"${product.name}" is out of stock!`);
      return;
    }

    const customerConcession = selectedCustomer?.defaultDiscountPercentage || 0;

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (product.trackStock && existing.quantity >= product.currentStock) {
          alert(`Cannot exceed stock limit of ${product.currentStock} units for ${product.name}`);
          return prev;
        }
        return prev.map((item) =>
          item.productId === product.id
            ? recalculateLineItem({ ...item, quantity: item.quantity + 1 }, product)
            : item
        );
      }

      const newItem: CartItem = {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        hsnCode: product.hsnCode,
        quantity: 1,
        unitPrice: product.sellingPrice,
        baseUnitPrice: product.sellingPrice,
        discountPercentage: customerConcession,
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

      return [...prev, recalculateLineItem(newItem, product)];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (!existing) return prev;

      const product = products.find((p) => p.id === productId);
      if (!product) return prev;

      const newQty = existing.quantity + delta;
      if (newQty <= 0) {
        return prev.filter((item) => item.productId !== productId);
      }

      if (product.trackStock && newQty > product.currentStock) {
        alert(`Only ${product.currentStock} units available for ${product.name}`);
        return prev;
      }

      return prev.map((item) =>
        item.productId === productId
          ? recalculateLineItem({ ...item, quantity: newQty }, product)
          : item
      );
    });
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const matchedProduct = products.find(
      (p) =>
        p.isActive &&
        (p.barcode === barcodeInput.trim() || p.sku.toLowerCase() === barcodeInput.trim().toLowerCase())
    );

    if (matchedProduct) {
      addToCart(matchedProduct);
      setBarcodeInput('');
    } else {
      alert(`No product found matching barcode/SKU: ${barcodeInput}`);
    }
  };

  // Cart Financial Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const discountTotal = cart.reduce((acc, item) => acc + item.discountAmount, 0);
  const taxableTotal = cart.reduce((acc, item) => acc + item.taxableAmount, 0);
  const cgstTotal = cart.reduce((acc, item) => acc + item.cgstAmount, 0);
  const sgstTotal = cart.reduce((acc, item) => acc + item.sgstAmount, 0);
  const rawGrandTotal = taxableTotal + cgstTotal + sgstTotal;
  const calculatedGrandTotal = Math.round(rawGrandTotal);
  const autoRoundOff = Number((calculatedGrandTotal - rawGrandTotal).toFixed(2));
  const grandTotal = calculatedGrandTotal;

  // Filtered customer list for selection modal
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch =
        customerSearchTerm.trim() === '' ||
        c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
        (c.phone && c.phone.includes(customerSearchTerm)) ||
        (c.gstin && c.gstin.toLowerCase().includes(customerSearchTerm.toLowerCase())) ||
        (c.companyName && c.companyName.toLowerCase().includes(customerSearchTerm.toLowerCase())) ||
        (c.customerCode && c.customerCode.toLowerCase().includes(customerSearchTerm.toLowerCase()));

      const cType = c.customerType || (c.gstin ? 'B2B' : 'B2C');
      const cSeg = c.customerSegment || (c.gstin ? 'LARGE' : 'SMALL');

      const matchesType = customerTypeFilter === 'ALL' || cType === customerTypeFilter;
      const matchesSegment = customerSegmentFilter === 'ALL' || cSeg === customerSegmentFilter;

      return matchesSearch && matchesType && matchesSegment;
    });
  }, [customers, customerSearchTerm, customerTypeFilter, customerSegmentFilter]);

  // Quick Customer Creation Handler
  const handleQuickCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewCustError(null);

    if (!newCustName.trim()) {
      setNewCustError('Customer or business name is required.');
      return;
    }

    if (newCustType === 'B2B' && newCustGstin && newCustGstin.trim().length !== 15) {
      setNewCustError('Indian GSTIN must be exactly 15 characters.');
      return;
    }

    setIsSavingCust(true);
    try {
      const payload: Omit<Customer, 'id' | 'isActive'> = {
        customerCode: `CUST-${String(customers.length + 1).padStart(4, '0')}`,
        customerType: newCustType,
        customerSegment: newCustSegment,
        name: newCustName.trim(),
        companyName: newCustCompanyName.trim() || undefined,
        contactPerson: newCustContactPerson.trim() || undefined,
        phone: newCustPhone.trim() || undefined,
        email: newCustEmail.trim() || undefined,
        addressLine1: newCustAddress.trim() || undefined,
        city: newCustCity.trim() || 'Bengaluru',
        state: 'Karnataka',
        stateCode: '29',
        pincode: '560001',
        gstin: newCustGstin.trim().toUpperCase() || undefined,
        gstRegistered: Boolean(newCustGstin.trim()),
        defaultDiscountPercentage: Number(newCustConcession || 0),
      };

      if (onAddCustomer) {
        const created = await onAddCustomer(payload);
        if (created && typeof created === 'object' && 'id' in created) {
          setSelectedCustomer(created as Customer);
        }
      }

      setIsNewCustModalOpen(false);
      setIsCustomerSelectorOpen(false);
      resetNewCustForm();
    } catch (err: any) {
      setNewCustError(err.message || 'Failed to create customer');
    } finally {
      setIsSavingCust(false);
    }
  };

  const resetNewCustForm = () => {
    setNewCustName('');
    setNewCustCompanyName('');
    setNewCustContactPerson('');
    setNewCustPhone('');
    setNewCustEmail('');
    setNewCustGstin('');
    setNewCustAddress('');
    setNewCustConcession(0);
    setNewCustType('B2C');
    setNewCustSegment('SMALL');
    setNewCustError(null);
  };

  // Checkout Handlers
  const handleProceedToCheckout = () => {
    if (cart.length === 0) {
      alert('Cart is empty! Tap products to add them.');
      return;
    }
    setTenderAmount(grandTotal.toString());
    setIsPaymentModalOpen(true);
  };

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const paid = parseFloat(tenderAmount) || 0;
    if (paid < 0) {
      alert('Payment amount cannot be negative.');
      return;
    }

    const invoicePayload: Omit<Invoice, 'id' | 'invoiceNumber'> = {
      invoiceDate: new Date().toISOString(),
      customerId: selectedCustomer ? selectedCustomer.id : null,
      customerName: selectedCustomer ? selectedCustomer.name : 'Walk-in Customer',
      customerPhone: selectedCustomer?.phone,
      customerGstin: selectedCustomer?.gstin,
      employeeId: currentSession?.userId || 1,
      employeeName: currentSession?.employeeName || 'Active Cashier',
      subtotal: Number(subtotal.toFixed(2)),
      discountTotal: Number(discountTotal.toFixed(2)),
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
      items: cart.map(({ availableStock, baseUnitPrice, ...rest }) => rest),
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
    setSelectedCustomer(null);
    setNotes('');
    setPaymentRef('');
    barcodeInputRef.current?.focus();
  };

  // Category Theme Helper (Monochrome Black & White)
  const getCategoryTheme = (_categoryName?: string) => {
    return {
      bg: '#ffffff',
      border: '#e4e4e7',
      text: '#09090b',
      iconBg: '#000000',
      chipBg: '#f4f4f5',
    };
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) clamp(320px, 28vw, 380px)',
        gap: '16px',
        height: 'calc(100vh - 90px)',
        maxHeight: 'calc(100vh - 90px)',
        minWidth: 0,
      }}
    >
      {/* ========================================================
          LEFT COLUMN: KIOSK-STYLE TERMINAL (BARCODE + CATEGORY + PRODUCT GRID)
         ======================================================== */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
        {/* Top Control Bar: Customer Selector + Barcode Scanner & Search */}
        <div
          className="glass-panel"
          style={{
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexWrap: 'nowrap',
            minWidth: 0,
          }}
        >
          {/* Customer Selection Pill */}
          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
            {selectedCustomer ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: '#ffffff',
                  border: '1px solid #e4e4e7',
                  padding: '6px 12px',
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                }}
              >
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    border: '1px solid #000000',
                  }}
                >
                  {selectedCustomer.customerType === 'B2B' ? <Building2 size={18} /> : <User size={18} />}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <strong
                      style={{
                        color: '#09090b',
                        fontSize: '0.88rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '160px',
                      }}
                      title={selectedCustomer.name}
                    >
                      {selectedCustomer.name}
                    </strong>
                    <span
                      style={{
                        fontSize: '0.64rem',
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: '#000000',
                        color: '#ffffff',
                        border: '1px solid #000000',
                      }}
                    >
                      {selectedCustomer.customerType || 'B2C'}
                    </span>
                    <span
                      style={{
                        fontSize: '0.64rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: '#f4f4f5',
                        color: '#09090b',
                        border: '1px solid #e4e4e7',
                      }}
                    >
                      {selectedCustomer.customerSegment || 'SMALL'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {selectedCustomer.phone && <span>📞 {selectedCustomer.phone}</span>}
                    {(selectedCustomer.defaultDiscountPercentage || 0) > 0 && (
                      <span style={{ color: '#09090b', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <Tag size={10} /> {selectedCustomer.defaultDiscountPercentage}% Concession
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => setIsHistoryModalOpen(true)}
                    className="btn btn-secondary"
                    style={{ padding: '5px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px', height: '28px' }}
                    title="View Customer Order History"
                  >
                    <History size={13} /> History
                  </button>
                  <button
                    onClick={() => setIsCustomerSelectorOpen(true)}
                    className="btn btn-secondary"
                    style={{ padding: '5px 8px', fontSize: '0.72rem', height: '28px' }}
                    title="Switch Customer"
                  >
                    Change
                  </button>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Clear Customer to Walk-in"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCustomerSelectorOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: '#ffffff',
                  border: '1px dashed #d4d4d8',
                  padding: '7px 12px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  width: '100%',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  height: '48px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#000000';
                  e.currentTarget.style.background = '#fafafa';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#d4d4d8';
                  e.currentTarget.style.background = '#ffffff';
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#f4f4f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#09090b',
                    border: '1px solid #e4e4e7',
                  }}
                >
                  <User size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#09090b', lineHeight: 1.2 }}>
                    Walk-in Consumer (B2C)
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.1 }}>
                    Standard retail pricing • Tap to select B2B / Concession
                  </div>
                </div>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: '#000000',
                    color: '#ffffff',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)',
                  }}
                >
                  Select Customer
                </span>
              </button>
            )}
          </div>

          {/* Barcode Scanner & Search Inputs */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
            <form onSubmit={handleBarcodeSubmit} style={{ position: 'relative', width: '155px' }}>
              <Barcode style={{ position: 'absolute', left: '9px', top: '10px', color: 'var(--text-muted)' }} size={15} />
              <input
                ref={barcodeInputRef}
                type="text"
                className="input-field mono"
                placeholder="Barcode [Enter]"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                style={{ paddingLeft: '30px', fontSize: '0.8rem', height: '36px' }}
              />
            </form>

            <div style={{ position: 'relative', width: '145px' }}>
              <Search style={{ position: 'absolute', left: '9px', top: '10px', color: 'var(--text-muted)' }} size={15} />
              <input
                type="text"
                className="input-field"
                placeholder="Quick search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '30px', fontSize: '0.8rem', height: '36px' }}
              />
            </div>
          </div>
        </div>

        {/* Returning Customer Recognition Banner & 1-Click Frequently Purchased Quick Chips */}
        {selectedCustomer && customerSummary && customerSummary.totalOrders > 0 && (
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e4e4e7',
              borderRadius: '14px',
              padding: '10px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '8px',
                    background: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                  }}
                >
                  <Sparkles size={15} />
                </div>
                <span style={{ fontWeight: 700, color: '#09090b', fontSize: '0.86rem' }}>
                  Returning Customer: {selectedCustomer.name}
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: '#09090b',
                    background: '#f4f4f5',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    border: '1px solid #e4e4e7',
                  }}
                >
                  {customerSummary.totalOrders} past orders • Total ₹{customerSummary.totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>

              {customerSummary.lastPurchaseDate && (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} />
                  Last Order: {new Date(customerSummary.lastPurchaseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              )}
            </div>

            {/* 1-Click Quick Add Chips */}
            {customerSummary.frequentlyPurchasedProducts.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Favorites:
                </span>
                {customerSummary.frequentlyPurchasedProducts.map((fav) => {
                  const prod = products.find((p) => p.id === fav.productId);
                  if (!prod) return null;
                  return (
                    <button
                      key={fav.productId}
                      onClick={() => addToCart(prod)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: '#ffffff',
                        border: '1px solid #e4e4e7',
                        padding: '3px 9px',
                        borderRadius: '20px',
                        color: '#09090b',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f4f4f5';
                        e.currentTarget.style.borderColor = '#000000';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#ffffff';
                        e.currentTarget.style.borderColor = '#e4e4e7';
                      }}
                      title={`1-Click Add ${fav.productName} (Bought ${fav.purchaseCount}x)`}
                    >
                      <Plus size={11} color="#000000" />
                      <span>{fav.productName}</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.68rem', fontWeight: 700 }}>
                        ₹{prod.sellingPrice}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Category Navigation Bar (Clean wrap & zero clipping on all screen sizes) */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            alignItems: 'center',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <button
            onClick={() => setSelectedCategory('ALL')}
            style={{
              padding: '6px 12px',
              borderRadius: '10px',
              border: selectedCategory === 'ALL' ? '1px solid #000000' : '1px solid #e4e4e7',
              background: selectedCategory === 'ALL' ? '#000000' : '#ffffff',
              color: selectedCategory === 'ALL' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: selectedCategory === 'ALL' ? '0 2px 6px rgba(0, 0, 0, 0.15)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Layers size={14} /> All ({products.filter((p) => p.isActive).length})
          </button>

          <button
            onClick={() => setSelectedCategory('POPULAR')}
            style={{
              padding: '6px 12px',
              borderRadius: '10px',
              border: selectedCategory === 'POPULAR' ? '1px solid #000000' : '1px solid #e4e4e7',
              background: selectedCategory === 'POPULAR' ? '#000000' : '#ffffff',
              color: selectedCategory === 'POPULAR' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: selectedCategory === 'POPULAR' ? '0 2px 6px rgba(0, 0, 0, 0.15)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Sparkles size={14} /> Popular
          </button>

          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setSelectedCategory(cat.name)}
              style={{
                padding: '6px 12px',
                borderRadius: '10px',
                border: selectedCategory === cat.name ? '1px solid #000000' : '1px solid #e4e4e7',
                background: selectedCategory === cat.name ? '#000000' : '#ffffff',
                color: selectedCategory === cat.name ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: selectedCategory === cat.name ? '0 2px 6px rgba(0, 0, 0, 0.15)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {cat.name} ({cat.count})
            </button>
          ))}
        </div>

        {/* McDonald's-Style Touch Product Grid */}
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '12px',
            alignContent: 'start',
            overflowY: 'auto',
            paddingRight: '4px',
            paddingBottom: '8px',
            minWidth: 0,
          }}
        >
          {displayProducts.map((p) => {
            const inCart = cart.find((item) => item.productId === p.id);
            const customerConcession = selectedCustomer?.defaultDiscountPercentage || 0;
            const discountedPrice = customerConcession > 0
              ? Number((p.sellingPrice * (1 - customerConcession / 100)).toFixed(2))
              : p.sellingPrice;
            const theme = getCategoryTheme(p.categoryName);

            return (
              <div
                key={p.id}
                onClick={() => addToCart(p)}
                style={{
                  background: inCart ? '#f4f4f5' : '#ffffff',
                  border: inCart
                    ? '2px solid #000000'
                    : '1px solid #e4e4e7',
                  borderRadius: '14px',
                  padding: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  userSelect: 'none',
                  boxShadow: inCart
                    ? '0 4px 12px rgba(0, 0, 0, 0.08)'
                    : '0 1px 3px rgba(0, 0, 0, 0.04)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  if (!inCart) e.currentTarget.style.borderColor = '#000000';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  if (!inCart) e.currentTarget.style.borderColor = '#e4e4e7';
                }}
              >
                {/* Visual Header / Category Indicator */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span
                    style={{
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: '#f4f4f5',
                      color: '#52525b',
                      border: '1px solid #e4e4e7',
                    }}
                  >
                    {p.categoryName || 'General'}
                  </span>

                  {/* Cart Quantity Badge if item in cart */}
                  {inCart && (
                    <div
                      style={{
                        background: '#000000',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '0.72rem',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <CheckCircle2 size={11} color="#ffffff" /> {inCart.quantity} in order
                    </div>
                  )}
                </div>

                {/* Product Name & SKU */}
                <div style={{ marginBottom: '12px' }}>
                  <h4
                    style={{
                      fontSize: '0.94rem',
                      fontWeight: 700,
                      color: '#09090b',
                      lineHeight: 1.35,
                      marginBottom: '4px',
                      minHeight: '2.7em',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                    title={p.name}
                  >
                    {p.name}
                  </h4>
                  <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {p.sku} {p.hsnCode && `• HSN ${p.hsnCode}`}
                  </div>
                </div>

                {/* Stock Status & Price */}
                <div style={{ borderTop: '1px solid #f4f4f5', paddingTop: '10px', marginTop: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    {p.trackStock ? (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: p.currentStock > p.minimumStock ? '#09090b' : p.currentStock > 0 ? '#52525b' : '#a1a1aa',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span style={{ fontSize: '0.6rem' }}>●</span> {p.currentStock} {p.unitSymbol || 'pcs'}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Stock unlimited</span>
                    )}

                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      GST {p.taxRatePercent || 0}%
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      {customerConcession > 0 ? (
                        <>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                            ₹{p.sellingPrice.toFixed(2)}
                          </div>
                          <div style={{ fontSize: '1.22rem', fontWeight: 900, color: '#000000', letterSpacing: '-0.02em' }} className="mono">
                            ₹{discountedPrice.toFixed(2)}
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: '1.22rem', fontWeight: 900, color: '#000000', letterSpacing: '-0.02em' }} className="mono">
                          ₹{p.sellingPrice.toFixed(2)}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(p);
                      }}
                      className={inCart ? 'btn btn-secondary' : 'btn btn-primary'}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.78rem',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        height: '32px',
                        fontWeight: 700,
                      }}
                    >
                      <Plus size={15} /> {inCart ? 'Add More' : 'Add'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================
          RIGHT COLUMN: CURRENT ORDER CART & CHECKOUT (KIOSK STYLE)
         ======================================================== */}
      <div
        className="glass-panel"
        style={{
          padding: '16px',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          maxHeight: '100%',
          overflow: 'hidden',
          background: '#ffffff',
          minWidth: 0,
          border: '1px solid #e4e4e7',
          boxSizing: 'border-box',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        {/* Cart Header */}
        <div style={{ borderBottom: '1px solid #e4e4e7', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: '#f4f4f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#09090b',
                }}
              >
                <ShoppingBag size={18} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#09090b' }}>Current Order</h3>
              <span
                style={{
                  background: '#000000',
                  color: '#ffffff',
                  borderRadius: '12px',
                  padding: '1px 8px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)',
                }}
              >
                {cart.reduce((sum, it) => sum + it.quantity, 0)} items
              </span>
            </div>

            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 600,
                }}
              >
                <Trash2 size={13} /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Cart Line Items List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {cart.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--text-muted)',
                textAlign: 'center',
                gap: '12px',
                padding: '20px',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: '#f4f4f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #e4e4e7',
                }}
              >
                <ShoppingBag size={28} strokeWidth={1.5} color="var(--text-muted)" />
              </div>
              <div>
                <strong style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '0.9rem' }}>
                  No items selected
                </strong>
                <span style={{ fontSize: '0.78rem' }}>
                  Tap any product on the left or scan a barcode to add to this order
                </span>
              </div>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.productId}
                style={{
                  background: '#f8fafc',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  border: '1px solid #e4e4e7',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
                    <div
                      style={{
                        fontWeight: 700,
                        color: '#09090b',
                        fontSize: '0.85rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={item.productName}
                    >
                      {item.productName}
                    </div>
                    <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      ₹{item.unitPrice.toFixed(2)} each {item.discountPercentage > 0 && `• ${item.discountPercentage}% Concession`}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: '#09090b', fontSize: '0.92rem' }} className="mono">
                      ₹{item.lineTotal.toFixed(2)}
                    </div>
                    {item.discountAmount > 0 && (
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        -₹{item.discountAmount.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Touch Stepper */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <button
                      onClick={() => updateQuantity(item.productId, -1)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: '#ffffff',
                        border: '1px solid #d4d4d8',
                        color: '#09090b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f4f4f5')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                    >
                      <Minus size={13} />
                    </button>
                    <span className="mono" style={{ minWidth: '28px', textAlign: 'center', fontWeight: 800, fontSize: '0.85rem', color: '#09090b' }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.productId, 1)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: '#ffffff',
                        border: '1px solid #d4d4d8',
                        color: '#09090b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f4f4f5')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.productId)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Remove item"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Order Financial Totals & Big Checkout Button */}
        <div
          style={{
            borderTop: '1px solid #e4e4e7',
            paddingTop: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <span>Base Subtotal</span>
            <span className="mono">₹{subtotal.toFixed(2)}</span>
          </div>

          {discountTotal > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#09090b', fontWeight: 600 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Tag size={12} /> Concession
              </span>
              <span className="mono">-₹{discountTotal.toFixed(2)}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <span>Taxable Amount</span>
            <span className="mono">₹{taxableTotal.toFixed(2)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>GST (CGST + SGST)</span>
            <span className="mono">₹{(cgstTotal + sgstTotal).toFixed(2)}</span>
          </div>

          {autoRoundOff !== 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              <span>Round Off</span>
              <span className="mono">{autoRoundOff > 0 ? `+₹${autoRoundOff.toFixed(2)}` : `-₹${Math.abs(autoRoundOff).toFixed(2)}`}</span>
            </div>
          )}

          {/* Grand Total */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              borderTop: '1.5px dashed #e4e4e7',
              paddingTop: '8px',
              marginTop: '4px',
            }}
          >
            <span style={{ fontSize: '0.96rem', fontWeight: 800, color: '#09090b' }}>TOTAL PAYABLE</span>
            <span
              style={{
                fontSize: '1.75rem',
                fontWeight: 900,
                color: '#000000',
                letterSpacing: '-0.02em',
              }}
              className="mono"
            >
              ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Touch-Friendly Checkout Button */}
          <button
            onClick={handleProceedToCheckout}
            disabled={cart.length === 0}
            style={{
              width: '100%',
              height: '50px',
              borderRadius: '12px',
              border: cart.length > 0 ? '1px solid #000000' : '1px solid #e4e4e7',
              background: cart.length > 0
                ? '#000000'
                : '#f4f4f5',
              color: cart.length > 0 ? '#ffffff' : '#a1a1aa',
              fontSize: '1.05rem',
              fontWeight: 800,
              cursor: cart.length > 0 ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '6px',
              boxShadow: cart.length > 0 ? '0 4px 14px rgba(0, 0, 0, 0.15)' : 'none',
              transition: 'all 0.15s ease',
              letterSpacing: '0.02em',
            }}
          >
            <span>CHECKOUT & PAY</span>
            <ArrowRight size={20} />
          </button>
        </div>
      </div>

      {/* ========================================================
          MODAL 1: CUSTOMER SEARCH & FAST SELECTION MODAL
         ======================================================== */}
      {isCustomerSelectorOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px', padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#09090b' }}>
                  Select Customer for Commercial Terms
                </h2>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Search registered corporate buyers (B2B) and retail clients (B2C)
                </div>
              </div>
              <button
                onClick={() => setIsCustomerSelectorOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Input & Action */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} size={16} />
                <input
                  type="text"
                  autoFocus
                  className="input-field"
                  placeholder="Search by phone, name, code, or GSTIN..."
                  value={customerSearchTerm}
                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                  style={{ paddingLeft: '36px', height: '40px' }}
                />
              </div>

              <button
                onClick={() => {
                  setIsCustomerSelectorOpen(false);
                  setIsNewCustModalOpen(true);
                }}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', height: '40px', fontSize: '0.82rem' }}
              >
                <Plus size={15} /> New Customer
              </button>
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
              {(['ALL', 'B2C', 'B2B'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setCustomerTypeFilter(t)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '8px',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: customerTypeFilter === t ? '1px solid #000000' : '1px solid #e4e4e7',
                    background: customerTypeFilter === t ? '#000000' : '#f4f4f5',
                    color: customerTypeFilter === t ? '#ffffff' : 'var(--text-secondary)',
                  }}
                >
                  {t === 'ALL' ? 'All Types' : t}
                </button>
              ))}

              {(['ALL', 'SMALL', 'LARGE'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setCustomerSegmentFilter(s)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '8px',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: customerSegmentFilter === s ? '1px solid #000000' : '1px solid #e4e4e7',
                    background: customerSegmentFilter === s ? '#000000' : '#f4f4f5',
                    color: customerSegmentFilter === s ? '#ffffff' : 'var(--text-secondary)',
                  }}
                >
                  {s === 'ALL' ? 'All Segments' : s === 'LARGE' ? 'Large Buyers' : 'Small Buyers'}
                </button>
              ))}
            </div>

            {/* Customer List (Touch Cards) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
              {filteredCustomers.map((cust) => {
                const cType = cust.customerType || (cust.gstin ? 'B2B' : 'B2C');
                const cSeg = cust.customerSegment || (cust.gstin ? 'LARGE' : 'SMALL');
                return (
                  <div
                    key={cust.id}
                    onClick={() => {
                      setSelectedCustomer({ ...cust, customerType: cType, customerSegment: cSeg });
                      setIsCustomerSelectorOpen(false);
                    }}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e4e4e7',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#000000';
                      e.currentTarget.style.background = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e4e4e7';
                      e.currentTarget.style.background = '#ffffff';
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ color: '#09090b', fontSize: '0.9rem' }}>{cust.name}</strong>
                        <span
                          style={{
                            fontSize: '0.64rem',
                            fontWeight: 800,
                            padding: '1px 6px',
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
                            fontSize: '0.64rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: '#f4f4f5',
                            color: '#09090b',
                            border: '1px solid #e4e4e7',
                          }}
                        >
                          {cSeg}
                        </span>
                      </div>

                      {cust.companyName && (
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {cust.companyName}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '10px', fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                        {cust.phone && <span>📞 {cust.phone}</span>}
                        {cust.gstin && <span className="mono" style={{ color: '#09090b' }}>GSTIN: {cust.gstin}</span>}
                        <span>📍 {cust.city || 'Bengaluru'}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      {(cust.defaultDiscountPercentage || 0) > 0 ? (
                        <div style={{ color: '#09090b', fontWeight: 800, fontSize: '0.86rem' }}>
                          {cust.defaultDiscountPercentage}% Concession
                        </div>
                      ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Standard Price</div>
                      )}
                      <ChevronRight size={16} color="var(--text-muted)" style={{ marginTop: '2px' }} />
                    </div>
                  </div>
                );
              })}

              {filteredCustomers.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                  No customer found matching "{customerSearchTerm}". Tap "New Customer" to register.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: QUICK REGISTER CUSTOMER MODAL (PROGRESSIVE DISCLOSURE)
         ======================================================== */}
      {isNewCustModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px', padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#09090b' }}>
                Quick Customer Registration
              </h2>
              <button
                onClick={() => setIsNewCustModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {newCustError && (
              <div style={{ padding: '8px 12px', background: '#f4f4f5', borderRadius: '8px', color: '#09090b', border: '1px solid #e4e4e7', fontSize: '0.8rem', marginBottom: '12px' }}>
                {newCustError}
              </div>
            )}

            <form onSubmit={handleQuickCustomerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Type Switcher */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setNewCustType('B2C')}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: newCustType === 'B2C' ? '2px solid #000000' : '1px solid #e4e4e7',
                    background: newCustType === 'B2C' ? '#000000' : '#f4f4f5',
                    color: newCustType === 'B2C' ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                  }}
                >
                  B2C (Consumer)
                </button>
                <button
                  type="button"
                  onClick={() => setNewCustType('B2B')}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: newCustType === 'B2B' ? '2px solid #000000' : '1px solid #e4e4e7',
                    background: newCustType === 'B2B' ? '#000000' : '#f4f4f5',
                    color: newCustType === 'B2B' ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                  }}
                >
                  B2B (Corporate / Wholesale)
                </button>
              </div>

              {/* Name & Phone */}
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>
                  {newCustType === 'B2B' ? 'COMPANY / BUSINESS NAME *' : 'CUSTOMER NAME *'}
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder={newCustType === 'B2B' ? 'e.g. Acme Corporation' : 'e.g. Rahul Sharma'}
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>
                    MOBILE PHONE
                  </label>
                  <input
                    type="text"
                    className="input-field mono"
                    placeholder="9845012345"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>
                    BUYER SEGMENT
                  </label>
                  <select
                    className="input-field"
                    value={newCustSegment}
                    onChange={(e) => setNewCustSegment(e.target.value as any)}
                  >
                    <option value="SMALL">Small Buyer</option>
                    <option value="LARGE">Large Buyer</option>
                  </select>
                </div>
              </div>

              {/* B2B Progressive Fields */}
              {newCustType === 'B2B' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>
                        CONTACT PERSON
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="e.g. Ramesh Mehta"
                        value={newCustContactPerson}
                        onChange={(e) => setNewCustContactPerson(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>
                        GSTIN (15 CHARS)
                      </label>
                      <input
                        type="text"
                        maxLength={15}
                        className="input-field mono"
                        placeholder="29AAACG8976R1ZO"
                        value={newCustGstin}
                        onChange={(e) => setNewCustGstin(e.target.value.toUpperCase())}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>
                      BILLING ADDRESS
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Industrial Suburb, Phase 1"
                      value={newCustAddress}
                      onChange={(e) => setNewCustAddress(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* Concession Percentage */}
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>
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
                    value={newCustConcession || ''}
                    onChange={(e) => setNewCustConcession(parseFloat(e.target.value) || 0)}
                    style={{ paddingRight: '30px' }}
                  />
                  <Percent size={13} style={{ position: 'absolute', right: '10px', top: '13px', color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsNewCustModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCust}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  {isSavingCust ? 'Saving...' : 'Register & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: CUSTOMER ORDER & PURCHASE HISTORY MODAL
         ======================================================== */}
      {isHistoryModalOpen && selectedCustomer && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#09090b' }}>
                  {selectedCustomer.name}
                </h2>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '3px' }}>
                  <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', background: '#f4f4f5', color: '#09090b', border: '1px solid #e4e4e7' }}>
                    {selectedCustomer.customerType} • {selectedCustomer.customerSegment}
                  </span>
                  {(selectedCustomer.defaultDiscountPercentage || 0) > 0 && (
                    <span style={{ fontSize: '0.72rem', color: '#09090b', fontWeight: 700 }}>
                      🏷️ {selectedCustomer.defaultDiscountPercentage}% Concession
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {isLoadingHistory ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                Loading customer summary...
              </div>
            ) : customerSummary ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid #e4e4e7' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TOTAL ORDERS</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#09090b', marginTop: '2px' }}>
                      {customerSummary.totalOrders}
                    </div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid #e4e4e7' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TOTAL PURCHASES</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', marginTop: '2px' }} className="mono">
                      ₹{customerSummary.totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid #e4e4e7' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>AVG ORDER VALUE</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', marginTop: '2px' }} className="mono">
                      ₹{customerSummary.averageOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>

                {/* Frequently Bought with 1-Click Add */}
                {customerSummary.frequentlyPurchasedProducts.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Frequently Purchased Products (Tap to Add)
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {customerSummary.frequentlyPurchasedProducts.map((p) => {
                        const prod = products.find((pr) => pr.id === p.productId);
                        return (
                          <div
                            key={p.productId}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              background: '#ffffff',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid #e4e4e7',
                            }}
                          >
                            <div>
                              <strong style={{ color: '#09090b', fontSize: '0.86rem' }}>{p.productName}</strong>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                Ordered {p.purchaseCount} times ({p.totalQuantity} units)
                              </div>
                            </div>
                            {prod && (
                              <button
                                onClick={() => {
                                  addToCart(prod);
                                  setIsHistoryModalOpen(false);
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '4px 10px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px', height: '28px' }}
                              >
                                <Plus size={13} /> Add to Order
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recent Invoices */}
                <div>
                  <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Recent Orders
                  </h3>
                  {customerSummary.recentInvoices.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {customerSummary.recentInvoices.map((inv) => (
                        <div
                          key={inv.invoiceId}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: '#ffffff',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #e4e4e7',
                          }}
                        >
                          <div>
                            <span className="mono" style={{ color: '#09090b', fontWeight: 700, fontSize: '0.82rem' }}>
                              {inv.invoiceNumber}
                            </span>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {new Date(inv.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 800, color: '#09090b', fontSize: '0.86rem' }} className="mono">
                              ₹{inv.grandTotal.toFixed(2)}
                            </div>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                              {inv.paymentStatus}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>No past orders found.</div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 4: TOUCH PAYMENT MODAL (CASH / UPI / CARD / BANK)
         ======================================================== */}
      {isPaymentModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px', padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#09090b' }}>
                Complete Settlement
              </h2>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Bill Summary Banner */}
            <div
              style={{
                background: '#f8fafc',
                padding: '12px',
                borderRadius: '12px',
                marginBottom: '14px',
                textAlign: 'center',
                border: '1px solid #e4e4e7',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Payable Amount
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#000000' }} className="mono">
                ₹{grandTotal.toFixed(2)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Billed to: <strong style={{ color: '#09090b' }}>{selectedCustomer ? selectedCustomer.name : 'Walk-in Retail Customer'}</strong>
              </div>
            </div>

            <form onSubmit={handleProcessPayment} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Payment Methods */}
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  SELECT PAYMENT TENDER
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {[
                    { id: 'CASH', label: 'Cash', icon: DollarSign },
                    { id: 'UPI', label: 'UPI / QR', icon: Smartphone },
                    { id: 'CARD', label: 'Card', icon: CreditCard },
                    { id: 'BANK_TRANSFER', label: 'Bank RTGS', icon: Receipt },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as any)}
                        style={{
                          padding: '10px 4px',
                          borderRadius: '10px',
                          border: isSelected ? '1px solid #000000' : '1px solid #e4e4e7',
                          background: isSelected ? '#000000' : '#ffffff',
                          color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: 800,
                          fontSize: '0.74rem',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Icon size={18} color={isSelected ? '#ffffff' : 'var(--text-muted)'} />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tender Amount */}
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  AMOUNT RECEIVED (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="input-field mono"
                  value={tenderAmount}
                  onChange={(e) => setTenderAmount(e.target.value)}
                  style={{ fontSize: '1.2rem', fontWeight: 800, height: '44px' }}
                />

                {/* Quick Cash Presets if Cash tender */}
                {paymentMethod === 'CASH' && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    {[grandTotal, Math.ceil(grandTotal / 500) * 500, Math.ceil(grandTotal / 1000) * 1000, 2000].map((amt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setTenderAmount(amt.toString())}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: '#f4f4f5',
                          border: '1px solid #e4e4e7',
                          color: '#09090b',
                          fontSize: '0.74rem',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Change calculation if cash */}
              {paymentMethod === 'CASH' && parseFloat(tenderAmount) > grandTotal && (
                <div
                  style={{
                    background: '#f4f4f5',
                    border: '1px solid #e4e4e7',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '0.82rem', color: '#09090b', fontWeight: 600 }}>Change to Return:</span>
                  <strong className="mono" style={{ fontSize: '1.1rem', color: '#000000' }}>
                    ₹{(parseFloat(tenderAmount) - grandTotal).toFixed(2)}
                  </strong>
                </div>
              )}

              {/* Reference number if digital */}
              {paymentMethod !== 'CASH' && (
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>
                    TRANSACTION / REFERENCE ID
                  </label>
                  <input
                    type="text"
                    className="input-field mono"
                    placeholder="e.g. UPI-REF-987654 or Auth Code"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>
                  INVOICE REMARKS / NOTES
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Optional remarks"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, height: '44px', fontSize: '0.92rem', fontWeight: 800 }}
                >
                  Confirm & Finalize
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
