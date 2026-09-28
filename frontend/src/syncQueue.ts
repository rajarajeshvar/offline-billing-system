import { InvoiceItem, Payment } from './types';

export interface QueuedOfflineInvoice {
  clientOfflineId: string;
  offlineInvoiceNumber: string;
  offlineTimestamp: string;
  customerId?: number | null;
  customerName?: string;
  employeeId: number;
  notes?: string;
  items: InvoiceItem[];
  payments: Payment[];
  subtotal: number;
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  grandTotal: number;
  roundOff: number;
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'CONFLICT_RESOLVED' | 'FAILED';
  serverInvoiceNumber?: string;
  conflictMessage?: string;
  stockDeficitDetected?: boolean;
  retries: number;
  createdAt: string;
}

const STORAGE_KEY = 'obs_offline_sync_queue';

export function getQueuedInvoices(): QueuedOfflineInvoice[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error reading offline sync queue:', err);
    return [];
  }
}

export function saveQueuedInvoices(queue: QueuedOfflineInvoice[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Error saving offline sync queue:', err);
  }
}

export function enqueueOfflineInvoice(invoice: Omit<QueuedOfflineInvoice, 'status' | 'retries' | 'createdAt'>): QueuedOfflineInvoice {
  const queue = getQueuedInvoices();
  const entry: QueuedOfflineInvoice = {
    ...invoice,
    status: 'PENDING',
    retries: 0,
    createdAt: new Date().toISOString(),
  };

  queue.push(entry);
  saveQueuedInvoices(queue);
  return entry;
}

export function updateQueuedInvoice(
  clientOfflineId: string,
  updates: Partial<QueuedOfflineInvoice>
): void {
  const queue = getQueuedInvoices();
  const index = queue.findIndex((q) => q.clientOfflineId === clientOfflineId);
  if (index !== -1) {
    queue[index] = { ...queue[index], ...updates };
    saveQueuedInvoices(queue);
  }
}

export function removeQueuedInvoice(clientOfflineId: string): void {
  const queue = getQueuedInvoices().filter((q) => q.clientOfflineId !== clientOfflineId);
  saveQueuedInvoices(queue);
}

export function clearSyncedInvoices(): void {
  const queue = getQueuedInvoices().filter((q) => q.status === 'PENDING' || q.status === 'FAILED');
  saveQueuedInvoices(queue);
}

export function getPendingCount(): number {
  return getQueuedInvoices().filter((q) => q.status === 'PENDING' || q.status === 'FAILED').length;
}
