import React from 'react';
import {
  ShoppingCart,
  Package,
  FileText,
  Activity,
  Users,
  Settings,
  WifiOff,
  ShieldCheck,
  Database,
  RefreshCw,
  Lock,
  LogOut,
  UserCheck,
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
  onLogout,
}) => {
  const isCashier = currentSession?.role === 'BILLER';

  const allTabs = [
    { id: 'billing', label: 'Point of Sale', icon: ShoppingCart, badge: cartCount > 0 ? cartCount : null, roles: ['ADMIN', 'MANAGER', 'BILLER', 'INVENTORY_MANAGER'] },
    { id: 'invoices', label: 'Invoices & Sales', icon: FileText, roles: ['ADMIN', 'MANAGER', 'BILLER'] },
    { id: 'inventory', label: 'Inventory & Stock', icon: Package, roles: ['ADMIN', 'MANAGER', 'INVENTORY_MANAGER'] },
    { id: 'movements', label: 'Stock Audit Ledger', icon: Activity, roles: ['ADMIN', 'MANAGER', 'INVENTORY_MANAGER'] },
    { id: 'customers', label: 'Customer Master', icon: Users, roles: ['ADMIN', 'MANAGER', 'BILLER'] },
  ];

  // Filter tabs according to user role
  const visibleTabs = allTabs.filter(
    (tab) => !currentSession || tab.roles.includes(currentSession.role)
  );

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' };
      case 'MANAGER':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' };
      case 'BILLER':
      default:
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' };
    }
  };

  const badgeColors = getRoleBadgeStyle(currentSession?.role);

  return (
    <header style={{
      background: 'rgba(17, 24, 39, 0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-color)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '0 24px'
    }}>
      <div style={{
        maxWidth: '1600px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '70px',
        gap: '16px'
      }}>
        {/* Brand & Store Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.35)'
          }}>
            <ShoppingCart size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#fff', letterSpacing: '-0.02em' }}>
                {company.companyName}
              </span>
              {isLiveDb ? (
                <span className="badge badge-success" style={{ fontSize: '0.68rem', padding: '3px 9px', display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <Database size={11} /> PostgreSQL Live
                </span>
              ) : (
                <span className="badge badge-warning" style={{ fontSize: '0.68rem', padding: '3px 9px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <WifiOff size={11} /> Offline Cache
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              GSTIN: <span className="mono" style={{ color: 'var(--text-secondary)' }}>{company.gstin || '29ABCDE1234F1Z5'}</span> • Terminal #01 {isLiveDb ? '• Port 8080' : ''}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isActive ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))' : 'transparent',
                  color: isActive ? '#60a5fa' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  outline: isActive ? '1px solid rgba(59, 130, 246, 0.35)' : 'none'
                }}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span style={{
                    background: 'var(--accent-blue)',
                    color: '#fff',
                    borderRadius: '9999px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '1px 6px',
                    marginLeft: '2px'
                  }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Operator Profile, Lock Screen, and Sync Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Offline Sync Queue Button */}
          <button
            onClick={onOpenSyncQueue}
            title="Inspect offline queue and batch sync to PostgreSQL"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: pendingSyncCount > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(31, 41, 55, 0.7)',
              border: pendingSyncCount > 0 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-color)',
              color: pendingSyncCount > 0 ? '#fbbf24' : 'var(--text-secondary)',
              padding: '6px 12px',
              borderRadius: '10px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <RefreshCw size={14} className={pendingSyncCount > 0 ? 'animate-spin' : ''} />
            <span>Sync</span>
            {pendingSyncCount > 0 && (
              <span
                style={{
                  background: '#f59e0b',
                  color: '#000',
                  borderRadius: '9999px',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '1px 6px',
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
              gap: '10px',
              background: 'rgba(31, 41, 55, 0.75)',
              padding: '5px 12px 5px 8px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
            }}
          >
            {/* Operator Avatar */}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: isCashier
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 800,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
              }}
            >
              {currentSession?.employeeName
                ?.split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase() || 'OP'}
            </div>

            {/* Operator Details */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                  {currentSession?.employeeName || 'Operator'}
                </span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: badgeColors.bg,
                    color: badgeColors.text,
                    border: `1px solid ${badgeColors.border}`,
                    lineHeight: 1.3,
                  }}
                >
                  {currentSession?.role === 'BILLER' ? 'CASHIER' : currentSession?.role || 'ADMIN'}
                </span>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.2 }}>
                {currentSession?.shift || 'Active Shift'}
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
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(31, 41, 55, 0.7)',
              border: '1px solid var(--border-color)',
              color: '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#60a5fa';
              e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#94a3b8';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
          >
            <Lock size={16} />
          </button>

          {/* Switch Operator / Logout Button */}
          <button
            onClick={onSwitchUser}
            title="Switch Cashier or Operator"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#f87171',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.22)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
            }}
          >
            <Repeat size={14} />
            <span>Switch</span>
          </button>
        </div>
      </div>
    </header>
  );
};

