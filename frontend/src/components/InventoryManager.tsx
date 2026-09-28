import React, { useState } from 'react';
import { Package, AlertTriangle, Plus, ArrowUpRight, ArrowDownRight, Search, CheckCircle2, Tag, Pencil, TrendingUp } from 'lucide-react';
import { Category, Product, StockMovement, TaxRate, Unit } from '../types';

interface InventoryManagerProps {
  products: Product[];
  categories: Category[];
  units: Unit[];
  taxRates: TaxRate[];
  onAdjustStock: (productId: number, type: StockMovement['movementType'], qty: number, reason: string) => void;
  onAddProduct: (product: Omit<Product, 'id' | 'currentStock' | 'isActive'>, initialStock: number) => void;
  onUpdatePrice?: (productId: number, newSellingPrice: number, newCostPrice?: number) => Promise<boolean | void> | void;
  isAdminOrManager?: boolean;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  products,
  categories,
  units,
  taxRates,
  onAdjustStock,
  onAddProduct,
  onUpdatePrice,
  isAdminOrManager = true,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Price adjustment modal states
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [priceProduct, setPriceProduct] = useState<Product | null>(null);
  const [editSellingPrice, setEditSellingPrice] = useState<string>('');
  const [editCostPrice, setEditCostPrice] = useState<string>('');
  const [priceError, setPriceError] = useState<string | null>(null);
  const [isSavingPrice, setIsSavingPrice] = useState<boolean>(false);

  // Adjustment form states
  const [adjustType, setAdjustType] = useState<StockMovement['movementType']>('ADJUSTMENT_IN');
  const [adjustQty, setAdjustQty] = useState<string>('1');
  const [adjustReason, setAdjustReason] = useState<string>('');

