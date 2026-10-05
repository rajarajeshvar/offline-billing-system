import { Customer, CustomerSummary, Invoice, Payment, Product, StockMovement } from './types';

const API_BASE = '/api/v1';

export interface AuthSession {
  token: string;
  userId: number;
  username: string;
  role: 'ADMIN' | 'MANAGER' | 'BILLER' | 'INVENTORY_MANAGER';
  employeeName: string;
  isOfflineAuth?: boolean;
  shift?: string;
  designation?: string;
}

export interface CashierAccount {
  id: string;
  username: string;
  name: string;
  role: 'BILLER' | 'MANAGER' | 'ADMIN';
  pin: string;
  password?: string;
  avatarBg: string;
  shift: string;
  designation: string;
}

export const PRESET_USERS: CashierAccount[] = [
  {
    id: 'user-cashier-1',
    username: 'cashier1',
    name: 'Priya Sharma',
    role: 'BILLER',
    pin: '1234',
    password: 'Cashier@123',
    avatarBg: 'linear-gradient(135deg, #27272a, #09090b)',
    shift: 'Morning Shift • Terminal 01',
    designation: 'Senior Cashier / Biller',
  },
  {
    id: 'user-cashier-2',
    username: 'cashier2',
    name: 'Arun Kumar',
    role: 'BILLER',
    pin: '5678',
    password: 'Cashier@123',
    avatarBg: 'linear-gradient(135deg, #3f3f46, #18181b)',
    shift: 'Evening Shift • Terminal 01',
    designation: 'Billing Associate',
  },
  {
    id: 'user-admin',
    username: 'admin',
    name: 'Rajan (Administrator)',
    role: 'ADMIN',
    pin: '9999',
    password: 'Admin@Offline123',
    avatarBg: 'linear-gradient(135deg, #ffffff, #d4d4d8)',
    shift: 'All Day • Full Access',
    designation: 'System Administrator',
  },
  {
    id: 'user-manager',
    username: 'manager',
    name: 'Sunil Verma',
    role: 'MANAGER',
    pin: '4321',
    password: 'Manager@123',
    avatarBg: 'linear-gradient(135deg, #52525b, #27272a)',
    shift: 'General Shift • Store Supervisor',
    designation: 'Store Manager',
  },
];

// 1. Authentication & Token Management
export async function loginWithCredentials(
  username: string,
  password: string
): Promise<{ success: boolean; session?: AuthSession; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), password }),
    });

    if (res.ok) {
      const data = await res.json();
      const preset = PRESET_USERS.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
      const session: AuthSession = {
        token: data.token,
        userId: Number(data.userId || 1),
        username: data.username || username.trim(),
        role: (data.role || preset?.role || 'BILLER') as any,
        employeeName: data.employeeName || preset?.name || username,
        isOfflineAuth: false,
        shift: preset?.shift || 'Standard Shift',
        designation: preset?.designation || (data.role === 'ADMIN' ? 'System Administrator' : 'Operator'),
      };
      localStorage.setItem('obs_jwt_token', session.token);
      localStorage.setItem('obs_auth_session', JSON.stringify(session));
      return { success: true, session };
    }

    if (res.status === 401 || res.status === 403) {
      return { success: false, error: 'Invalid username or password' };
    }
  } catch {
    // Network / server offline: Fallback to local verified credentials
  }

  // Offline fallback authentication
  const matchedUser = PRESET_USERS.find(
    (u) =>
      u.username.toLowerCase() === username.trim().toLowerCase() &&
      (u.password === password || u.pin === password)
  );

  if (matchedUser) {
    const offlineSession: AuthSession = {
      token: `offline-token-${matchedUser.username}-${Date.now()}`,
      userId: matchedUser.username === 'admin' ? 1 : matchedUser.username === 'cashier1' ? 2 : 3,
      username: matchedUser.username,
      role: matchedUser.role,
      employeeName: matchedUser.name,
      isOfflineAuth: true,
      shift: matchedUser.shift,
      designation: matchedUser.designation,
    };
    localStorage.setItem('obs_jwt_token', offlineSession.token);
    localStorage.setItem('obs_auth_session', JSON.stringify(offlineSession));
    return { success: true, session: offlineSession };
  }

  return { success: false, error: 'Authentication failed. Please check your credentials.' };
}

