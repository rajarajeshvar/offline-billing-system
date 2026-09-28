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
}

export const LoginPortal: React.FC<LoginPortalProps> = ({
  currentSession,
  isLocked,
  isLiveDb,
  onLoginSuccess,
  onUnlockSuccess,
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
        background: 'radial-gradient(circle at 50% 20%, #1e1b4b 0%, #0f172a 50%, #030712 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflowY: 'auto',
      }}
    >
      {/* Background glow effects */}
      <div
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'rgba(59, 130, 246, 0.08)',
          filter: 'blur(100px)',
          pointerEvents: 'none',
          top: '10%',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'rgba(139, 92, 246, 0.08)',
          filter: 'blur(100px)',
          pointerEvents: 'none',
          bottom: '10%',
        }}
      />

      {/* Main Container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: isLocked ? '480px' : '780px',
          background: 'rgba(17, 24, 39, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(59, 130, 246, 0.1)',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
        }}
      >
        {/* Top Header Bar */}
        <div
          style={{
            padding: '24px 32px 18px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
              }}
            >
              {isLocked ? <Lock size={22} color="#fff" /> : <ShieldCheck size={22} color="#fff" />}
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
                {isLocked ? 'Terminal Locked' : 'Offline Billing Portal'}
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '3px 0 0' }}>
                {isLocked
                  ? 'Enter PIN or password to resume shift'
                  : 'Select Cashier for fast POS access or login as Administrator'}
              </p>
            </div>
          </div>

          {/* Connection Status Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              background: isLiveDb ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              border: isLiveDb ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: isLiveDb ? '#34d399' : '#fbbf24',
              whiteSpace: 'nowrap',
            }}
          >
            {isLiveDb ? <Database size={13} /> : <WifiOff size={13} />}
            <span>{isLiveDb ? 'PostgreSQL Live' : 'Offline Terminal'}</span>
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
                background: lockedUser?.avatarBg || 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '1.75rem',
                fontWeight: 800,
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                marginBottom: '14px',
              }}
            >
              {currentSession?.employeeName
                ?.split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase() || 'OP'}
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', margin: 0 }}>
              {currentSession?.employeeName || 'Active Operator'}
            </h3>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 10px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#94a3b8',
                fontSize: '0.75rem',
                marginTop: '6px',
                fontWeight: 600,
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
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
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
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    background: pin.length > idx ? '#60a5fa' : 'transparent',
                    boxShadow: pin.length > idx ? '0 0 12px rgba(96, 165, 250, 0.6)' : 'none',
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
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
                >
                  {digit}
                </button>
              ))}
              <button
                onClick={() => handleKeypadPress('clear')}
                style={{
                  height: '52px',
                  borderRadius: '12px',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#f87171',
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
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                0
              </button>
              <button
                onClick={() => handleKeypadPress('backspace')}
                style={{
                  height: '52px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#94a3b8',
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
                border: 'none',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: '#fff',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: pin.length >= 4 ? 'pointer' : 'not-allowed',
                opacity: pin.length >= 4 ? 1 : 0.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
              }}
            >
              <Unlock size={18} />
              <span>{isLoading ? 'Verifying PIN...' : 'Unlock Terminal'}</span>
            </button>

            {/* Switch Operator */}
            <button
              onClick={handleSwitchOperator}
              style={{
                marginTop: '16px',
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
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
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(0, 0, 0, 0.2)',
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
                  background: activeTab === 'cashier' ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                  borderBottom: activeTab === 'cashier' ? '2px solid #3b82f6' : '2px solid transparent',
                  color: activeTab === 'cashier' ? '#60a5fa' : '#94a3b8',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
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
                  background: activeTab === 'admin' ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
                  borderBottom: activeTab === 'admin' ? '2px solid #8b5cf6' : '2px solid transparent',
                  color: activeTab === 'admin' ? '#a78bfa' : '#94a3b8',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
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
                      color: '#94a3b8',
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
                            background: isSelected
                              ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(16, 185, 129, 0.1))'
                              : 'rgba(255, 255, 255, 0.03)',
                            border: isSelected
                              ? '1.5px solid #3b82f6'
                              : '1px solid rgba(255, 255, 255, 0.06)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '50%',
                              background: cashier.avatarBg,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: '0.95rem',
                              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
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
                              <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>
                                {cashier.name}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                  background:
                                    cashier.role === 'MANAGER'
                                      ? 'rgba(245, 158, 11, 0.15)'
                                      : 'rgba(16, 185, 129, 0.15)',
                                  color: cashier.role === 'MANAGER' ? '#fbbf24' : '#34d399',
                                  fontWeight: 600,
                                }}
                              >
                                {cashier.role}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                              {cashier.shift}
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 size={18} color="#3b82f6" />}
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
                    background: 'rgba(0, 0, 0, 0.25)',
                    padding: '20px',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                      Enter 4-digit PIN for <strong style={{ color: '#fff' }}>{selectedCashier?.name}</strong>
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
                          border: '2px solid rgba(255, 255, 255, 0.3)',
                          background: pin.length > idx ? '#10b981' : 'transparent',
                          boxShadow: pin.length > idx ? '0 0 10px rgba(16, 185, 129, 0.6)' : 'none',
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
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: '#fff',
                          fontSize: '1.15rem',
                          fontWeight: 700,
                          cursor: 'pointer',
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
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#f87171',
                        fontSize: '0.78rem',
                        fontWeight: 600,
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
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: '#fff',
                        fontSize: '1.15rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      0
                    </button>
                    <button
                      onClick={() => handleKeypadPress('backspace')}
                      style={{
                        height: '46px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: '#94a3b8',
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
                      border: 'none',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#fff',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      cursor: pin.length >= 4 ? 'pointer' : 'not-allowed',
                      opacity: pin.length >= 4 ? 1 : 0.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
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
                        color: '#94a3b8',
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
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: '#fff',
                          fontSize: '0.95rem',
                          outline: 'none',
                        }}
                      />
                      <User
                        size={18}
                        color="#94a3b8"
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
                        color: '#94a3b8',
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
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: '#fff',
                          fontSize: '0.95rem',
                          outline: 'none',
                        }}
                      />
                      <KeyRound
                        size={18}
                        color="#94a3b8"
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
                          color: '#94a3b8',
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
                      border: 'none',
                      background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                      color: '#fff',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 16px rgba(139, 92, 246, 0.4)',
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
                background: 'rgba(0, 0, 0, 0.3)',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
                <Sparkles size={14} color="#f59e0b" />
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
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#cbd5e1',
                      fontSize: '0.725rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background:
                          user.role === 'ADMIN'
                            ? '#a855f7'
                            : user.role === 'MANAGER'
                            ? '#f59e0b'
                            : '#10b981',
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
