import React, { useState, useEffect } from 'react';
import { SatarkCitizenApp } from './SatarkCitizenApp';
import { SatarkOfficerApp } from './SatarkOfficerApp';
import { SatarkSplashScreen } from './SatarkSplashScreen';
import { SatarkAndroidLogin } from './SatarkAndroidLogin';
import { login } from '../../services/api';
import { sendOfficerOtp, verifyOfficerOtp } from '../../services/citizenAuthService';
import { getValidSession, clearAuthSession } from '../../utils/authSession';

export const SatarkMobileApp: React.FC = () => {
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // Authentication gate state for Android
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const token = localStorage.getItem('ews_token');
    const session = getValidSession(token);
    if (!session) {
      if (token || localStorage.getItem('ews_role')) {
        clearAuthSession();
      }
      return false;
    }
    return true;
  });

  const [userRole, setUserRole] = useState<string>(() => {
    const token = localStorage.getItem('ews_token');
    const session = getValidSession(token);
    return session?.role || 'CITIZEN';
  });

  const [activeMode, setActiveMode] = useState<'citizen' | 'officer'>(() => {
    const token = localStorage.getItem('ews_token');
    const session = getValidSession(token);
    if (session && ['ADMIN', 'DISTRICT_OFFICIAL', 'FIELD_OFFICER'].includes(session.role || '')) {
      return 'officer';
    }
    return 'citizen';
  });

  // Modal for Officer Login from within Citizen mode
  const [showOfficerLoginModal, setShowOfficerLoginModal] = useState<boolean>(false);
  const [officerAuthTab, setOfficerAuthTab] = useState<'otp' | 'password'>('otp');

  // Password Login State
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [loginLoading, setLoginLoading] = useState<boolean>(false);

  // OTP Login State
  const [officerPhone, setOfficerPhone] = useState<string>('');
  const [officerOtp, setOfficerOtp] = useState<string>('');
  const [officerOtpStep, setOfficerOtpStep] = useState<1 | 2>(1);
  const [demoNotice, setDemoNotice] = useState<string>('');

  // Listen to auth events (login, logout, session expiration)
  useEffect(() => {
    const handleAuthChange = () => {
      const token = localStorage.getItem('ews_token');
      const session = getValidSession(token);
      if (!session) {
        if (token || localStorage.getItem('ews_role')) {
          clearAuthSession();
        }
        setIsAuthenticated(false);
        setUserRole('CITIZEN');
        setActiveMode('citizen');
        return;
      }
      setIsAuthenticated(true);
      setUserRole(session.role || 'CITIZEN');
      if (['ADMIN', 'DISTRICT_OFFICIAL', 'FIELD_OFFICER'].includes(session.role || '')) {
        setActiveMode('officer');
      } else {
        setActiveMode('citizen');
      }
    };

    window.addEventListener('satark-auth-changed', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    return () => {
      window.removeEventListener('satark-auth-changed', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  const handleOfficerLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoginLoading(true);
    setLoginError('');
    try {
      const data = await login(username, password);
      localStorage.setItem('ews_token', data.token);
      localStorage.setItem('ews_role', data.role);
      localStorage.setItem('ews_user', data.username);
      localStorage.setItem('ews_lang', data.languagePref || 'en');
      setIsAuthenticated(true);
      setUserRole(data.role);
      setActiveMode('officer');
      setShowOfficerLoginModal(false);
    } catch {
      setLoginError('Invalid officer credentials. Try: admin / demo1234');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSendOfficerOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officerPhone.trim()) return;
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await sendOfficerOtp(officerPhone);
      if (res.demoMode && res.demoOtp) {
        setDemoNotice(`SIH Demo Code: ${res.demoOtp}`);
      }
      setOfficerOtpStep(2);
    } catch (err: any) {
      setLoginError(err.message || 'Failed to send officer OTP.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleVerifyOfficerOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officerOtp.trim()) return;
    setLoginLoading(true);
    setLoginError('');
    try {
      const data = await verifyOfficerOtp(officerPhone, officerOtp);
      setIsAuthenticated(true);
      setUserRole(data.role);
      setActiveMode('officer');
      setShowOfficerLoginModal(false);
    } catch (err: any) {
      setLoginError(err.message || 'Officer OTP verification failed.');
    } finally {
      setLoginLoading(false);
    }
  };

  const fillDemo = (u: string) => {
    setUsername(u);
    setPassword('demo1234');
  };

  const fillDemoPhone = (phone: string) => {
    setOfficerPhone(phone);
    setLoginError('');
  };

  return (
    <>
      {/* 1. Dedicated 3-Second Opening SATARK Splash Screen */}
      {showSplash && (
        <SatarkSplashScreen onComplete={() => setShowSplash(false)} />
      )}

      {/* 2. Authentication Gate: If unauthenticated, show Android-specific Login */}
      {!isAuthenticated ? (
        <SatarkAndroidLogin
          onLoginSuccess={(role: string) => {
            setIsAuthenticated(true);
            setUserRole(role);
            if (['ADMIN', 'DISTRICT_OFFICIAL', 'FIELD_OFFICER'].includes(role)) {
              setActiveMode('officer');
            } else {
              setActiveMode('citizen');
            }
          }}
        />
      ) : activeMode === 'officer' ? (
        /* 3. Original Authenticated Officer Mobile UI */
        <SatarkOfficerApp
          onSwitchToCitizen={() => setActiveMode('citizen')}
        />
      ) : (
        /* 4. Original Authenticated Citizen Mobile UI */
        <SatarkCitizenApp
          onSwitchToOfficer={() => {
            const token = localStorage.getItem('ews_token');
            const session = getValidSession(token);
            if (session && ['ADMIN', 'DISTRICT_OFFICIAL', 'FIELD_OFFICER'].includes(session.role || '')) {
              setActiveMode('officer');
            } else {
              setLoginError('');
              setDemoNotice('');
              setOfficerOtpStep(1);
              setShowOfficerLoginModal(true);
            }
          }}
        />
      )}

      {/* Officer Switch Login Modal for Citizen Mode */}
      {isAuthenticated && showOfficerLoginModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#0e172a',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '20px',
            maxWidth: '360px',
            width: '100%',
            color: '#ffffff'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontWeight: 900, fontSize: '1.05rem' }}>
                🛡️ Officer / Admin Login
              </div>
              <button
                onClick={() => setShowOfficerLoginModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Auth Method Tabs */}
            <div style={{
              display: 'flex',
              background: '#070c17',
              borderRadius: '8px',
              padding: '3px',
              marginBottom: '12px'
            }}>
              <button
                type="button"
                onClick={() => { setOfficerAuthTab('otp'); setLoginError(''); }}
                style={{
                  flex: 1,
                  padding: '7px 4px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  border: 'none',
                  background: officerAuthTab === 'otp' ? '#2563eb' : 'transparent',
                  color: officerAuthTab === 'otp' ? '#ffffff' : '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                📱 Mobile OTP
              </button>
              <button
                type="button"
                onClick={() => { setOfficerAuthTab('password'); setLoginError(''); }}
                style={{
                  flex: 1,
                  padding: '7px 4px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  border: 'none',
                  background: officerAuthTab === 'password' ? '#2563eb' : 'transparent',
                  color: officerAuthTab === 'password' ? '#ffffff' : '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                🔑 Password / Demo
              </button>
            </div>

            {loginError && (
              <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 10px', borderRadius: '6px', fontSize: '0.76rem', marginBottom: '10px' }}>
                {loginError}
              </div>
            )}

            {demoNotice && officerAuthTab === 'otp' && (
              <div style={{ background: '#fef3c7', color: '#92400e', padding: '8px 10px', borderRadius: '6px', fontSize: '0.76rem', marginBottom: '10px' }}>
                {demoNotice}
              </div>
            )}

            {officerAuthTab === 'otp' ? (
              officerOtpStep === 1 ? (
                <form onSubmit={handleSendOfficerOtpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                      REGISTERED OFFICER MOBILE
                    </label>
                    <input
                      type="tel"
                      value={officerPhone}
                      onChange={e => setOfficerPhone(e.target.value)}
                      placeholder="10-digit number e.g. 9876543210"
                      style={{
                        width: '100%',
                        background: '#070c17',
                        color: '#ffffff',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        fontSize: '0.82rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Demo Fill Numbers */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                    <button
                      type="button"
                      onClick={() => fillDemoPhone('+919876543210')}
                      style={{
                        background: '#1e293b',
                        color: '#38bdf8',
                        border: '1px solid #334155',
                        borderRadius: '4px',
                        padding: '3px 6px',
                        fontSize: '0.64rem',
                        cursor: 'pointer'
                      }}
                    >
                      Admin (+91..10)
                    </button>
                    <button
                      type="button"
                      onClick={() => fillDemoPhone('+919876543211')}
                      style={{
                        background: '#1e293b',
                        color: '#fb923c',
                        border: '1px solid #334155',
                        borderRadius: '4px',
                        padding: '3px 6px',
                        fontSize: '0.64rem',
                        cursor: 'pointer'
                      }}
                    >
                      Official (+91..11)
                    </button>
                    <button
                      type="button"
                      onClick={() => fillDemoPhone('+919876543213')}
                      style={{
                        background: '#1e293b',
                        color: '#a855f7',
                        border: '1px solid #334155',
                        borderRadius: '4px',
                        padding: '3px 6px',
                        fontSize: '0.64rem',
                        cursor: 'pointer'
                      }}
                    >
                      Officer (+91..13)
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loginLoading || !officerPhone.trim()}
                    style={{
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px',
                      fontWeight: 900,
                      fontSize: '0.84rem',
                      cursor: loginLoading ? 'not-allowed' : 'pointer',
                      marginTop: '8px'
                    }}
                  >
                    {loginLoading ? 'Sending OTP...' : 'Send Officer OTP'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOfficerOtpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                      ENTER 6-DIGIT VERIFICATION CODE
                    </label>
                    <input
                      type="text"
                      value={officerOtp}
                      onChange={e => setOfficerOtp(e.target.value)}
                      placeholder="e.g. 123456"
                      style={{
                        width: '100%',
                        background: '#070c17',
                        color: '#ffffff',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        fontSize: '0.82rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loginLoading || !officerOtp.trim()}
                    style={{
                      background: '#22c55e',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px',
                      fontWeight: 900,
                      fontSize: '0.84rem',
                      cursor: loginLoading ? 'not-allowed' : 'pointer',
                      marginTop: '8px'
                    }}
                  >
                    {loginLoading ? 'Verifying...' : 'Verify & Enter Command Portal'}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setOfficerOtpStep(1); setLoginError(''); }}
                    style={{
                      background: 'transparent',
                      color: '#94a3b8',
                      border: 'none',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    ← Change Phone Number
                  </button>
                </form>
              )
            ) : (
              <form onSubmit={handleOfficerLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    USERNAME
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="admin or field_officer"
                    style={{
                      width: '100%',
                      background: '#070c17',
                      color: '#ffffff',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      fontSize: '0.82rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    PASSWORD
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="demo1234"
                    style={{
                      width: '100%',
                      background: '#070c17',
                      color: '#ffffff',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      fontSize: '0.82rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Demo Fill Quick Buttons */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                  <button
                    type="button"
                    onClick={() => fillDemo('admin')}
                    style={{
                      background: '#1e293b',
                      color: '#38bdf8',
                      border: '1px solid #334155',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '0.68rem',
                      cursor: 'pointer'
                    }}
                  >
                    Fill Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemo('field_officer')}
                    style={{
                      background: '#1e293b',
                      color: '#fb923c',
                      border: '1px solid #334155',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '0.68rem',
                      cursor: 'pointer'
                    }}
                  >
                    Fill Field Officer
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px',
                    fontWeight: 900,
                    fontSize: '0.84rem',
                    cursor: loginLoading ? 'not-allowed' : 'pointer',
                    marginTop: '8px'
                  }}
                >
                  {loginLoading ? 'Authenticating...' : 'Sign In to Command Portal'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