export async function loginWithPin(
  userIdOrUsername: string,
  pin: string
): Promise<{ success: boolean; session?: AuthSession; error?: string }> {
  const user = PRESET_USERS.find(
    (u) => u.id === userIdOrUsername || u.username.toLowerCase() === userIdOrUsername.toLowerCase()
  );

  if (!user) {
    return { success: false, error: 'Operator profile not found' };
  }

  if (user.pin !== pin.trim()) {
    return { success: false, error: 'Incorrect 4-digit PIN' };
  }

  // If user has a password and backend might be up, attempt live token login
  if (user.password) {
    try {
      const liveAttempt = await loginWithCredentials(user.username, user.password);
      if (liveAttempt.success && liveAttempt.session) {
        return liveAttempt;
      }
    } catch {
      // Continue to offline session
    }
  }

  // Offline session
  const session: AuthSession = {
    token: `offline-pin-${user.username}-${Date.now()}`,
    userId: user.username === 'admin' ? 1 : user.username === 'cashier1' ? 2 : 3,
    username: user.username,
    role: user.role,
    employeeName: user.name,
    isOfflineAuth: true,
    shift: user.shift,
    designation: user.designation,
  };
  localStorage.setItem('obs_jwt_token', session.token);
  localStorage.setItem('obs_auth_session', JSON.stringify(session));
  return { success: true, session };
}

export function logoutUser(): void {
  localStorage.removeItem('obs_jwt_token');
  localStorage.removeItem('obs_auth_session');
  localStorage.removeItem('obs_terminal_locked');
}

export function setTerminalLocked(locked: boolean): void {
  if (locked) {
    localStorage.setItem('obs_terminal_locked', 'true');
  } else {
    localStorage.removeItem('obs_terminal_locked');
  }
}

export function isTerminalLocked(): boolean {
  return localStorage.getItem('obs_terminal_locked') === 'true';
}

export async function authenticate(username = 'admin', password = 'Admin@Offline123'): Promise<AuthSession | null> {
  const res = await loginWithCredentials(username, password);
  return res.session || null;
}

export function getStoredToken(): string | null {
  return localStorage.getItem('obs_jwt_token');
}