  // Add product form states
  const [newSku, setNewSku] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategoryId, setNewCategoryId] = useState<number>(categories[0]?.id || 1);
  const [newUnitId, setNewUnitId] = useState<number>(units[0]?.id || 1);
  const [newTaxRateId, setNewTaxRateId] = useState<number>(taxRates[3]?.id || 4); // 18%
  const [newCostPrice, setNewCostPrice] = useState('0');
  const [newSellingPrice, setNewSellingPrice] = useState('0');
  const [newInitialStock, setNewInitialStock] = useState('10');
  const [newMinStock, setNewMinStock] = useState('5');
  const [newReorderLevel, setNewReorderLevel] = useState('10');

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm))
  );

  const openAdjustModal = (product: Product) => {
    setSelectedProduct(product);
    setAdjustType('ADJUSTMENT_IN');
    setAdjustQty('1');
    setAdjustReason('');
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const qty = parseFloat(adjustQty);
    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid positive quantity');
      return;
    }

    onAdjustStock(selectedProduct.id, adjustType, qty, adjustReason);
    setIsAdjustModalOpen(false);
  };

  const openPriceModal = (product: Product) => {
    setPriceProduct(product);
    setEditSellingPrice(product.sellingPrice.toString());
    setEditCostPrice(product.costPrice.toString());
    setPriceError(null);
    setIsPriceModalOpen(true);
  };

  const handlePriceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceProduct) return;
    const sPrice = parseFloat(editSellingPrice);
    const cPrice = parseFloat(editCostPrice);

    if (isNaN(sPrice) || sPrice < 0) {
      setPriceError('Please enter a valid non-negative selling price');
      return;
    }
    if (isNaN(cPrice) || cPrice < 0) {
      setPriceError('Please enter a valid non-negative cost price');
      return;
    }

    setIsSavingPrice(true);
    setPriceError(null);
    try {
      if (onUpdatePrice) {
        await onUpdatePrice(priceProduct.id, sPrice, cPrice);
      }
      setIsPriceModalOpen(false);
    } catch (err: any) {
      setPriceError(err.message || 'Failed to update price');
    } finally {
      setIsSavingPrice(false);
    }
  };

  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSku.trim() || !newName.trim()) {
      alert('SKU and Product Name are required');
      return;
    }

    const category = categories.find((c) => c.id === newCategoryId);
    const unit = units.find((u) => u.id === newUnitId);
    const taxRate = taxRates.find((t) => t.id === newTaxRateId);

    const productPayload: Omit<Product, 'id' | 'currentStock' | 'isActive'> = {
      sku: newSku.trim(),
      barcode: newBarcode.trim() || undefined,
      name: newName.trim(),
      categoryId: newCategoryId,
      categoryName: category?.name,
      unitId: newUnitId,
      unitSymbol: unit?.symbol,
      taxRateId: newTaxRateId,
      taxRatePercent: (taxRate?.cgstRate || 0) + (taxRate?.sgstRate || 0),
      cgstRate: taxRate?.cgstRate,
      sgstRate: taxRate?.sgstRate,
      costPrice: parseFloat(newCostPrice) || 0,
      sellingPrice: parseFloat(newSellingPrice) || 0,
      trackStock: true,
      minimumStock: parseFloat(newMinStock) || 0,
      reorderLevel: parseFloat(newReorderLevel) || 0,
      targetStock: (parseFloat(newReorderLevel) || 0) * 2,
    };

    onAddProduct(productPayload, parseFloat(newInitialStock) || 0);
    setIsAddProductModalOpen(false);

    // Reset
    setNewSku('');
    setNewBarcode('');
    setNewName('');
    setNewCostPrice('0');
    setNewSellingPrice('0');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner & Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Catalog Items</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
            {products.length}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tracked Stock Items</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '4px' }}>
            {products.filter((p) => p.trackStock).length}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Low Stock Warnings</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: '4px' }}>
            {products.filter((p) => p.trackStock && p.currentStock <= p.reorderLevel).length}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Out of Stock</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-rose)', marginTop: '4px' }}>
            {products.filter((p) => p.trackStock && p.currentStock <= 0).length}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ position: 'relative', width: '360px' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} size={18} />
          <input
            type="text"
            className="input-field"
            placeholder="Search by SKU, Name or Barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '38px' }}
          />
        </div>

        <button onClick={() => setIsAddProductModalOpen(true)} className="btn btn-primary">
          <Plus size={18} /> Add New Catalog Product
        </button>
      </div>

      {/* Products Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Product Name / SKU</th>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Cost Price</th>
                <th style={{ textAlign: 'right' }}>Selling Price</th>
                <th style={{ textAlign: 'center' }}>Current Stock</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const isLow = product.trackStock && product.currentStock <= product.reorderLevel;
                const isOut = product.trackStock && product.currentStock <= 0;

                return (
                  <tr key={product.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#fff' }}>{product.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        SKU: <span className="mono">{product.sku}</span> | Barcode: {product.barcode || 'N/A'}
                      </div>
                    </td>
                    <td>{product.categoryName || 'General'}</td>
                    <td style={{ textAlign: 'right' }} className="mono">
                      ₹{product.costPrice.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent-blue)' }} className="mono">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px' }}>
                        <span>₹{product.sellingPrice.toFixed(2)}</span>
                        {isAdminOrManager && (
                          <button
                            onClick={() => openPriceModal(product)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              padding: '2px 4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              borderRadius: '4px',
                            }}
                            title="Edit Price"
                          >
                            <Pencil size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: isOut ? 'var(--accent-rose)' : isLow ? 'var(--accent-amber)' : 'var(--accent-emerald)' }} className="mono">
                        {product.currentStock} {product.unitSymbol}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Min: {product.minimumStock} | Reorder: {product.reorderLevel}
                      </div>
                    </td>
                    <td>
                      {isOut ? (
                        <span className="badge badge-danger">Out of Stock</span>
                      ) : isLow ? (
                        <span className="badge badge-warning">Low Stock</span>
                      ) : (
                        <span className="badge badge-paid">Optimal</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        {isAdminOrManager && (
                          <button
                            onClick={() => openPriceModal(product)}
                            className="btn btn-secondary"
                            style={{
                              padding: '5px 10px',
                              fontSize: '0.75rem',
                              background: 'rgba(59, 130, 246, 0.12)',
                              borderColor: 'rgba(59, 130, 246, 0.3)',
                              color: '#60a5fa',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="Adjust Selling Price & Cost Price"
                          >
                            <Tag size={13} />
                            <span>Edit Price</span>
                          </button>
                        )}
                        <button
                          onClick={() => openAdjustModal(product)}
                          className="btn btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                        >
                          Adjust Stock
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Stock Adjustment Modal */}
      {isAdjustModalOpen && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px', padding: '24px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>
              Adjust Inventory Stock
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {selectedProduct.name} (<span className="mono">{selectedProduct.sku}</span>)
            </p>

            <form onSubmit={handleAdjustSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  ADJUSTMENT TYPE
                </label>
                <select
                  className="input-field"
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as any)}
                >
                  <option value="ADJUSTMENT_IN">Inward Stock Adjustment (+)</option>
                  <option value="PURCHASE">Stock Purchase Inward (+)</option>
                  <option value="RETURN_IN">Customer Return Inward (+)</option>
                  <option value="ADJUSTMENT_OUT">Outward Stock Correction (-)</option>
                  <option value="DAMAGE">Damaged / Expired Goods (-)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  QUANTITY ({selectedProduct.unitSymbol})
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  required
                  className="input-field mono"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  REASON / AUDIT NOTE
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="e.g. Physical inventory count correction..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save Movement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Product Modal */}
      {isAddProductModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', padding: '24px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '16px' }}>
              Create New Catalog Product
            </h2>

            <form onSubmit={handleAddProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    SKU CODE *
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field mono"
                    placeholder="e.g. ELEC-KEYB-K120"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    BARCODE / EAN
                  </label>
                  <input
                    type="text"
                    className="input-field mono"
                    placeholder="e.g. 890123456789"
                    value={newBarcode}
                    onChange={(e) => setNewBarcode(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  PRODUCT NAME *
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="e.g. Logitech K120 USB Wired Keyboard"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    CATEGORY
                  </label>
                  <select
                    className="input-field"
                    value={newCategoryId}
                    onChange={(e) => setNewCategoryId(Number(e.target.value))}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    UNIT
                  </label>
                  <select
                    className="input-field"
                    value={newUnitId}
                    onChange={(e) => setNewUnitId(Number(e.target.value))}
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    TAX RATE
                  </label>
                  <select
                    className="input-field"
                    value={newTaxRateId}
                    onChange={(e) => setNewTaxRateId(Number(e.target.value))}
                  >
                    {taxRates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    COST PRICE (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-field mono"
                    value={newCostPrice}
                    onChange={(e) => setNewCostPrice(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    SELLING PRICE (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="input-field mono"
                    value={newSellingPrice}
                    onChange={(e) => setNewSellingPrice(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    INITIAL STOCK
                  </label>
                  <input
                    type="number"
                    step="1"
                    className="input-field mono"
                    value={newInitialStock}
                    onChange={(e) => setNewInitialStock(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddProductModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Create Product & Allocate Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Price Adjustment Modal */}
      {isPriceModalOpen && priceProduct && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag size={18} color="#60a5fa" />
                <span>Adjust Product Pricing</span>
              </h2>
              <span className="badge badge-paid" style={{ fontSize: '0.7rem' }}>Admin / Manager Override</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
              {priceProduct.name} (<span className="mono">{priceProduct.sku}</span>)
            </p>

            {priceError && (
              <div style={{ marginBottom: '14px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.8rem' }}>
                {priceError}
              </div>
            )}

            <form onSubmit={handlePriceSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                    NEW SELLING PRICE (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    className="input-field mono"
                    value={editSellingPrice}
                    onChange={(e) => setEditSellingPrice(e.target.value)}
                    style={{ fontSize: '1.05rem', fontWeight: 700, color: '#60a5fa' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Current: ₹{priceProduct.sellingPrice.toFixed(2)}
                  </span>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                    COST PRICE (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input-field mono"
                    value={editCostPrice}
                    onChange={(e) => setEditCostPrice(e.target.value)}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Current: ₹{priceProduct.costPrice.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Profit Margin Preview Card */}
              {(() => {
                const sPrice = parseFloat(editSellingPrice) || 0;
                const cPrice = parseFloat(editCostPrice) || 0;
                const profit = sPrice - cPrice;
                const marginPct = sPrice > 0 ? (profit / sPrice) * 100 : 0;
                const isProfitable = profit >= 0;

                return (
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: isProfitable ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    border: isProfitable ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <TrendingUp size={18} color={isProfitable ? '#34d399' : '#f87171'} />
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ESTIMATED GROSS PROFIT</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: isProfitable ? '#34d399' : '#f87171' }} className="mono">
                          {profit >= 0 ? '+' : ''}₹{profit.toFixed(2)} / unit
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PROFIT MARGIN</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: isProfitable ? '#34d399' : '#f87171' }} className="mono">
                        {marginPct.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsPriceModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={isSavingPrice}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSavingPrice}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <CheckCircle2 size={16} />
                  <span>{isSavingPrice ? 'Updating Price...' : 'Save New Price'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
