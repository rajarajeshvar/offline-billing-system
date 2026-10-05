import React from 'react';
import {
  ShoppingCart,
  Package,
  FileText,
  Activity,
  Users,
  WifiOff,
  Database,
  RefreshCw,
  Lock,
  Repeat,
} from 'lucide-react';
import { CompanySetting } from '../types';
import { AuthSession } from '../api';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  company: CompanySetting;
  cartCount: number;
  isLiveDb?: boolean;
  pendingSyncCount?: number;
  onOpenSyncQueue?: () => void;
  currentSession: AuthSession | null;
  onLockTerminal?: () => void;
  onSwitchUser?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  company,
  cartCount,
  isLiveDb,
  pendingSyncCount = 0,
  onOpenSyncQueue,
  currentSession,
  onLockTerminal,
  onSwitchUser,
}) => {
  const isCashier = currentSession?.role === 'BILLER';

  const allTabs = [
    { id: 'billing', label: 'POS', icon: ShoppingCart, badge: cartCount > 0 ? cartCount : null, roles: ['ADMIN', 'MANAGER', 'BILLER', 'INVENTORY_MANAGER'] },
    { id: 'invoices', label: 'Invoices', icon: FileText, roles: ['ADMIN', 'MANAGER', 'BILLER'] },
    { id: 'inventory', label: 'Inventory', icon: Package, roles: ['ADMIN', 'MANAGER', 'INVENTORY_MANAGER'] },
    { id: 'movements', label: 'Ledger', icon: Activity, roles: ['ADMIN', 'MANAGER', 'INVENTORY_MANAGER'] },
    { id: 'customers', label: 'Customers', icon: Users, roles: ['ADMIN', 'MANAGER', 'BILLER'] },
  ];

  // Filter tabs according to user role
  const visibleTabs = allTabs.filter(
    (tab) => !currentSession || tab.roles.includes(currentSession.role)
  );

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return { bg: '#000000', text: '#ffffff', border: '#000000' };
      case 'MANAGER':
        return { bg: '#f4f4f5', text: '#09090b', border: '#d4d4d8' };
      case 'BILLER':
      default:
        return { bg: '#f4f4f5', text: '#09090b', border: '#e4e4e7' };
    }
  };

  const badgeColors = getRoleBadgeStyle(currentSession?.role);

  // Clean initials generator (avoids parenthesis or special characters like "R(")
  const getInitials = (name?: string) => {
    if (!name) return 'OP';
    const clean = name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'OP';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <header
      style={{
        width: '100%',
        background: '#ffffff',
        borderBottom: '1px solid #e4e4e7',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: 0,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div
        style={{
          maxWidth: '1600px',
          width: '100%',
          margin: '0 auto',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '64px',
          gap: '12px',
          boxSizing: 'border-box',
          minWidth: 0,
        }}
      >
        {/* Brand & Store Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
              border: '1px solid #000000',
            }}
          >
            <ShoppingCart size={18} color="#ffffff" strokeWidth={2.4} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: '1.05rem',
                  color: '#09090b',
                  letterSpacing: '-0.02em',
                  whiteSpace: 'nowrap',
                }}
              >
                {company.companyName}
              </span>
              {isLiveDb ? (
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '20px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: '#000000',
                    color: '#ffffff',
                    border: '1px solid #000000',
                  }}
                >
                  <Database size={11} /> PostgreSQL Live
                </span>
              ) : (
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '20px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: '#f4f4f5',
                    color: '#09090b',
                    border: '1px solid #e4e4e7',
                  }}
                >
                  <WifiOff size={11} /> Offline Cache
                </span>
              )}
            </div>
            <div className="header-brand-sub" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              GSTIN: <span className="mono" style={{ color: 'var(--text-secondary)' }}>{company.gstin || '29ABCDE1234F1Z5'}</span> • Terminal #01
            </div>
          </div>
        </div>

        {/* Segmented Navigation Tab Bar */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            background: '#f4f4f5',
            padding: '3px',
            borderRadius: '12px',
            border: '1px solid #e4e4e7',
            flexShrink: 0,
          }}
        >
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 11px',
                  borderRadius: '8px',
                  border: isActive ? '1px solid #000000' : '1px solid transparent',
                  background: isActive ? '#000000' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: isActive ? 800 : 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  position: 'relative',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#000000';
                    e.currentTarget.style.background = '#e4e4e7';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <Icon size={15} strokeWidth={isActive ? 2.4 : 1.8} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    style={{
                      background: isActive ? '#ffffff' : '#000000',
                      color: isActive ? '#000000' : '#ffffff',
                      borderRadius: '9999px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '1px 6px',
                      marginLeft: '2px',
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Operator Profile, Lock Screen, and Sync Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {/* Offline Sync Queue Button */}
          <button
            onClick={onOpenSyncQueue}
            title="Inspect offline queue and batch sync to PostgreSQL"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              height: '34px',
              background: pendingSyncCount > 0 ? '#000000' : '#ffffff',
              border: pendingSyncCount > 0 ? '1px solid #000000' : '1px solid #e4e4e7',
              color: pendingSyncCount > 0 ? '#ffffff' : 'var(--text-secondary)',
              padding: '0 8px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <RefreshCw size={13} className={pendingSyncCount > 0 ? 'animate-spin' : ''} />
            <span className="header-sync-label">Sync</span>
            {pendingSyncCount > 0 && (
              <span
                style={{
                  background: '#ffffff',
                  color: '#000000',
                  borderRadius: '9999px',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  padding: '1px 5px',
                  marginLeft: '2px',
                }}
              >
                {pendingSyncCount}
              </span>
            )}
          </button>

          {/* Active Operator Status Card */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#ffffff',
              padding: '3px 8px 3px 4px',
              borderRadius: '8px',
              border: '1px solid #e4e4e7',
              height: '34px',
            }}
          >
            {/* Operator Avatar */}
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                background: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '0.7rem',
                fontWeight: 800,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
                letterSpacing: '0.02em',
              }}
            >
              {getInitials(currentSession?.employeeName)}
            </div>

            {/* Operator Details */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span
                className="header-operator-name"
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#09090b',
                  whiteSpace: 'nowrap',
                }}
                title={currentSession?.employeeName || 'Operator'}
              >
                {currentSession?.employeeName?.split(' ')[0] || 'Operator'}
              </span>
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  padding: '1px 5px',
                  borderRadius: '4px',
                  background: badgeColors.bg,
                  color: badgeColors.text,
                  border: `1px solid ${badgeColors.border}`,
                  lineHeight: 1.2,
                }}
              >
                {currentSession?.role === 'BILLER' ? 'CASHIER' : currentSession?.role || 'ADMIN'}
              </span>
            </div>
          </div>

          {/* Quick Lock Terminal Button */}
          <button
            onClick={onLockTerminal}
            title="Lock Terminal (Shift stays active)"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: '#ffffff',
              border: '1px solid #e4e4e7',
              color: '#09090b',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.borderColor = '#000000';
              e.currentTarget.style.background = '#000000';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#09090b';
              e.currentTarget.style.borderColor = '#e4e4e7';
              e.currentTarget.style.background = '#ffffff';
            }}
          >
            <Lock size={14} />
          </button>

          {/* Switch Operator / Logout Button */}
          <button
            onClick={onSwitchUser}
            title="Switch Cashier or Operator"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              height: '34px',
              padding: '0 8px',
              borderRadius: '8px',
              background: '#ffffff',
              border: '1px solid #e4e4e7',
              color: '#09090b',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#000000';
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.borderColor = '#000000';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.color = '#09090b';
              e.currentTarget.style.borderColor = '#e4e4e7';
            }}
          >
            <Repeat size={13} />
            <span className="header-switch-label">Switch</span>
          </button>
        </div>
      </div>
    </header>
  );
};