export function getStoredSession(): AuthSession | null {
  const sessionStr = localStorage.getItem('obs_auth_session');
  if (sessionStr) {
    try {
      return JSON.parse(sessionStr);
    } catch {
      return null;
    }
  }
  return null;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  let token = getStoredToken();
  if (!token) {
    const session = await authenticate();
    if (session) {
      token = session.token;
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

// 2. Health & Connection Check
export async function checkBackendConnection(): Promise<boolean> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/products?size=1`, {
      headers,
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// 3. Products
export async function fetchLiveProducts(query?: string): Promise<Product[] | null> {
  try {
    const headers = await getAuthHeaders();
    const url = query
      ? `${API_BASE}/products?query=${encodeURIComponent(query)}&size=100`
      : `${API_BASE}/products?size=100`;

    const res = await fetch(url, { headers });
    if (!res.ok) return null;

    const data = await res.json();
    const list = data.content || [];

    return list.map((item: any) => ({
      id: Number(item.id),
      sku: item.sku,
      barcode: item.barcode || undefined,
      name: item.name,
      description: item.description || undefined,
      categoryId: Number(item.categoryId),
      categoryName: item.categoryName || undefined,
      unitId: Number(item.unitId),
      unitSymbol: item.unitSymbol || 'pcs',
      taxRateId: Number(item.taxRateId),
      taxRatePercent: Number(item.taxRatePercent || 0),
      cgstRate: Number(item.taxRatePercent || 0) / 2,
      sgstRate: Number(item.taxRatePercent || 0) / 2,
      hsnCode: item.hsnCode || undefined,
      costPrice: Number(item.costPrice || 0),
      sellingPrice: Number(item.sellingPrice || 0),
      trackStock: Boolean(item.trackStock),
      currentStock: Number(item.currentStock || 0),
      minimumStock: Number(item.minimumStock || 0),
      reorderLevel: Number(item.reorderLevel || 0),
      targetStock: Number(item.targetStock || 0),
      isActive: Boolean(item.isActive),
    }));
  } catch (err) {
    console.warn('Error fetching live products:', err);
    return null;
  }
}

export async function createLiveProduct(payload: {
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryId: number;
  unitId: number;
  taxRateId: number;
  hsnCode?: string;
  costPrice: number;
  sellingPrice: number;
  trackStock?: boolean;
  minimumStock?: number;
  reorderLevel?: number;
  targetStock?: number;
  initialStock?: number;
}): Promise<Product | null> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to create product');
    }

    const item = await res.json();
    return {
      id: Number(item.id),
      sku: item.sku,
      barcode: item.barcode || undefined,
      name: item.name,
      description: item.description || undefined,
      categoryId: Number(item.categoryId),
      categoryName: item.categoryName || undefined,
      unitId: Number(item.unitId),
      unitSymbol: item.unitSymbol || 'pcs',
      taxRateId: Number(item.taxRateId),
      taxRatePercent: Number(item.taxRatePercent || 0),
      cgstRate: Number(item.taxRatePercent || 0) / 2,
      sgstRate: Number(item.taxRatePercent || 0) / 2,
      hsnCode: item.hsnCode || undefined,
      costPrice: Number(item.costPrice || 0),
      sellingPrice: Number(item.sellingPrice || 0),
      trackStock: Boolean(item.trackStock),
      currentStock: Number(item.currentStock || 0),
      minimumStock: Number(item.minimumStock || 0),
      reorderLevel: Number(item.reorderLevel || 0),
      targetStock: Number(item.targetStock || 0),
      isActive: Boolean(item.isActive),
    };
  } catch (err) {
    console.error('Failed to create live product:', err);
    throw err;
  }
}

export async function updateLiveProductPrice(
  productId: number,
  sellingPrice: number,
  costPrice?: number
): Promise<Product | null> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/products/${productId}/price`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        sellingPrice,
        costPrice: costPrice !== undefined ? costPrice : undefined,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Price update failed with status ${res.status}`);
    }

    const item = await res.json();
    return {
      id: Number(item.id),
      sku: item.sku,
      barcode: item.barcode || undefined,
      name: item.name,
      description: item.description || undefined,
      categoryId: Number(item.categoryId),
      categoryName: item.categoryName || undefined,
      unitId: Number(item.unitId),
      unitSymbol: item.unitSymbol || 'pcs',
      taxRateId: Number(item.taxRateId),
      taxRatePercent: Number(item.taxRatePercent || 0),
      cgstRate: Number(item.taxRatePercent || 0) / 2,
      sgstRate: Number(item.taxRatePercent || 0) / 2,
      hsnCode: item.hsnCode || undefined,
      costPrice: Number(item.costPrice || 0),
      sellingPrice: Number(item.sellingPrice || 0),
      trackStock: Boolean(item.trackStock),
      currentStock: Number(item.currentStock || 0),
      minimumStock: Number(item.minimumStock || 0),
      reorderLevel: Number(item.reorderLevel || 0),
      targetStock: Number(item.targetStock || 0),
      isActive: Boolean(item.isActive),
    };
  } catch (err) {
    console.error('Failed to update product price:', err);
    throw err;
  }
}

// 4. Customers
export async function fetchLiveCustomers(
  query?: string,
  type?: 'B2C' | 'B2B',
  segment?: 'SMALL' | 'LARGE'
): Promise<Customer[] | null> {
  try {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (query) params.append('query', query.trim());
    if (type) params.append('type', type);
    if (segment) params.append('segment', segment);
    params.append('size', '100');

    const res = await fetch(`${API_BASE}/customers?${params.toString()}`, { headers });
    if (!res.ok) return null;

    const data = await res.json();
    const list = data.content || [];

    return list.map((item: any) => ({
      id: Number(item.id),
      customerCode: item.customerCode || undefined,
      customerType: (item.customerType || 'B2C') as 'B2C' | 'B2B',
      customerSegment: (item.customerSegment || 'SMALL') as 'SMALL' | 'LARGE',
      name: item.name,
      companyName: item.companyName || undefined,
      contactPerson: item.contactPerson || undefined,
      phone: item.phone || undefined,
      email: item.email || undefined,
      addressLine1: item.addressLine1 || undefined,
      addressLine2: item.addressLine2 || undefined,
      city: item.city || undefined,
      state: item.state || undefined,
      stateCode: item.stateCode || undefined,
      pincode: item.pincode || undefined,
      shippingAddress: item.shippingAddress || undefined,
      gstin: item.gstin || undefined,
      gstRegistered: Boolean(item.gstRegistered),
      defaultDiscountPercentage: Number(item.defaultDiscountPercentage || 0),
      notes: item.notes || undefined,
      isActive: Boolean(item.isActive),
    }));
  } catch (err) {
    console.warn('Error fetching live customers:', err);
    return null;
  }
}

export async function createLiveCustomer(payload: Omit<Customer, 'id' | 'isActive'>): Promise<Customer | null> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create customer');
    }

    const item = await res.json();
    return {
      id: Number(item.id),
      customerCode: item.customerCode || undefined,
      customerType: (item.customerType || 'B2C') as 'B2C' | 'B2B',
      customerSegment: (item.customerSegment || 'SMALL') as 'SMALL' | 'LARGE',
      name: item.name,
      companyName: item.companyName || undefined,
      contactPerson: item.contactPerson || undefined,
      phone: item.phone || undefined,
      email: item.email || undefined,
      addressLine1: item.addressLine1 || undefined,
      addressLine2: item.addressLine2 || undefined,
      city: item.city || undefined,
      state: item.state || undefined,
      stateCode: item.stateCode || undefined,
      pincode: item.pincode || undefined,
      shippingAddress: item.shippingAddress || undefined,
      gstin: item.gstin || undefined,
      gstRegistered: Boolean(item.gstRegistered),
      defaultDiscountPercentage: Number(item.defaultDiscountPercentage || 0),
      notes: item.notes || undefined,
      isActive: Boolean(item.isActive),
    };
  } catch (err) {
    console.error('Failed to create live customer:', err);
    throw err;
  }
}

export async function updateLiveCustomer(
  id: number,
  payload: Partial<Customer>
): Promise<Customer | null> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Customer update failed with status ${res.status}`);
    }

    const item = await res.json();
    return {
      id: Number(item.id),
      customerCode: item.customerCode || undefined,
      customerType: (item.customerType || 'B2C') as 'B2C' | 'B2B',
      customerSegment: (item.customerSegment || 'SMALL') as 'SMALL' | 'LARGE',
      name: item.name,
      companyName: item.companyName || undefined,
      contactPerson: item.contactPerson || undefined,
      phone: item.phone || undefined,
      email: item.email || undefined,
      addressLine1: item.addressLine1 || undefined,
      addressLine2: item.addressLine2 || undefined,
      city: item.city || undefined,
      state: item.state || undefined,
      stateCode: item.stateCode || undefined,
      pincode: item.pincode || undefined,
      shippingAddress: item.shippingAddress || undefined,
      gstin: item.gstin || undefined,
      gstRegistered: Boolean(item.gstRegistered),
      defaultDiscountPercentage: Number(item.defaultDiscountPercentage || 0),
      notes: item.notes || undefined,
      isActive: Boolean(item.isActive),
    };
  } catch (err) {
    console.error('Failed to update live customer:', err);
    throw err;
  }
}

