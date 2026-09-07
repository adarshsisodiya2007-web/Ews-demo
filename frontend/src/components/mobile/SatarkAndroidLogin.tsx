import React, { useState, useEffect } from 'react';
import {
  sendCitizenOtp,
  verifyCitizenOtp,
  sendOfficerOtp,
  verifyOfficerOtp
} from '../../services/citizenAuthService';
import { login } from '../../services/api';
import { createDemoJwt } from '../../utils/authSession';

interface Props {
  onLoginSuccess: (role: string) => void;
}

export const SatarkAndroidLogin: React.FC<Props> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'citizen' | 'officer'>('citizen');

  // Citizen State
  const [citizenPhone, setCitizenPhone] = useState<string>('');
  const [citizenOtp, setCitizenOtp] = useState<string>('');
  const [citizenStep, setCitizenStep] = useState<1 | 2>(1);
  const [citizenLoading, setCitizenLoading] = useState<boolean>(false);
  const [citizenError, setCitizenError] = useState<string>('');
  const [citizenDemoNotice, setCitizenDemoNotice] = useState<string>('');
  const [citizenCooldown, setCitizenCooldown] = useState<number>(0);

  // Officer State
  const [officerAuthMethod, setOfficerAuthMethod] = useState<'otp' | 'password'>('otp');
  const [officerPhone, setOfficerPhone] = useState<string>('');
  const [officerOtp, setOfficerOtp] = useState<string>('');
  const [officerStep, setOfficerStep] = useState<1 | 2>(1);
  const [officerUsername, setOfficerUsername] = useState<string>('');
  const [officerPassword, setOfficerPassword] = useState<string>('');
  const [officerLoading, setOfficerLoading] = useState<boolean>(false);
  const [officerError, setOfficerError] = useState<string>('');
  const [officerDemoNotice, setOfficerDemoNotice] = useState<string>('');
  const [officerCooldown, setOfficerCooldown] = useState<number>(0);

  // Countdown timers for OTP resend
  useEffect(() => {
    if (citizenCooldown <= 0) return;
    const timer = setInterval(() => setCitizenCooldown(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [citizenCooldown]);

  useEffect(() => {
    if (officerCooldown <= 0) return;
    const timer = setInterval(() => setOfficerCooldown(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [officerCooldown]);

  // ── CITIZEN OTP HANDLERS ───────────────────────────────────────────────────
  const handleSendCitizenOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanDigits = citizenPhone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      setCitizenError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setCitizenLoading(true);
    setCitizenError('');
    try {
      const res = await sendCitizenOtp(citizenPhone);
      if (res.demoMode && res.demoOtp) {
        setCitizenDemoNotice(`SIH Demo Verification Code: ${res.demoOtp}`);
      }
      setCitizenCooldown(res.cooldownSeconds || 30);
      setCitizenStep(2);
    } catch (err: any) {
      setCitizenError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setCitizenLoading(false);
    }
  };

  const handleVerifyCitizenOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!citizenOtp.trim()) {
      setCitizenError('Please enter the verification code.');
      return;
    }

    setCitizenLoading(true);
    setCitizenError('');
    try {
      const res = await verifyCitizenOtp(citizenPhone, citizenOtp);
      onLoginSuccess(res.user?.role || 'CITIZEN');
    } catch (err: any) {
      setCitizenError(err.message || 'Invalid OTP code. Please re-check.');
    } finally {
      setCitizenLoading(false);
    }
  };

  // ── OFFICER OTP HANDLERS ───────────────────────────────────────────────────
  const handleSendOfficerOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanDigits = officerPhone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      setOfficerError('Please enter a valid 10-digit registered officer mobile number.');
      return;
    }

    setOfficerLoading(true);
    setOfficerError('');
    try {
      const res = await sendOfficerOtp(officerPhone);
      if (res.demoMode && res.demoOtp) {
        setOfficerDemoNotice(`SIH Officer Demo Code: ${res.demoOtp}`);
      }
      setOfficerCooldown(res.cooldownSeconds || 30);
      setOfficerStep(2);
    } catch (err: any) {
      setOfficerError(err.message || 'Authorization failed. Please check the number.');
    } finally {
      setOfficerLoading(false);
    }
  };

  const handleVerifyOfficerOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!officerOtp.trim()) {
      setOfficerError('Please enter the officer verification code.');
      return;
    }

    setOfficerLoading(true);
    setOfficerError('');
    try {
      const res = await verifyOfficerOtp(officerPhone, officerOtp);
      onLoginSuccess(res.role || 'FIELD_OFFICER');
    } catch (err: any) {
      setOfficerError(err.message || 'Officer verification failed.');
    } finally {
      setOfficerLoading(false);
    }
  };

  // ── OFFICER PASSWORD HANDLER ───────────────────────────────────────────────
  const handleOfficerPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officerUsername.trim() || !officerPassword) {
      setOfficerError('Please enter both username and password.');
      return;
    }

    setOfficerLoading(true);
    setOfficerError('');
    try {
      const data = await login(officerUsername.trim(), officerPassword);
      localStorage.setItem('ews_token', data.token);
      localStorage.setItem('ews_role', data.role);
      localStorage.setItem('ews_user', data.username);
      localStorage.setItem('ews_lang', data.languagePref || 'en');
      window.dispatchEvent(new CustomEvent('satark-auth-changed', { detail: data }));
      onLoginSuccess(data.role);
    } catch {
      setOfficerError('Invalid officer credentials. Try: admin / demo1234');
    } finally {
      setOfficerLoading(false);
    }
  };

  // ── FAST DEMO BYPASS FOR EVALUATORS ─────────────────────────────────────────
  const bypassCitizenDemo = () => {
    const demoToken = createDemoJwt('+919876543214', 'CITIZEN');
    localStorage.setItem('ews_token', demoToken);
    localStorage.setItem('ews_role', 'CITIZEN');
    localStorage.setItem('ews_user', '+919876543214');
    localStorage.setItem('satark_citizen_phone', '+919876543214');
    window.dispatchEvent(new CustomEvent('satark-auth-changed', { detail: { role: 'CITIZEN' } }));
    onLoginSuccess('CITIZEN');
  };

  const bypassOfficerDemo = (role: string = 'FIELD_OFFICER', user: string = 'aizawl_officer') => {
    const demoToken = createDemoJwt(user, role);
    localStorage.setItem('ews_token', demoToken);
    localStorage.setItem('ews_role', role);
    localStorage.setItem('ews_user', user);
    window.dispatchEvent(new CustomEvent('satark-auth-changed', { detail: { role, user } }));
    onLoginSuccess(role);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 50% 15%, #0f1c3f 0%, #070d1e 50%, #03060c 100%)',
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 16px 36px 16px',
        boxSizing: 'border-box'
      }}
    >
      {/* ── SATARK Emblem & Header ── */}
      <div style={{ textAlign: 'center', marginBottom: '22px', maxWidth: '340px' }}>
        <div
          style={{
            width: '74px',
            height: '74px',
            margin: '0 auto 12px auto',
            borderRadius: '20px',
            background: 'linear-gradient(145deg, #1e293b, #0f172a)',
            border: '2px solid rgba(56, 189, 248, 0.4)',
            boxShadow: '0 8px 24px rgba(14, 165, 233, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
        >
          <img
            src="/SATARK_ANDROID_LOGO.png"
            alt="SATARK"
            style={{ width: '82%', height: '82%', objectFit: 'contain' }}
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
        </div>
        <div style={{ fontSize: '1.45rem', fontWeight: 900, letterSpacing: '2px', color: '#ffffff' }}>
          SATARK
        </div>
        <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.5px', marginTop: '2px' }}>
          LANDSLIDE EARLY WARNING SYSTEM
        </div>
        <div style={{ fontSize: '0.66rem', color: '#94a3b8', marginTop: '4px' }}>
          National Disaster Risk Reduction Platform · NER
        </div>
      </div>

      {/* ── Main Authentication Card ── */}
      <div
        style={{
          width: '100%',
          maxWidth: '380px',
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(16px)',
          borderRadius: '20px',
          border: '1px solid rgba(51, 65, 85, 0.7)',
          padding: '20px 18px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.55)',
          boxSizing: 'border-box'
        }}
      >
        {/* ── Role Selector Tabs ── */}
        <div
          style={{
            display: 'flex',
            background: '#070c17',
            borderRadius: '12px',
            padding: '4px',
            marginBottom: '18px',
            border: '1px solid #1e293b'
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('citizen');
              setCitizenError('');
            }}
            style={{
              flex: 1,
              padding: '10px 8px',
              borderRadius: '9px',
              fontSize: '0.82rem',
              fontWeight: 800,
              border: 'none',
              background: activeTab === 'citizen' ? '#2563eb' : 'transparent',
              color: activeTab === 'citizen' ? '#ffffff' : '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span>👤</span>
            <span>Citizen</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('officer');
              setOfficerError('');
            }}
            style={{
              flex: 1,
              padding: '10px 8px',
              borderRadius: '9px',
              fontSize: '0.82rem',
              fontWeight: 800,
              border: 'none',
              background: activeTab === 'officer' ? '#2563eb' : 'transparent',
              color: activeTab === 'officer' ? '#ffffff' : '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span>🛡️</span>
            <span>Officer</span>
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            CITIZEN TAB CONTENT
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'citizen' && (
          <div>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#f8fafc' }}>
                Citizen Mobile Verification
              </div>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                Enter your mobile number to receive live landslide risk alerts and report road hazards.
              </div>
            </div>

            {citizenError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#fca5a5',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  marginBottom: '12px',
                  lineHeight: 1.4
                }}
              >
                ⚠️ {citizenError}
              </div>
            )}

            {citizenDemoNotice && (
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  color: '#fcd34d',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  marginBottom: '12px',
                  lineHeight: 1.4
                }}
              >
                🧪 {citizenDemoNotice}
              </div>
            )}

            {citizenStep === 1 ? (
              <form onSubmit={handleSendCitizenOtp} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '6px', letterSpacing: '0.5px' }}>
                    MOBILE NUMBER (+91)
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div
                      style={{
                        background: '#070c17',
                        border: '1px solid #334155',
                        borderRadius: '10px',
                        padding: '11px 12px',
                        fontSize: '0.86rem',
                        fontWeight: 700,
                        color: '#94a3b8'
                      }}
                    >
                      +91
                    </div>
                    <input
                      type="tel"
                      value={citizenPhone}
                      onChange={e => setCitizenPhone(e.target.value)}
                      placeholder="98765 43214"
                      maxLength={14}
                      style={{
                        flex: 1,
                        background: '#070c17',
                        border: '1px solid #334155',
                        borderRadius: '10px',
                        padding: '11px 12px',
                        fontSize: '0.9rem',
                        color: '#ffffff',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Demo Quick Fill */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Demo:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCitizenPhone('+919876543214');
                      setCitizenError('');
                    }}
                    style={{
                      background: 'rgba(56, 189, 248, 0.12)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: '#38bdf8',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    +919876543214 (SIH Evaluator)
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={citizenLoading || !citizenPhone.trim()}
                  style={{
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    letterSpacing: '0.4px',
                    cursor: citizenLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                    marginTop: '4px'
                  }}
                >
                  {citizenLoading ? 'Sending Carrier SMS...' : 'Send Verification OTP →'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCitizenOtp} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px' }}>
                      ENTER 6-DIGIT OTP
                    </label>
                    <button
                      type="button"
                      onClick={() => { setCitizenStep(1); setCitizenError(''); }}
                      style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.72rem', cursor: 'pointer' }}
                    >
                      Change Phone
                    </button>
                  </div>
                  <input
                    type="text"
                    value={citizenOtp}
                    onChange={e => setCitizenOtp(e.target.value)}
                    placeholder="e.g. 123456"
                    maxLength={8}
                    style={{
                      width: '100%',
                      background: '#070c17',
                      border: '1px solid #334155',
                      borderRadius: '10px',
                      padding: '12px',
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      letterSpacing: '4px',
                      textAlign: 'center',
                      color: '#ffffff',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={citizenLoading || !citizenOtp.trim()}
                  style={{
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    letterSpacing: '0.4px',
                    cursor: citizenLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
                    marginTop: '4px'
                  }}
                >
                  {citizenLoading ? 'Verifying OTP...' : 'Verify & Enter Citizen App ✓'}
                </button>

                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2px' }}>
                  <button
                    type="button"
                    disabled={citizenCooldown > 0 || citizenLoading}
                    onClick={() => handleSendCitizenOtp()}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: citizenCooldown > 0 ? '#64748b' : '#38bdf8',
                      fontSize: '0.74rem',
                      cursor: citizenCooldown > 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {citizenCooldown > 0 ? `Resend OTP in ${citizenCooldown}s` : 'Resend OTP via SMS'}
                  </button>
                </div>
              </form>
            )}

            {/* SIH Fast Bypass Button */}
            <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid #1e293b', textAlign: 'center' }}>
              <button
                type="button"
                onClick={bypassCitizenDemo}
                style={{
                  width: '100%',
                  background: 'rgba(30, 41, 59, 0.7)',
                  border: '1px dashed #334155',
                  color: '#94a3b8',
                  borderRadius: '10px',
                  padding: '9px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                ⚡ Instant Demo Citizen Entry (Skip SMS)
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            OFFICER TAB CONTENT
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'officer' && (
          <div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#f8fafc' }}>
                Authorized Officer Portal
              </div>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                Restricted to District Emergency Operation Center (DEOC), SDRF, and Field Incident Commanders.
              </div>
            </div>

            {/* Officer Method Selector */}
            <div
              style={{
                display: 'flex',
                background: '#070c17',
                borderRadius: '8px',
                padding: '2px',
                marginBottom: '14px',
                border: '1px solid #1e293b'
              }}
            >
              <button
                type="button"
                onClick={() => { setOfficerAuthMethod('otp'); setOfficerError(''); }}
                style={{
                  flex: 1,
                  padding: '7px 4px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  border: 'none',
                  background: officerAuthMethod === 'otp' ? '#2563eb' : 'transparent',
                  color: officerAuthMethod === 'otp' ? '#ffffff' : '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                📱 Mobile OTP
              </button>
              <button
                type="button"
                onClick={() => { setOfficerAuthMethod('password'); setOfficerError(''); }}
                style={{
                  flex: 1,
                  padding: '7px 4px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  border: 'none',
                  background: officerAuthMethod === 'password' ? '#2563eb' : 'transparent',
                  color: officerAuthMethod === 'password' ? '#ffffff' : '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                🔑 Password / Demo
              </button>
            </div>

            {officerError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#fca5a5',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  marginBottom: '12px',
                  lineHeight: 1.4
                }}
              >
                🚫 {officerError}
              </div>
            )}

            {officerDemoNotice && officerAuthMethod === 'otp' && (
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  color: '#fcd34d',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  marginBottom: '12px',
                  lineHeight: 1.4
                }}
              >
                🧪 {officerDemoNotice}
              </div>
            )}

            {officerAuthMethod === 'otp' ? (
              officerStep === 1 ? (
                <form onSubmit={handleSendOfficerOtp} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '6px', letterSpacing: '0.5px' }}>
                      AUTHORIZED OFFICER MOBILE
                    </label>
                    <input
                      type="tel"
                      value={officerPhone}
                      onChange={e => setOfficerPhone(e.target.value)}
                      placeholder="Enter registered mobile number"
                      style={{
                        width: '100%',
                        background: '#070c17',
                        border: '1px solid #334155',
                        borderRadius: '10px',
                        padding: '11px 12px',
                        fontSize: '0.9rem',
                        color: '#ffffff',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Demo Authorized Officer Numbers */}
                  <div>
                    <div style={{ fontSize: '0.66rem', color: '#64748b', marginBottom: '4px' }}>Authorized Officer Demo Numbers:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => { setOfficerPhone('+919876543210'); setOfficerError(''); }}
                        style={{
                          background: 'rgba(56, 189, 248, 0.1)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          color: '#38bdf8',
                          borderRadius: '6px',
                          padding: '3px 6px',
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Admin (+91..10)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setOfficerPhone('+919876543211'); setOfficerError(''); }}
                        style={{
                          background: 'rgba(251, 146, 60, 0.1)',
                          border: '1px solid rgba(251, 146, 60, 0.3)',
                          color: '#fb923c',
                          borderRadius: '6px',
                          padding: '3px 6px',
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Kamrup (+91..11)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setOfficerPhone('+919876543213'); setOfficerError(''); }}
                        style={{
                          background: 'rgba(168, 85, 247, 0.1)',
                          border: '1px solid rgba(168, 85, 247, 0.3)',
                          color: '#c084fc',
                          borderRadius: '6px',
                          padding: '3px 6px',
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Aizawl Officer (+91..13)
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={officerLoading || !officerPhone.trim()}
                    style={{
                      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '12px',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      cursor: officerLoading ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                      marginTop: '4px'
                    }}
                  >
                    {officerLoading ? 'Checking Authorization...' : 'Send Officer OTP →'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOfficerOtp} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px' }}>
                        OFFICER VERIFICATION CODE
                      </label>
                      <button
                        type="button"
                        onClick={() => { setOfficerStep(1); setOfficerError(''); }}
                        style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.72rem', cursor: 'pointer' }}
                      >
                        Change Number
                      </button>
                    </div>
                    <input
                      type="text"
                      value={officerOtp}
                      onChange={e => setOfficerOtp(e.target.value)}
                      placeholder="e.g. 123456"
                      maxLength={8}
                      style={{
                        width: '100%',
                        background: '#070c17',
                        border: '1px solid #334155',
                        borderRadius: '10px',
                        padding: '12px',
                        fontSize: '1.1rem',
                        fontWeight: 800,
                        letterSpacing: '4px',
                        textAlign: 'center',
                        color: '#ffffff',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={officerLoading || !officerOtp.trim()}
                    style={{
                      background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '12px',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      cursor: officerLoading ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
                      marginTop: '4px'
                    }}
                  >
                    {officerLoading ? 'Verifying Credentials...' : 'Authenticate Officer Session ✓'}
                  </button>

                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2px' }}>
                    <button
                      type="button"
                      disabled={officerCooldown > 0 || officerLoading}
                      onClick={() => handleSendOfficerOtp()}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: officerCooldown > 0 ? '#64748b' : '#38bdf8',
                        fontSize: '0.74rem',
                        cursor: officerCooldown > 0 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {officerCooldown > 0 ? `Resend OTP in ${officerCooldown}s` : 'Resend Officer OTP'}
                    </button>
                  </div>
                </form>
              )
            ) : (
              <form onSubmit={handleOfficerPasswordLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    OFFICER USERNAME
                  </label>
                  <input
                    type="text"
                    value={officerUsername}
                    onChange={e => setOfficerUsername(e.target.value)}
                    placeholder="admin or aizawl_officer"
                    style={{
                      width: '100%',
                      background: '#070c17',
                      color: '#ffffff',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '9px 10px',
                      fontSize: '0.82rem',
                      outline: 'none',
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
                    value={officerPassword}
                    onChange={e => setOfficerPassword(e.target.value)}
                    placeholder="demo1234"
                    style={{
                      width: '100%',
                      background: '#070c17',
                      color: '#ffffff',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '9px 10px',
                      fontSize: '0.82rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Demo Quick Fill */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setOfficerUsername('admin');
                      setOfficerPassword('demo1234');
                      setOfficerError('');
                    }}
                    style={{
                      background: '#1e293b',
                      color: '#38bdf8',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Fill Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOfficerUsername('aizawl_officer');
                      setOfficerPassword('demo1234');
                      setOfficerError('');
                    }}
                    style={{
                      background: '#1e293b',
                      color: '#fb923c',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Fill Field Officer
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={officerLoading}
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '11px',
                    fontWeight: 900,
                    fontSize: '0.84rem',
                    cursor: officerLoading ? 'not-allowed' : 'pointer',
                    marginTop: '6px'
                  }}
                >
                  {officerLoading ? 'Authenticating...' : 'Sign In to Officer Portal →'}
                </button>
              </form>
            )}

            {/* Instant Demo Officer Bypass */}
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button
                type="button"
                onClick={() => bypassOfficerDemo('FIELD_OFFICER', 'aizawl_officer')}
                style={{
                  background: 'rgba(30, 41, 59, 0.7)',
                  border: '1px dashed #334155',
                  color: '#94a3b8',
                  borderRadius: '10px',
                  padding: '8px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                ⚡ Instant Demo Field Officer Entry
              </button>
              <button
                type="button"
                onClick={() => bypassOfficerDemo('ADMIN', 'admin')}
                style={{
                  background: 'rgba(30, 41, 59, 0.7)',
                  border: '1px dashed #334155',
                  color: '#94a3b8',
                  borderRadius: '10px',
                  padding: '8px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                ⚡ Instant Demo State Admin Entry
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer System Badge */}
      <div style={{ marginTop: '20px', fontSize: '0.68rem', color: '#64748b', textAlign: 'center' }}>
        🔒 SATARK EWS Native Android Client · 256-Bit SHA Encrypted Session
      </div>
    </div>
  );
};
