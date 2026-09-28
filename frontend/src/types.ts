export interface Role {
  id: number;
  name: 'ADMIN' | 'MANAGER' | 'BILLER' | 'INVENTORY_MANAGER';
  description?: string;
}

export interface Unit {
  id: number;
  name: string;
  symbol: string;
}

export interface TaxRate {
  id: number;
  name: string;
  taxType: string;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cessRate: number;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface Product {
  id: number;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryId: number;
  categoryName?: string;
  unitId: number;
  unitSymbol?: string;
  taxRateId: number;
  taxRatePercent?: number;
  cgstRate?: number;
  sgstRate?: number;
  hsnCode?: string;
  costPrice: number;
  sellingPrice: number;
  trackStock: boolean;
  currentStock: number;
  minimumStock: number;
  reorderLevel: number;
  targetStock: number;
  isActive: boolean;
}

export interface Customer {
  id: number;
  customerCode?: string;
  name: string;
  phone?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  pincode?: string;
  gstin?: string;
  isActive: boolean;
}

export interface InvoiceItem {
  id?: number;
  productId: number;
  productName: string;
  sku: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: number;
  discountPercentage: number;
  discountAmount: number;
  taxRate: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  lineTotal: number;
}

export interface Payment {
  id?: number;
  paymentMethod: 'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER' | 'OTHER';
  amount: number;
  paymentReference?: string;
  notes?: string;
  paymentDate?: string;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  customerId?: number | null;
  customerName?: string;
  customerPhone?: string;
  customerGstin?: string;
  employeeId: number;
  employeeName: string;
  subtotal: number;
  discountTotal: number;
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  cessTotal: number;
  roundOff: number;
  grandTotal: number;
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  invoiceStatus: 'DRAFT' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  items: InvoiceItem[];
  payments?: Payment[];
}

export interface StockMovement {
  id: number;
  productId: number;
  productName?: string;
  sku?: string;
  movementType: 'OPENING' | 'SALE' | 'PURCHASE' | 'RETURN_IN' | 'RETURN_OUT' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'DAMAGE';
  quantity: number;
  referenceType?: string;
  referenceId?: number;
  quantityBefore: number;
  quantityAfter: number;
  reason?: string;
  createdBy: string;
  createdAt: string;
}

export interface CompanySetting {
  id: number;
  companyName: string;
  legalName?: string;
  addressLine1: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  gstin?: string;
  phone: string;
  email: string;
  currencyCode: string;
  invoicePrefix: string;
}