export async function fetchCustomerSummary(id: number): Promise<CustomerSummary | null> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/customers/${id}/summary`, { headers });
    if (!res.ok) return null;

    const data = await res.json();
    const cust = data.customer;

    return {
      customer: {
        id: Number(cust.id),
        customerCode: cust.customerCode || undefined,
        customerType: (cust.customerType || 'B2C') as 'B2C' | 'B2B',
        customerSegment: (cust.customerSegment || 'SMALL') as 'SMALL' | 'LARGE',
        name: cust.name,
        companyName: cust.companyName || undefined,
        contactPerson: cust.contactPerson || undefined,
        phone: cust.phone || undefined,
        email: cust.email || undefined,
        addressLine1: cust.addressLine1 || undefined,
        addressLine2: cust.addressLine2 || undefined,
        city: cust.city || undefined,
        state: cust.state || undefined,
        stateCode: cust.stateCode || undefined,
        pincode: cust.pincode || undefined,
        shippingAddress: cust.shippingAddress || undefined,
        gstin: cust.gstin || undefined,
        gstRegistered: Boolean(cust.gstRegistered),
        defaultDiscountPercentage: Number(cust.defaultDiscountPercentage || 0),
        notes: cust.notes || undefined,
        isActive: Boolean(cust.isActive),
      },
      totalOrders: Number(data.totalOrders || 0),
      totalSpent: Number(data.totalSpent || 0),
      averageOrderValue: Number(data.averageOrderValue || 0),
      lastPurchaseDate: data.lastPurchaseDate || undefined,
      isReturningCustomer: Boolean(data.isReturningCustomer),
      recentInvoices: (data.recentInvoices || []).map((inv: any) => ({
        invoiceId: Number(inv.invoiceId),
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        grandTotal: Number(inv.grandTotal || 0),
        paymentStatus: inv.paymentStatus,
        invoiceStatus: inv.invoiceStatus,
        itemCount: Number(inv.itemCount || 0),
      })),
      frequentlyPurchasedProducts: (data.frequentlyPurchasedProducts || []).map((p: any) => ({
        productId: Number(p.productId),
        productName: p.productName,
        sku: p.sku,
        totalQuantity: Number(p.totalQuantity || 0),
        purchaseCount: Number(p.purchaseCount || 0),
      })),
    };
  } catch (err) {
    console.warn('Error fetching customer summary:', err);
    return null;
  }
}

// 5. Invoices
export async function fetchLiveInvoices(): Promise<Invoice[] | null> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/invoices?size=100`, { headers });
    if (!res.ok) return null;

    const data = await res.json();
    const list = data.content || [];

    return list.map((inv: any) => ({
      id: Number(inv.id),
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      customerId: inv.customerId ? Number(inv.customerId) : null,
      customerName: inv.customerName || undefined,
      customerPhone: undefined,
      customerGstin: undefined,
      employeeId: Number(inv.employeeId || 1),
      employeeName: inv.employeeName || 'Staff',
      subtotal: Number(inv.subtotal || 0),
      discountTotal: Number(inv.discountTotal || 0),
      taxableAmount: Number(inv.taxableAmount || 0),
      cgstTotal: Number(inv.cgstTotal || 0),
      sgstTotal: Number(inv.sgstTotal || 0),
      igstTotal: Number(inv.igstTotal || 0),
      cessTotal: Number(inv.cessTotal || 0),
      roundOff: Number(inv.roundOff || 0),
      grandTotal: Number(inv.grandTotal || 0),
      paymentStatus: inv.paymentStatus,
      invoiceStatus: inv.invoiceStatus,
      notes: inv.notes || undefined,
      items: (inv.items || []).map((item: any) => ({
        id: Number(item.id),
        productId: Number(item.productId),
        productName: item.productName,
        sku: item.sku,
        hsnCode: item.hsnCode || undefined,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discountPercentage: Number(item.discountPercentage || 0),
        discountAmount: Number(item.discountAmount || 0),
        taxRate: Number(item.taxRate || 0),
        taxableAmount: Number(item.taxableAmount || 0),
        cgstAmount: Number(item.cgstAmount || 0),
        sgstAmount: Number(item.sgstAmount || 0),
        igstAmount: Number(item.igstAmount || 0),
        cessAmount: Number(item.cessAmount || 0),
        lineTotal: Number(item.lineTotal || 0),
      })),
      payments: (inv.payments || []).map((pay: any) => ({
        id: pay.id ? Number(pay.id) : undefined,
        paymentMethod: pay.paymentMethod,
        amount: Number(pay.amount),
        paymentReference: pay.paymentReference,
        notes: pay.notes,
        paymentDate: pay.paymentDate,
      })),
    }));
  } catch (err) {
    console.warn('Error fetching live invoices:', err);
    return null;
  }
}

