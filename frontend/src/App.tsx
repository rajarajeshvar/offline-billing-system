import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { BillingTerminal } from './components/BillingTerminal';
import { InventoryManager } from './components/InventoryManager';
import { InvoiceHistory } from './components/InvoiceHistory';
import { StockMovementLedger } from './components/StockMovementLedger';
import { CustomerMaster } from './components/CustomerMaster';
import { InvoicePrintModal } from './components/InvoicePrintModal';
import { SyncQueueModal } from './components/SyncQueueModal';
import { LoginPortal } from './components/LoginPortal';
import {
  initialCategories,
  initialCompanySettings,
  initialCustomers,
  initialInvoices,
  initialProducts,
  initialStockMovements,
  initialTaxRates,
  initialUnits,
} from './mockData';
import { Customer, Invoice, Payment, Product, StockMovement } from './types';
import {
  checkBackendConnection,
  fetchLiveProducts,
  fetchLiveCustomers,
  fetchLiveInvoices,
  createLiveInvoice,
  createLiveProduct,
  createLiveCustomer,
  adjustLiveStock,
  updateLiveProductPrice,
  syncBatchOfflineInvoicesApi,
  AuthSession,
  getStoredSession,
  isTerminalLocked,
  setTerminalLocked,
  logoutUser,
} from './api';
import {
  getQueuedInvoices,
  enqueueOfflineInvoice,
  updateQueuedInvoice,
  getPendingCount,
  QueuedOfflineInvoice,
} from './syncQueue';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('billing');
  const [isLiveDb, setIsLiveDb] = useState<boolean>(false);

  // Authentication & Shift Lock Session State
  const [currentSession, setCurrentSession] = useState<AuthSession | null>(() => getStoredSession());
  const [isLocked, setIsLocked] = useState<boolean>(() => isTerminalLocked());

  // Business master setup
  const [company] = useState(initialCompanySettings);
  const [categories] = useState(initialCategories);
  const [units] = useState(initialUnits);
  const [taxRates] = useState(initialTaxRates);

  // Core application state
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('obs_products');
    return saved ? JSON.parse(saved) : initialProducts;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('obs_customers');
    if (!saved) return initialCustomers;
    try {
      const parsed: Customer[] = JSON.parse(saved);
      return parsed.map((c) => ({
        ...c,
        customerType: c.customerType || (c.gstin ? 'B2B' : 'B2C'),
        customerSegment: c.customerSegment || (c.gstin ? 'LARGE' : 'SMALL'),
        defaultDiscountPercentage: c.defaultDiscountPercentage ?? 0,
      }));
    } catch {
      return initialCustomers;
    }
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem('obs_invoices');
    return saved ? JSON.parse(saved) : initialInvoices;
  });

  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => {
    const saved = localStorage.getItem('obs_stock_movements');
    return saved ? JSON.parse(saved) : initialStockMovements;
  });

  const [sequenceCounter, setSequenceCounter] = useState<number>(() => {
    const saved = localStorage.getItem('obs_sequence');
    return saved ? Number(saved) : initialInvoices.length + 1;
  });

  const [activePrintInvoice, setActivePrintInvoice] = useState<Invoice | null>(null);

  // Offline Sync Queue state
  const [syncQueue, setSyncQueue] = useState<QueuedOfflineInvoice[]>(() => getQueuedInvoices());
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Execute Batch Sync to PostgreSQL
  const handleSyncAll = useCallback(async () => {
    const queue = getQueuedInvoices();
    const pending = queue.filter((q) => q.status === 'PENDING' || q.status === 'FAILED');
    if (pending.length === 0) return;

    setIsSyncing(true);
    try {
      const batchPayload = pending.map((item) => ({
        clientOfflineId: item.clientOfflineId,
        offlineInvoiceNumber: item.offlineInvoiceNumber,
        offlineTimestamp: item.offlineTimestamp,
        customerId: item.customerId,
        employeeId: item.employeeId,
        notes: item.notes,
        items: item.items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discountPercentage: it.discountPercentage || 0,
        })),
        payments: item.payments.map((p) => ({
          paymentMethod: p.paymentMethod,
          amount: p.amount,
          paymentReference: p.paymentReference || 'OFFLINE-SYNC',
          notes: p.notes,
        })),
        roundOff: item.roundOff,
      }));

      const syncResult = await syncBatchOfflineInvoicesApi(batchPayload);

      if (syncResult && syncResult.results) {
        for (const res of syncResult.results) {
          updateQueuedInvoice(res.clientOfflineId, {
            status: res.status as any,
            serverInvoiceNumber: res.serverInvoiceNumber,
            conflictMessage: res.message,
            stockDeficitDetected: res.stockDeficitDetected,
          });

          // Replace offline placeholder invoice numbers with server sequential numbers
          if (res.serverInvoiceNumber) {
            setInvoices((prev) =>
              prev.map((inv) => {
                if (
                  inv.invoiceNumber === res.clientOfflineId ||
                  (inv.notes && inv.notes.includes(res.clientOfflineId))
                ) {
                  return {
                    ...inv,
                    invoiceNumber: res.serverInvoiceNumber!,
                    id: res.serverInvoiceId || inv.id,
                  };
                }
                return inv;
              })
            );
          }
        }

        // Re-fetch products from backend to get live database stock
        const refreshedProds = await fetchLiveProducts();
        if (refreshedProds) setProducts(refreshedProds);
      }
    } catch (err) {
      console.error('Error during batch synchronization:', err);
    } finally {
      setSyncQueue(getQueuedInvoices());
      setIsSyncing(false);
    }
  }, []);

  // Sync to PostgreSQL on load + check connection
  const syncWithBackend = useCallback(async () => {
    try {
      const connected = await checkBackendConnection();
      setIsLiveDb(connected);

      if (connected) {
        const [liveProds, liveCusts, liveInvs] = await Promise.all([
          fetchLiveProducts(),
          fetchLiveCustomers(),
          fetchLiveInvoices(),
        ]);

        if (liveProds && liveProds.length > 0) {
          setProducts(liveProds);
        }
        if (liveCusts && liveCusts.length > 0) {
          setCustomers(liveCusts);
        }
        if (liveInvs && liveInvs.length > 0) {
          setInvoices(liveInvs);
        }

        // Auto-reconciliation: trigger sync if there are pending offline invoices
        if (getPendingCount() > 0) {
          console.log('Online reconnection detected: auto-syncing pending offline invoices...');
          await handleSyncAll();
        }
      }
    } catch (err) {
      console.warn('Backend sync failed, running in offline mode:', err);
      setIsLiveDb(false);
    }
  }, [handleSyncAll]);

  useEffect(() => {
    syncWithBackend();
    const interval = setInterval(syncWithBackend, 15000);
    return () => clearInterval(interval);
  }, [syncWithBackend]);

  // Sync to local storage for guaranteed offline continuity
  useEffect(() => {
    localStorage.setItem('obs_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('obs_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('obs_invoices', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem('obs_stock_movements', JSON.stringify(stockMovements));
  }, [stockMovements]);

  useEffect(() => {
    localStorage.setItem('obs_sequence', String(sequenceCounter));
  }, [sequenceCounter]);

  // Restrict Cashier navigation to permitted views (POS, Invoices, Customers)
  useEffect(() => {
    if (currentSession?.role === 'BILLER' && !['billing', 'invoices', 'customers'].includes(activeTab)) {
      setActiveTab('billing');
    }
  }, [currentSession, activeTab]);

  // Terminal Lock keyboard shortcut (Ctrl+L or F12)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key.toLowerCase() === 'l') || e.key === 'F12') {
        e.preventDefault();
        if (currentSession) {
          setTerminalLocked(true);
          setIsLocked(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSession]);

  // Execute Complete Sale (Billing Transaction)
  const handleCompleteSale = async (
    invoicePayload: Omit<Invoice, 'id' | 'invoiceNumber'>,
    payments: Payment[]
  ) => {
    const activeUserId = currentSession?.userId || 1;
    const activeOperator = currentSession?.username || 'cashier';

    if (isLiveDb) {
      try {
        const liveInvoice = await createLiveInvoice({
          customerId: invoicePayload.customerId || null,
          employeeId: activeUserId,
          notes: invoicePayload.notes,
          items: invoicePayload.items.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discountPercentage: it.discountPercentage || 0,
          })),
          payments: payments.map((p) => ({
            paymentMethod: p.paymentMethod,
            amount: p.amount,
            paymentReference: p.paymentReference || 'POS-DIRECT',
            notes: p.notes,
          })),
          roundOff: invoicePayload.roundOff,
        });

        if (liveInvoice) {
          const refreshedProds = await fetchLiveProducts();
          if (refreshedProds) setProducts(refreshedProds);

          setInvoices((prev) => [liveInvoice, ...prev]);

          const newMovements: StockMovement[] = invoicePayload.items.map((item) => {
            const prod = products.find((p) => p.id === item.productId);
            const qtyBefore = prod ? prod.currentStock : 0;
            const qtyAfter = Math.max(0, qtyBefore - item.quantity);
            return {
              id: Date.now() + Math.random(),
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              movementType: 'SALE',
              quantity: item.quantity,
              referenceType: 'INVOICE',
              referenceId: liveInvoice.id,
              quantityBefore: qtyBefore,
              quantityAfter: qtyAfter,
              reason: `Live Sale #${liveInvoice.invoiceNumber} recorded by ${activeOperator}`,
              createdBy: activeOperator,
              createdAt: new Date().toISOString(),
            };
          });
          setStockMovements((prev) => [...newMovements, ...prev]);
          setActivePrintInvoice(liveInvoice);
          return;
        }
      } catch (err: any) {
        console.warn('Live database invoice creation error; queuing for offline sync:', err);
      }
    }

    // Offline Billing Execution with Persistent Queue
    const nextSeq = sequenceCounter;
    setSequenceCounter(nextSeq + 1);

    const clientOfflineId = `OFFLINE-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const generatedNumber = `OFFLINE/2026-2027/${String(nextSeq).padStart(5, '0')}`;
    const newInvoiceId = invoices.length > 0 ? Math.max(...invoices.map((i) => i.id)) + 1 : 1;

    // Enqueue in persistent offline sync queue
    enqueueOfflineInvoice({
      clientOfflineId,
      offlineInvoiceNumber: generatedNumber,
      offlineTimestamp: new Date().toISOString(),
      customerId: invoicePayload.customerId,
      customerName: invoicePayload.customerName,
      employeeId: activeUserId,
      notes: (invoicePayload.notes || '') + ` [OfflineID: ${clientOfflineId}]`,
      items: invoicePayload.items,
      payments: payments,
      subtotal: invoicePayload.subtotal,
      taxableAmount: invoicePayload.taxableAmount,
      cgstTotal: invoicePayload.cgstTotal,
      sgstTotal: invoicePayload.sgstTotal,
      grandTotal: invoicePayload.grandTotal,
      roundOff: invoicePayload.roundOff,
    });
    setSyncQueue(getQueuedInvoices());

    const newInvoice: Invoice = {
      ...invoicePayload,
      id: newInvoiceId,
      invoiceNumber: generatedNumber,
      notes: (invoicePayload.notes || '') + ` [OfflineID: ${clientOfflineId}]`,
      payments: payments,
    };

    setProducts((prevProducts) =>
      prevProducts.map((p) => {
        const billedItem = invoicePayload.items.find((item) => item.productId === p.id);
        if (billedItem && p.trackStock) {
          return {
            ...p,
            currentStock: Math.max(0, p.currentStock - billedItem.quantity),
          };
        }
        return p;
      })
    );

    const newMovements: StockMovement[] = invoicePayload.items.map((item) => {
      const prod = products.find((p) => p.id === item.productId);
      const qtyBefore = prod ? prod.currentStock : 0;
      const qtyAfter = Math.max(0, qtyBefore - item.quantity);

      return {
        id: Date.now() + Math.random(),
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        movementType: 'SALE',
        quantity: item.quantity,
        referenceType: 'INVOICE',
        referenceId: newInvoiceId,
        quantityBefore: qtyBefore,
        quantityAfter: qtyAfter,
        reason: `Offline Sale #${generatedNumber} (Queued for Sync)`,
        createdBy: activeOperator,
        createdAt: new Date().toISOString(),
      };
    });

    setStockMovements((prev) => [...newMovements, ...prev]);
    setInvoices((prev) => [newInvoice, ...prev]);
    setActivePrintInvoice(newInvoice);
  };

  // Handle Stock Adjustment
  const handleAdjustStock = async (
    productId: number,
    type: StockMovement['movementType'],
    qty: number,
    reason: string
  ) => {
    if (isLiveDb) {
      try {
        await adjustLiveStock({
          productId,
          movementType: type,
          quantity: qty,
          reason,
        });
        const refreshedProds = await fetchLiveProducts();
        if (refreshedProds) {
          setProducts(refreshedProds);
          return;
        }
      } catch (err) {
        console.warn('Live stock adjust error, falling back to local state:', err);
      }
    }

    const targetProduct = products.find((p) => p.id === productId);
    if (!targetProduct) return;

    const qtyBefore = targetProduct.currentStock;
    let qtyAfter = qtyBefore;

    if (type === 'ADJUSTMENT_IN' || type === 'PURCHASE' || type === 'RETURN_IN') {
      qtyAfter = qtyBefore + qty;
    } else {
      qtyAfter = Math.max(0, qtyBefore - qty);
    }

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, currentStock: qtyAfter } : p))
    );

    const movement: StockMovement = {
      id: Date.now(),
      productId: targetProduct.id,
      productName: targetProduct.name,
      sku: targetProduct.sku,
      movementType: type,
      quantity: qty,
      referenceType: 'MANUAL_ADJUSTMENT',
      quantityBefore: qtyBefore,
      quantityAfter: qtyAfter,
      reason: reason,
      createdBy: 'admin',
      createdAt: new Date().toISOString(),
    };

    setStockMovements((prev) => [movement, ...prev]);
  };

  // Add Catalog Product
  const handleAddProduct = async (
    productPayload: Omit<Product, 'id' | 'currentStock' | 'isActive'>,
    initialStock: number
  ) => {
    if (isLiveDb) {
      try {
        const liveProd = await createLiveProduct({
          sku: productPayload.sku,
          barcode: productPayload.barcode,
          name: productPayload.name,
          description: productPayload.description,
          categoryId: productPayload.categoryId,
          unitId: productPayload.unitId,
          taxRateId: productPayload.taxRateId,
          hsnCode: productPayload.hsnCode,
          costPrice: productPayload.costPrice,
          sellingPrice: productPayload.sellingPrice,
          trackStock: productPayload.trackStock,
          minimumStock: productPayload.minimumStock,
          reorderLevel: productPayload.reorderLevel,
          targetStock: productPayload.targetStock,
          initialStock: initialStock,
        });

        if (liveProd) {
          setProducts((prev) => [liveProd, ...prev]);
          return;
        }
      } catch (err) {
        console.warn('Live product creation error, falling back:', err);
      }
    }

    const newId = products.length > 0 ? Math.max(...products.map((p) => p.id)) + 1 : 1;
    const newProduct: Product = {
      ...productPayload,
      id: newId,
      currentStock: initialStock,
      isActive: true,
    };

    setProducts((prev) => [newProduct, ...prev]);

    if (initialStock > 0) {
      const movement: StockMovement = {
        id: Date.now(),
        productId: newId,
        productName: newProduct.name,
        sku: newProduct.sku,
        movementType: 'OPENING',
        quantity: initialStock,
        quantityBefore: 0,
        quantityAfter: initialStock,
        reason: 'Initial Opening Stock Count',
        createdBy: 'admin',
        createdAt: new Date().toISOString(),
      };
      setStockMovements((prev) => [movement, ...prev]);
    }
  };

  // Adjust Product Price (Admin & Manager)
  const handleUpdateProductPrice = async (
    productId: number,
    newSellingPrice: number,
    newCostPrice?: number
  ) => {
    if (isLiveDb) {
      try {
        const updated = await updateLiveProductPrice(productId, newSellingPrice, newCostPrice);
        if (updated) {
          setProducts((prev) =>
            prev.map((p) => (p.id === productId ? updated : p))
          );
          return;
        }
      } catch (err: any) {
        console.warn('Failed to update product price in live database:', err);
      }
    }

    // Offline / Local State update
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          return {
            ...p,
            sellingPrice: newSellingPrice,
            costPrice: newCostPrice !== undefined ? newCostPrice : p.costPrice,
          };
        }
        return p;
      })
    );
  };

  // Add Customer (Admin, Manager, and Cashier)
  const handleAddCustomer = async (customerPayload: Omit<Customer, 'id' | 'isActive'>): Promise<Customer> => {
    if (isLiveDb) {
      try {
        const liveCust = await createLiveCustomer(customerPayload);
        if (liveCust) {
          setCustomers((prev) => [...prev, liveCust]);
          return liveCust;
        }
      } catch (err) {
        console.warn('Live customer creation error, falling back:', err);
      }
    }

    const newId = customers.length > 0 ? Math.max(...customers.map((c) => c.id)) + 1 : 1;
    const newCustomer: Customer = {
      ...customerPayload,
      id: newId,
      isActive: true,
    };
    setCustomers((prev) => [...prev, newCustomer]);
    return newCustomer;
  };

  const pendingSyncCount = syncQueue.filter((q) => q.status === 'PENDING' || q.status === 'FAILED').length;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Top Navigation Bar with Live Database Status, Operator Profile, & Offline Sync Queue */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        company={company}
        cartCount={0}
        isLiveDb={isLiveDb}
        pendingSyncCount={pendingSyncCount}
        onOpenSyncQueue={() => {
          setSyncQueue(getQueuedInvoices());
          setIsSyncModalOpen(true);
        }}
        currentSession={currentSession}
        onLockTerminal={() => {
          setTerminalLocked(true);
          setIsLocked(true);
        }}
        onSwitchUser={() => {
          logoutUser();
          setCurrentSession(null);
          setIsLocked(false);
        }}
        onLogout={() => {
          logoutUser();
          setCurrentSession(null);
          setIsLocked(false);
        }}
      />

      {/* Main Workspace Body */}
      <main style={{ flex: 1, maxWidth: '1600px', width: '100%', margin: '0 auto', padding: '16px 20px', boxSizing: 'border-box', minWidth: 0 }}>
        {activeTab === 'billing' && (
          <BillingTerminal
            products={products}
            customers={customers}
            onCompleteSale={handleCompleteSale}
            currentSession={currentSession}
            onAddCustomer={handleAddCustomer}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryManager
            products={products}
            categories={categories}
            units={units}
            taxRates={taxRates}
            onAdjustStock={handleAdjustStock}
            onAddProduct={handleAddProduct}
            onUpdatePrice={handleUpdateProductPrice}
            isAdminOrManager={currentSession?.role === 'ADMIN' || currentSession?.role === 'MANAGER'}
          />
        )}

        {activeTab === 'invoices' && (
          <InvoiceHistory
            invoices={invoices}
            onViewInvoice={(inv: Invoice) => setActivePrintInvoice(inv)}
          />
        )}

        {activeTab === 'movements' && (
          <StockMovementLedger movements={stockMovements} />
        )}

        {activeTab === 'customers' && (
          <CustomerMaster
            customers={customers}
            invoices={invoices}
            onAddCustomer={handleAddCustomer}
          />
        )}
      </main>

      {/* Instant Thermal Receipt Modal */}
      {activePrintInvoice && (
        <InvoicePrintModal
          invoice={activePrintInvoice}
          company={company}
          onClose={() => setActivePrintInvoice(null)}
        />
      )}

      {/* Offline Sync Queue & Reconciliation Modal */}
      {isSyncModalOpen && (
        <SyncQueueModal
          queue={syncQueue}
          isSyncing={isSyncing}
          onSyncAll={handleSyncAll}
          onRefreshQueue={() => setSyncQueue(getQueuedInvoices())}
          onClose={() => setIsSyncModalOpen(false)}
        />
      )}

      {/* Login Portal & Lock Screen Modal */}
      {(!currentSession || isLocked) && (
        <LoginPortal
          currentSession={currentSession}
          isLocked={isLocked}
          isLiveDb={isLiveDb}
          onLoginSuccess={(session) => {
            setCurrentSession(session);
            setIsLocked(false);
            setTerminalLocked(false);
            if (session.role === 'BILLER') {
              setActiveTab('billing');
            }
          }}
          onUnlockSuccess={() => {
            setIsLocked(false);
            setTerminalLocked(false);
          }}
          onClose={() => {
            setIsLocked(false);
            setTerminalLocked(false);
          }}
        />
      )}
    </div>
  );
};

export default App;
