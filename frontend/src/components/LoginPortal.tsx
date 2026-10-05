import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Lock,
  Unlock,
  KeyRound,
  Database,
  WifiOff,
  User,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  Delete,
  Sparkles,
  X,
} from 'lucide-react';
import {
  AuthSession,
  CashierAccount,
  PRESET_USERS,
  loginWithCredentials,
  loginWithPin,
  logoutUser,
  setTerminalLocked,
} from '../api';

interface LoginPortalProps {
  currentSession: AuthSession | null;
  isLocked: boolean;
  isLiveDb: boolean;
  onLoginSuccess: (session: AuthSession) => void;
  onUnlockSuccess: () => void;
  onClose?: () => void;
}

export const LoginPortal: React.FC<LoginPortalProps> = ({
  currentSession,
  isLocked,
  isLiveDb,
  onLoginSuccess,
  onUnlockSuccess,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'cashier' | 'admin'>('cashier');
  const [selectedCashier, setSelectedCashier] = useState<CashierAccount | null>(
    PRESET_USERS.find((u) => u.role === 'BILLER') || PRESET_USERS[0]
  );
  const [pin, setPin] = useState<string>('');
  const [adminUsername, setAdminUsername] = useState<string>('admin');
  const [adminPassword, setAdminPassword] = useState<string>('Admin@Offline123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // If locked, find the current operator for unlock
  const lockedUser = PRESET_USERS.find(
    (u) => u.username.toLowerCase() === currentSession?.username?.toLowerCase()
  );

  // Handle hardware keyboard input for PIN
  useEffect(() => {
    if (activeTab === 'cashier' || isLocked) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key >= '0' && e.key <= '9') {
          if (pin.length < 6) {
            setPin((prev) => prev + e.key);
            setErrorMsg(null);
          }
        } else if (e.key === 'Backspace') {
          setPin((prev) => prev.slice(0, -1));
          setErrorMsg(null);
        } else if (e.key === 'Enter') {
          if (isLocked) {
            handleUnlock();
          } else if (selectedCashier && pin.length >= 4) {
            handleCashierPinSubmit();
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [activeTab, isLocked, pin, selectedCashier]);

  // Handle PIN digit press
  const handleKeypadPress = (val: string) => {
    setErrorMsg(null);
    if (val === 'backspace') {
      setPin((prev) => prev.slice(0, -1));
    } else if (val === 'clear') {
      setPin('');
    } else {
      if (pin.length < 6) {
        setPin((prev) => prev + val);
      }
    }
  };

  // Submit Cashier PIN
  const handleCashierPinSubmit = async (targetCashier = selectedCashier, targetPin = pin) => {
    if (!targetCashier) {
      setErrorMsg('Please select a cashier profile');
      return;
    }
    if (!targetPin || targetPin.length < 4) {
      setErrorMsg('Please enter a 4-digit PIN');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await loginWithPin(targetCashier.id, targetPin);
      if (res.success && res.session) {
        setTerminalLocked(false);
        onLoginSuccess(res.session);
      } else {
        setErrorMsg(res.error || 'Incorrect PIN. Please try again.');
        setPin('');
      }
    } catch {
      setErrorMsg('Login failed. Please try again.');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Admin / Manager Credentials
  const handleAdminSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!adminUsername.trim() || !adminPassword) {
      setErrorMsg('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await loginWithCredentials(adminUsername, adminPassword);
      if (res.success && res.session) {
        setTerminalLocked(false);
        onLoginSuccess(res.session);
      } else {
        setErrorMsg(res.error || 'Invalid credentials');
      }
    } catch {
      setErrorMsg('Authentication service unavailable');
    } finally {
      setIsLoading(false);
    }
  };

  // Unlock Terminal
  const handleUnlock = async () => {
    if (!pin.trim()) {
      setErrorMsg('Please enter your unlock PIN or password');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    // Try PIN unlock first
    if (lockedUser) {
      if (lockedUser.pin === pin.trim() || lockedUser.password === pin.trim()) {
        setTerminalLocked(false);
        onUnlockSuccess();
        setIsLoading(false);
        return;
      }
    }

    // Try live verification if lockedUser not in presets
    if (currentSession) {
      const res = await loginWithCredentials(currentSession.username, pin.trim());
      if (res.success) {
        setTerminalLocked(false);
        onUnlockSuccess();
        setIsLoading(false);
        return;
      }
    }

    setErrorMsg('Invalid unlock PIN / password');
    setPin('');
    setIsLoading(false);
  };

  // Switch Operator from Lock Screen
  const handleSwitchOperator = () => {
    logoutUser();
    window.location.reload();
  };

  // Clean initials generator (handles "Rajan (Administrator)" cleanly -> "RA" instead of "R(")
  const getCleanInitials = (name?: string) => {
    if (!name) return 'OP';
    const clean = name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'OP';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Close / Exit to Dashboard handler
  const handleDismissToDashboard = () => {
    setTerminalLocked(false);
    if (onClose) {
      onClose();
    } else if (onUnlockSuccess) {
      onUnlockSuccess();
    }
    // If user somehow doesn't have an active session yet, log them in as default user so dashboard opens
    if (!currentSession) {
      const defaultUser = PRESET_USERS[0];
      loginWithCredentials(defaultUser.username, defaultUser.password || '').then((res) => {
        if (res.success && res.session) {
          onLoginSuccess(res.session);
        }
      });
    }
  };

  // Quick Demo Login helper
  const handleQuickLogin = (user: CashierAccount) => {
    if (user.role === 'BILLER') {
      setSelectedCashier(user);
      setActiveTab('cashier');
      setPin(user.pin);
      handleCashierPinSubmit(user, user.pin);
    } else {
      setActiveTab('admin');
      setAdminUsername(user.username);
      setAdminPassword(user.password || '');
      loginWithCredentials(user.username, user.password || '').then((res) => {
        if (res.success && res.session) {
          setTerminalLocked(false);
          onLoginSuccess(res.session);
        }
      });
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflowY: 'auto',
      }}
    >
      {/* Main Container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: isLocked ? '480px' : '780px',
          background: '#ffffff',
          border: '1px solid #e4e4e7',
          borderRadius: '24px',
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
        }}
      >
        {/* Top Header Bar */}
        <div
          style={{
            padding: '20px 24px 18px',
            borderBottom: '1px solid #e4e4e7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            background: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
              }}
            >
              {isLocked ? <Lock size={20} color="#ffffff" /> : <ShieldCheck size={20} color="#ffffff" />}
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#09090b', margin: 0, letterSpacing: '-0.02em' }}>
                {isLocked ? 'Terminal Locked' : 'Offline Billing Portal'}
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                {isLocked
                  ? 'Enter PIN or password to resume shift'
                  : 'Select Cashier for fast POS access or login as Administrator'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Connection Status Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 11px',
                borderRadius: '20px',
                background: '#ffffff',
                border: '1px solid #e4e4e7',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: '#09090b',
                whiteSpace: 'nowrap',
              }}
            >
              {isLiveDb ? <Database size={12} /> : <WifiOff size={12} />}
              <span>{isLiveDb ? 'PostgreSQL Live' : 'Offline Terminal'}</span>
            </div>

            {/* Close Button to return to dashboard */}
            <button
              onClick={handleDismissToDashboard}
              title="Close and return to Dashboard"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: '#ffffff',
                border: '1px solid #e4e4e7',
                color: '#09090b',
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
              <X size={18} />
            </button>
          </div>
        </div>

        {/* LOCKED SCREEN VIEW */}
        {isLocked ? (
          <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Operator Avatar */}
            <div
              style={{
                width: '74px',
                height: '74px',
                borderRadius: '50%',
                background: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '1.75rem',
                fontWeight: 800,
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
                marginBottom: '14px',
                border: '2px solid #000000',
              }}
            >
              {getCleanInitials(currentSession?.employeeName)}
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#09090b', margin: 0 }}>
              {currentSession?.employeeName || 'Active Operator'}
            </h3>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 10px',
                borderRadius: '8px',
                background: '#f4f4f5',
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
                marginTop: '6px',
                fontWeight: 600,
                border: '1px solid #e4e4e7',
              }}
            >
              <span>{currentSession?.role || 'BILLER'}</span>
              <span>•</span>
              <span>{currentSession?.shift || 'Terminal 01'}</span>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div
                style={{
                  width: '100%',
                  marginTop: '18px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: '#f4f4f5',
                  border: '1px solid #e4e4e7',
                  color: '#09090b',
                  fontSize: '0.825rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* PIN Dots Display */}
            <div style={{ margin: '24px 0 16px', display: 'flex', gap: '12px' }}>
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: '2px solid #000000',
                    background: pin.length > idx ? '#000000' : 'transparent',
                    transition: 'all 0.15s ease',
                  }}
                />
              ))}
            </div>

            {/* Numeric Keypad for Unlock */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                width: '100%',
                maxWidth: '280px',
                marginBottom: '20px',
              }}
            >
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handleKeypadPress(digit)}
                  style={{
                    height: '52px',
                    borderRadius: '12px',
                    border: '1px solid #e4e4e7',
                    background: '#f8fafc',
                    color: '#09090b',
                    fontSize: '1.25rem',
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
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.color = '#09090b';
                    e.currentTarget.style.borderColor = '#e4e4e7';
                  }}
                >
                  {digit}
                </button>
              ))}
              <button
                onClick={() => handleKeypadPress('clear')}
                style={{
                  height: '52px',
                  borderRadius: '12px',
                  border: '1px solid #e4e4e7',
                  background: '#f4f4f5',
                  color: '#09090b',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
              <button
                onClick={() => handleKeypadPress('0')}
                style={{
                  height: '52px',
                  borderRadius: '12px',
                  border: '1px solid #e4e4e7',
                  background: '#f8fafc',
                  color: '#09090b',
                  fontSize: '1.25rem',
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
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.color = '#09090b';
                  e.currentTarget.style.borderColor = '#e4e4e7';
                }}
              >
                0
              </button>
              <button
                onClick={() => handleKeypadPress('backspace')}
                style={{
                  height: '52px',
                  borderRadius: '12px',
                  border: '1px solid #e4e4e7',
                  background: '#f4f4f5',
                  color: '#09090b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Delete size={20} />
              </button>
            </div>

            {/* Unlock Button */}
            <button
              onClick={handleUnlock}
              disabled={isLoading || pin.length < 4}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid #000000',
                background: '#000000',
                color: '#ffffff',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: pin.length >= 4 ? 'pointer' : 'not-allowed',
                opacity: pin.length >= 4 ? 1 : 0.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
              }}
            >
              <Unlock size={18} />
              <span>{isLoading ? 'Verifying PIN...' : 'Unlock Terminal'}</span>
            </button>

            {/* Return to Dashboard Button */}
            <button
              onClick={handleDismissToDashboard}
              style={{
                width: '100%',
                marginTop: '10px',
                padding: '11px',
                borderRadius: '12px',
                border: '1px solid #e4e4e7',
                background: '#ffffff',
                color: '#09090b',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
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
            >
              <ArrowLeft size={16} />
              <span>Back to Dashboard</span>
            </button>

            {/* Switch Operator */}
            <button
              onClick={handleSwitchOperator}
              style={{
                marginTop: '16px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.825rem',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Switch Operator / Sign Out
            </button>
          </div>
        ) : (
          /* STANDARD LOGIN PORTAL (Cashier PIN or Admin Credentials) */
          <div>
            {/* Tabs: Cashier PIN vs Admin Credentials */}
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid #e4e4e7',
                background: '#f8fafc',
              }}
            >
              <button
                onClick={() => {
                  setActiveTab('cashier');
                  setErrorMsg(null);
                }}
                style={{
                  flex: 1,
                  padding: '16px',
                  border: 'none',
                  background: activeTab === 'cashier' ? '#ffffff' : 'transparent',
                  borderBottom: activeTab === 'cashier' ? '2px solid #000000' : '2px solid transparent',
                  color: activeTab === 'cashier' ? '#000000' : 'var(--text-secondary)',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                }}
              >
                <UserCheck size={18} />
                <span>Cashier Quick Access (PIN)</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('admin');
                  setErrorMsg(null);
                }}
                style={{
                  flex: 1,
                  padding: '16px',
                  border: 'none',
                  background: activeTab === 'admin' ? '#ffffff' : 'transparent',
                  borderBottom: activeTab === 'admin' ? '2px solid #000000' : '2px solid transparent',
                  color: activeTab === 'admin' ? '#000000' : 'var(--text-secondary)',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                }}
              >
                <ShieldCheck size={18} />
                <span>Admin & Manager Portal</span>
              </button>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div
                style={{
                  margin: '20px 32px 0',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* TAB CONTENT */}
            {activeTab === 'cashier' ? (
              /* CASHIER QUICK ACCESS VIEW */
              <div style={{ padding: '28px 32px', display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
                {/* Left: Cashier Selection Grid */}
                <div style={{ flex: '1 1 300px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: '#52525b',
                      marginBottom: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Select Cashier Operator
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {PRESET_USERS.filter((u) => u.role === 'BILLER' || u.role === 'MANAGER').map((cashier) => {
                      const isSelected = selectedCashier?.id === cashier.id;
                      return (
                        <div
                          key={cashier.id}
                          onClick={() => {
                            setSelectedCashier(cashier);
                            setPin('');
                            setErrorMsg(null);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px',
                            padding: '12px 16px',
                            borderRadius: '14px',
                            background: isSelected ? '#09090b' : '#ffffff',
                            border: isSelected ? '1.5px solid #000000' : '1px solid #e4e4e7',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            boxShadow: isSelected ? '0 4px 12px rgba(0, 0, 0, 0.12)' : '0 1px 3px rgba(0, 0, 0, 0.04)',
                          }}
                        >
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '50%',
                              background: isSelected ? '#ffffff' : '#09090b',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: isSelected ? '#000000' : '#ffffff',
                              fontWeight: 800,
                              fontSize: '0.95rem',
                              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
                              border: isSelected ? '1px solid #ffffff' : '1px solid #e4e4e7',
                            }}
                          >
                            {cashier.name
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 700, color: isSelected ? '#ffffff' : '#09090b', fontSize: '0.95rem' }}>
                                {cashier.name}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                  background: isSelected ? 'rgba(255, 255, 255, 0.2)' : '#f4f4f5',
                                  color: isSelected ? '#ffffff' : '#52525b',
                                  fontWeight: 700,
                                  border: isSelected ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid #e4e4e7',
                                }}
                              >
                                {cashier.role}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: isSelected ? '#d4d4d8' : '#71717a', marginTop: '2px' }}>
                              {cashier.shift}
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 size={18} color="#ffffff" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right: PIN Keypad */}
                <div
                  style={{
                    flex: '1 1 260px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: '#fafafa',
                    padding: '20px',
                    borderRadius: '16px',
                    border: '1px solid #e4e4e7',
                  }}
                >
                  <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.85rem', color: '#52525b' }}>
                      Enter 4-digit PIN for <strong style={{ color: '#09090b' }}>{selectedCashier?.name}</strong>
                    </div>
                  </div>

                  {/* PIN Circles */}
                  <div style={{ display: 'flex', gap: '10px', margin: '10px 0 18px' }}>
                    {[0, 1, 2, 3].map((idx) => (
                      <div
                        key={idx}
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          border: '2px solid #09090b',
                          background: pin.length > idx ? '#09090b' : 'transparent',
                          transition: 'all 0.15s ease',
                        }}
                      />
                    ))}
                  </div>

                  {/* Keypad */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '10px',
                      width: '100%',
                      maxWidth: '240px',
                      marginBottom: '16px',
                    }}
                  >
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                      <button
                        key={digit}
                        onClick={() => handleKeypadPress(digit)}
                        style={{
                          height: '46px',
                          borderRadius: '10px',
                          border: '1px solid #e4e4e7',
                          background: '#ffffff',
                          color: '#09090b',
                          fontSize: '1.15rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                        }}
                      >
                        {digit}
                      </button>
                    ))}
                    <button
                      onClick={() => handleKeypadPress('clear')}
                      style={{
                        height: '46px',
                        borderRadius: '10px',
                        border: '1px solid #e4e4e7',
                        background: '#f4f4f5',
                        color: '#09090b',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => handleKeypadPress('0')}
                      style={{
                        height: '46px',
                        borderRadius: '10px',
                        border: '1px solid #e4e4e7',
                        background: '#ffffff',
                        color: '#09090b',
                        fontSize: '1.15rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                      }}
                    >
                      0
                    </button>
                    <button
                      onClick={() => handleKeypadPress('backspace')}
                      style={{
                        height: '46px',
                        borderRadius: '10px',
                        border: '1px solid #e4e4e7',
                        background: '#f4f4f5',
                        color: '#09090b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <Delete size={18} />
                    </button>
                  </div>

                  <button
                    onClick={() => handleCashierPinSubmit()}
                    disabled={isLoading || pin.length < 4}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '12px',
                      border: '1px solid #000000',
                      background: '#000000',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      cursor: pin.length >= 4 ? 'pointer' : 'not-allowed',
                      opacity: pin.length >= 4 ? 1 : 0.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
                    }}
                  >
                    <Unlock size={16} />
                    <span>{isLoading ? 'Verifying PIN...' : 'Start Billing Shift'}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* ADMIN & MANAGER CREDENTIALS VIEW */
              <div style={{ padding: '32px', maxWidth: '440px', margin: '0 auto' }}>
                <form onSubmit={handleAdminSubmit}>
                  {/* Username Field */}
                  <div style={{ marginBottom: '18px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: '#52525b',
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Administrator Username
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        value={adminUsername}
                        onChange={(e) => setAdminUsername(e.target.value)}
                        placeholder="admin"
                        style={{
                          width: '100%',
                          padding: '12px 14px 12px 40px',
                          borderRadius: '12px',
                          border: '1px solid #d4d4d8',
                          background: '#ffffff',
                          color: '#09090b',
                          fontSize: '0.95rem',
                          outline: 'none',
                        }}
                      />
                      <User
                        size={18}
                        color="#71717a"
                        style={{ position: 'absolute', left: '13px', top: '14px' }}
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div style={{ marginBottom: '24px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: '#52525b',
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="••••••••••••"
                        style={{
                          width: '100%',
                          padding: '12px 42px 12px 40px',
                          borderRadius: '12px',
                          border: '1px solid #d4d4d8',
                          background: '#ffffff',
                          color: '#09090b',
                          fontSize: '0.95rem',
                          outline: 'none',
                        }}
                      />
                      <KeyRound
                        size={18}
                        color="#71717a"
                        style={{ position: 'absolute', left: '13px', top: '14px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '12px',
                          background: 'transparent',
                          border: 'none',
                          color: '#71717a',
                          cursor: 'pointer',
                        }}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '13px',
                      borderRadius: '12px',
                      border: '1px solid #000000',
                      background: '#000000',
                      color: '#ffffff',
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                    }}
                  >
                    <ShieldCheck size={18} />
                    <span>{isLoading ? 'Verifying Credentials...' : 'Sign In as Administrator'}</span>
                  </button>
                </form>
              </div>
            )}

            {/* Quick Demo Login Pills Footer */}
            <div
              style={{
                padding: '16px 32px 20px',
                background: '#fafafa',
                borderTop: '1px solid #e4e4e7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#52525b' }}>
                <Sparkles size={14} color="#09090b" />
                <span>Quick Test Logins:</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {PRESET_USERS.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleQuickLogin(user)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 10px',
                      borderRadius: '8px',
                      background: '#ffffff',
                      border: '1px solid #e4e4e7',
                      color: '#09090b',
                      fontSize: '0.725rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: '#09090b',
                      }}
                    />
                    <span>
                      {user.role === 'BILLER'
                        ? `${user.name.split(' ')[0]} (PIN: ${user.pin})`
                        : `${user.username}`}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