export async function createLiveInvoice(payload: {
  customerId?: number | null;
  employeeId: number;
  notes?: string;
  items: {
    productId: number;
    quantity: number;
    unitPrice?: number;
    discountPercentage?: number;
  }[];
  payments: {
    paymentMethod: string;
    amount: number;
    paymentReference?: string;
    notes?: string;
  }[];
  roundOff?: number;
}): Promise<Invoice | null> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/invoices`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Invoice creation failed');
    }

    const inv = await res.json();
    return {
      id: Number(inv.id),
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      customerId: inv.customerId ? Number(inv.customerId) : null,
      customerName: inv.customerName || undefined,
      employeeId: Number(inv.employeeId || 1),
      employeeName: inv.employeeName || 'Staff',
      subtotal: Number(inv.subtotal || 0),
      discountTotal: Number(inv.discountTotal || 0),
      taxableAmount: Number(inv.taxableAmount || 0),
      cgstTotal: Number(inv.cgstTotal || 0),
      sgstTotal: Number(inv.sgstTotal || 0),
      igstTotal: Number(inv.igstTotal || 0),
      cessTotal: Number(inv.cessTotal || 0),
      roundOff: Number(inv.roundOff || 0),
      grandTotal: Number(inv.grandTotal || 0),
      paymentStatus: inv.paymentStatus,
      invoiceStatus: inv.invoiceStatus,
      notes: inv.notes || undefined,
      items: (inv.items || []).map((item: any) => ({
        id: Number(item.id),
        productId: Number(item.productId),
        productName: item.productName,
        sku: item.sku,
        hsnCode: item.hsnCode || undefined,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discountPercentage: Number(item.discountPercentage || 0),
        discountAmount: Number(item.discountAmount || 0),
        taxRate: Number(item.taxRate || 0),
        taxableAmount: Number(item.taxableAmount || 0),
        cgstAmount: Number(item.cgstAmount || 0),
        sgstAmount: Number(item.sgstAmount || 0),
        igstAmount: Number(item.igstAmount || 0),
        cessAmount: Number(item.cessAmount || 0),
        lineTotal: Number(item.lineTotal || 0),
      })),
      payments: payload.payments.map((p) => ({
        paymentMethod: p.paymentMethod as any,
        amount: p.amount,
        paymentReference: p.paymentReference,
        notes: p.notes,
        paymentDate: new Date().toISOString(),
      })),
    };
  } catch (err) {
    console.error('createLiveInvoice error:', err);
    throw err;
  }
}

// 6. Stock Adjustment
export async function adjustLiveStock(payload: {
  productId: number;
  movementType: string;
  quantity: number;
  reason?: string;
}): Promise<boolean> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/stock/adjust`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Stock adjustment failed');
    }

    return true;
  } catch (err) {
    console.error('adjustLiveStock error:', err);
    throw err;
  }
}

// 7. Offline Reconciliation & Sync Endpoints
export interface SyncItemResultDto {
  clientOfflineId: string;
  serverInvoiceId?: number;
  serverInvoiceNumber?: string;
  status: 'SUCCESS' | 'CONFLICT_RESOLVED' | 'FAILED' | 'ALREADY_SYNCED';
  message: string;
  stockDeficitDetected: boolean;
  invoice?: Invoice;
}

export interface SyncBatchResponseDto {
  totalProcessed: number;
  totalSucceeded: number;
  totalConflicts: number;
  totalFailed: number;
  results: SyncItemResultDto[];
}

export async function syncSingleOfflineInvoiceApi(payload: {
  clientOfflineId: string;
  offlineInvoiceNumber: string;
  offlineTimestamp: string;
  customerId?: number | null;
  employeeId: number;
  notes?: string;
  items: {
    productId: number;
    quantity: number;
    unitPrice?: number;
    discountPercentage?: number;
  }[];
  payments: {
    paymentMethod: string;
    amount: number;
    paymentReference?: string;
    notes?: string;
  }[];
  roundOff?: number;
}): Promise<SyncItemResultDto | null> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/invoices/sync`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Sync failed');
    }

    return await res.json();
  } catch (err) {
    console.error('syncSingleOfflineInvoiceApi error:', err);
    throw err;
  }
}

export async function syncBatchOfflineInvoicesApi(
  invoices: {
    clientOfflineId: string;
    offlineInvoiceNumber: string;
    offlineTimestamp: string;
    customerId?: number | null;
    employeeId: number;
    notes?: string;
    items: {
      productId: number;
      quantity: number;
      unitPrice?: number;
      discountPercentage?: number;
    }[];
    payments: {
      paymentMethod: string;
      amount: number;
      paymentReference?: string;
      notes?: string;
    }[];
    roundOff?: number;
  }[]
): Promise<SyncBatchResponseDto | null> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/invoices/sync/batch`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ invoices }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Batch sync failed');
    }

    return await res.json();
  } catch (err) {
    console.error('syncBatchOfflineInvoicesApi error:', err);
    throw err;
  }
}
