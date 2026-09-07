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

export const validateIndianPhone = (raw: string): { valid: boolean; normalized: string; error?: string } => {
  if (!raw || !raw.trim()) {
    return { valid: false, normalized: '', error: 'Please enter a valid 10-digit Indian mobile number.' };
  }
  let cleaned = raw.trim().replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('+91')) cleaned = cleaned.substring(3);
  else if (cleaned.startsWith('91') && cleaned.length === 12) cleaned = cleaned.substring(2);
  else if (cleaned.startsWith('0') && cleaned.length === 11) cleaned = cleaned.substring(1);
  else if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);

  if (!/^[6-9]\d{9}$/.test(cleaned)) {
    return { valid: false, normalized: '', error: 'Please enter a valid 10-digit Indian mobile number.' };
  }
  return { valid: true, normalized: `+91${cleaned}` };
};

export const SatarkAndroidLogin: React.FC<Props> = ({ onLoginSuccess }) => {
  // Theme State: defaults to dark, persists across app
  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    const stored = localStorage.getItem('satark_mobile_theme') || localStorage.getItem('satark_theme');
    return (stored === 'light' || stored === 'dark') ? stored : 'dark';
  });
  const isLight = theme === 'light';

  const handleSetTheme = (newTheme: 'dark' | 'light') => {
    setThemeState(newTheme);
    localStorage.setItem('satark_mobile_theme', newTheme);
    localStorage.setItem('satark_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    document.body.setAttribute('data-theme', newTheme);
    window.dispatchEvent(new CustomEvent('satark-theme-change', { detail: newTheme }));
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  // Tab State
  const [activeTab, setActiveTab] = useState<'citizen' | 'officer'>('citizen');

  // Citizen State
  const [citizenPhone, setCitizenPhone] = useState<string>('');
  const [citizenOtp, setCitizenOtp] = useState<string>('');
  const [citizenStep, setCitizenStep] = useState<1 | 2>(1);
  const [citizenLoading, setCitizenLoading] = useState<boolean>(false);
  const [citizenError, setCitizenError] = useState<string>('');
  const [citizenSuccess, setCitizenSuccess] = useState<string>('');
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
  const [officerSuccess, setOfficerSuccess] = useState<string>('');
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

  // ── CITIZEN REAL OTP HANDLERS ──────────────────────────────────────────────
  const handleSendCitizenOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const check = validateIndianPhone(citizenPhone);
    if (!check.valid) {
      setCitizenError(check.error || 'Please enter a valid 10-digit Indian mobile number.');
      setCitizenSuccess('');
      return;
    }

    setCitizenLoading(true);
    setCitizenError('');
    setCitizenSuccess('');
    try {
      const res = await sendCitizenOtp(check.normalized);
      setCitizenSuccess(res.message || 'OTP sent to your mobile number.');
      setCitizenCooldown(res.cooldownSeconds || 60);
      setCitizenStep(2);
    } catch (err: any) {
      setCitizenError(err.message || 'Unable to send OTP right now. Please try again.');
    } finally {
      setCitizenLoading(false);
    }
  };

  const handleVerifyCitizenOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const check = validateIndianPhone(citizenPhone);
    if (!check.valid) {
      setCitizenError(check.error || 'Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (!citizenOtp.trim()) {
      setCitizenError('Incorrect OTP. Please try again.');
      return;
    }

    setCitizenLoading(true);
    setCitizenError('');
    try {
      const res = await verifyCitizenOtp(check.normalized, citizenOtp.trim());
      onLoginSuccess(res.user?.role || 'CITIZEN');
    } catch (err: any) {
      setCitizenError(err.message || 'Incorrect OTP. Please try again.');
    } finally {
      setCitizenLoading(false);
    }
  };

  // ── OFFICER REAL OTP HANDLERS ──────────────────────────────────────────────
  const handleSendOfficerOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const check = validateIndianPhone(officerPhone);
    if (!check.valid) {
      setOfficerError(check.error || 'Please enter a valid 10-digit Indian mobile number.');
      setOfficerSuccess('');
      return;
    }

    setOfficerLoading(true);
    setOfficerError('');
    setOfficerSuccess('');
    try {
      const res = await sendOfficerOtp(check.normalized);
      setOfficerSuccess(res.message || 'OTP sent to your mobile number.');
      setOfficerCooldown(res.cooldownSeconds || 60);
      setOfficerStep(2);
    } catch (err: any) {
      setOfficerError(err.message || 'This number is not authorized for Officer access.');
    } finally {
      setOfficerLoading(false);
    }
  };

  const handleVerifyOfficerOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const check = validateIndianPhone(officerPhone);
    if (!check.valid) {
      setOfficerError(check.error || 'Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (!officerOtp.trim()) {
      setOfficerError('Incorrect OTP. Please try again.');
      return;
    }

    setOfficerLoading(true);
    setOfficerError('');
    try {
      const res = await verifyOfficerOtp(check.normalized, officerOtp.trim());
      onLoginSuccess(res.role || 'FIELD_OFFICER');
    } catch (err: any) {
      setOfficerError(err.message || 'Incorrect OTP. Please try again.');
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

  // ── SIH DEMO MODE FAST BYPASS ──────────────────────────────────────────────
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

  // Dynamic Theme Colors
  const colors = {
    bgPage: isLight
      ? 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)'
      : 'radial-gradient(circle at 50% 15%, #0f1c3f 0%, #070d1e 50%, #03060c 100%)',
    bgCard: isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.92)',
    borderCard: isLight ? '1px solid #cbd5e1' : '1px solid rgba(51, 65, 85, 0.7)',
    shadowCard: isLight ? '0 16px 36px rgba(0, 0, 0, 0.08)' : '0 20px 40px rgba(0,0,0,0.55)',
    textPrimary: isLight ? '#0f172a' : '#f8fafc',
    textSecondary: isLight ? '#475569' : '#94a3b8',
    textTitle: isLight ? '#0f172a' : '#ffffff',
    textSubtitle: isLight ? '#0284c7' : '#38bdf8',
    bgInput: isLight ? '#f8fafc' : '#070c17',
    borderInput: isLight ? '#cbd5e1' : '#334155',
    textInput: isLight ? '#0f172a' : '#ffffff',
    tabBg: isLight ? '#e2e8f0' : '#070c17',
    tabBorder: isLight ? '#cbd5e1' : '#1e293b',
    tabInactiveText: isLight ? '#475569' : '#94a3b8',
    demoBoxBg: isLight ? '#f1f5f9' : 'rgba(30, 41, 59, 0.45)',
    demoBoxBorder: isLight ? '1px dashed #cbd5e1' : '1px dashed #334155',
    footerText: isLight ? '#64748b' : '#64748b'
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.bgPage,
        color: colors.textPrimary,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px 16px 32px 16px',
        boxSizing: 'border-box',
        transition: 'background 0.3s ease, color 0.3s ease'
      }}
    >
      {/* ── Top Theme Switcher Control ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', maxWidth: '380px', marginBottom: '10px' }}>
        <div
          style={{
            display: 'inline-flex',
            background: isLight ? '#e2e8f0' : '#1e293b',
            padding: '3px',
            borderRadius: '12px',
            border: isLight ? '1px solid #cbd5e1' : '1px solid #334155'
          }}
        >
          <button
            type="button"
            onClick={() => handleSetTheme('light')}
            style={{
              padding: '5px 12px',
              borderRadius: '9px',
              border: 'none',
              fontSize: '0.74rem',
              fontWeight: 700,
              background: isLight ? '#ffffff' : 'transparent',
              color: isLight ? '#0f172a' : '#94a3b8',
              cursor: 'pointer',
              boxShadow: isLight ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s ease'
            }}
          >
            <span>☀</span>
            <span>Light</span>
          </button>
          <button
            type="button"
            onClick={() => handleSetTheme('dark')}
            style={{
              padding: '5px 12px',
              borderRadius: '9px',
              border: 'none',
              fontSize: '0.74rem',
              fontWeight: 700,
              background: !isLight ? '#2563eb' : 'transparent',
              color: !isLight ? '#ffffff' : '#475569',
              cursor: 'pointer',
              boxShadow: !isLight ? '0 2px 6px rgba(37,99,235,0.4)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s ease'
            }}
          >
            <span>🌙</span>
            <span>Dark</span>
          </button>
        </div>
      </div>

      {/* ── SATARK Emblem & Branding ── */}
      <div style={{ textAlign: 'center', marginBottom: '18px', maxWidth: '340px' }}>
        <div
          style={{
            width: '68px',
            height: '68px',
            margin: '0 auto 10px auto',
            borderRadius: '18px',
            background: isLight ? '#ffffff' : 'linear-gradient(145deg, #1e293b, #0f172a)',
            border: isLight ? '2px solid #0284c7' : '2px solid rgba(56, 189, 248, 0.4)',
            boxShadow: isLight ? '0 6px 18px rgba(2,132,199,0.15)' : '0 8px 24px rgba(14, 165, 233, 0.25)',
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
        <div style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '2px', color: colors.textTitle }}>
          SATARK
        </div>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: colors.textSubtitle, letterSpacing: '0.5px', marginTop: '2px' }}>
          LANDSLIDE EARLY WARNING SYSTEM
        </div>
        <div style={{ fontSize: '0.65rem', color: colors.textSecondary, marginTop: '3px' }}>
          National Disaster Risk Reduction Platform · NER
        </div>
      </div>

      {/* ── Main Authentication Card ── */}
      <div
        style={{
          width: '100%',
          maxWidth: '380px',
          background: colors.bgCard,
          borderRadius: '20px',
          border: colors.borderCard,
          padding: '20px 18px',
          boxShadow: colors.shadowCard,
          boxSizing: 'border-box',
          transition: 'background 0.3s ease, border 0.3s ease'
        }}
      >
        {/* ── Role Selector Tabs ── */}
        <div
          style={{
            display: 'flex',
            background: colors.tabBg,
            borderRadius: '12px',
            padding: '4px',
            marginBottom: '16px',
            border: `1px solid ${colors.tabBorder}`
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('citizen');
              setCitizenError('');
              setCitizenSuccess('');
            }}
            style={{
              flex: 1,
              padding: '10px 8px',
              borderRadius: '9px',
              fontSize: '0.82rem',
              fontWeight: 800,
              border: 'none',
              background: activeTab === 'citizen' ? '#2563eb' : 'transparent',
              color: activeTab === 'citizen' ? '#ffffff' : colors.tabInactiveText,
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
              setOfficerSuccess('');
            }}
            style={{
              flex: 1,
              padding: '10px 8px',
              borderRadius: '9px',
              fontSize: '0.82rem',
              fontWeight: 800,
              border: 'none',
              background: activeTab === 'officer' ? '#2563eb' : 'transparent',
              color: activeTab === 'officer' ? '#ffffff' : colors.tabInactiveText,
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
              <div style={{ fontWeight: 800, fontSize: '0.94rem', color: colors.textTitle }}>
                Citizen Mobile Verification
              </div>
              <div style={{ fontSize: '0.74rem', color: colors.textSecondary, marginTop: '2px' }}>
                Enter your mobile number to receive live landslide risk alerts and report road hazards.
              </div>
            </div>

            {/* Error Notification */}
            {citizenError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: isLight ? '#b91c1c' : '#fca5a5',
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

            {/* Success Notification */}
            {citizenSuccess && (
              <div
                style={{
                  background: 'rgba(34, 197, 94, 0.12)',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  color: isLight ? '#15803d' : '#86efac',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  marginBottom: '12px',
                  lineHeight: 1.4
                }}
              >
                ✓ {citizenSuccess}
              </div>
            )}

            {citizenStep === 1 ? (
              <form onSubmit={handleSendCitizenOtp} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: colors.textSecondary,
                      display: 'block',
                      marginBottom: '6px',
                      letterSpacing: '0.5px'
                    }}
                  >
                    INDIAN MOBILE NUMBER (+91)
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div
                      style={{
                        background: colors.bgInput,
                        border: `1px solid ${colors.borderInput}`,
                        borderRadius: '10px',
                        padding: '11px 12px',
                        fontSize: '0.86rem',
                        fontWeight: 700,
                        color: colors.textSecondary
                      }}
                    >
                      +91
                    </div>
                    <input
                      type="tel"
                      value={citizenPhone}
                      onChange={e => {
                        setCitizenPhone(e.target.value);
                        setCitizenError('');
                      }}
                      placeholder="98765 43210"
                      maxLength={14}
                      style={{
                        flex: 1,
                        background: colors.bgInput,
                        border: `1px solid ${colors.borderInput}`,
                        borderRadius: '10px',
                        padding: '11px 12px',
                        fontSize: '0.9rem',
                        color: colors.textInput,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
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
                    marginTop: '2px'
                  }}
                >
                  {citizenLoading ? 'Sending Carrier SMS...' : 'Send Verification OTP →'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCitizenOtp} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: colors.textSecondary, letterSpacing: '0.5px' }}>
                      ENTER 6-DIGIT OTP
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setCitizenStep(1);
                        setCitizenError('');
                        setCitizenSuccess('');
                      }}
                      style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 700 }}
                    >
                      Change Phone
                    </button>
                  </div>
                  <input
                    type="text"
                    value={citizenOtp}
                    onChange={e => {
                      setCitizenOtp(e.target.value);
                      setCitizenError('');
                    }}
                    placeholder="e.g. 123456"
                    maxLength={8}
                    style={{
                      width: '100%',
                      background: colors.bgInput,
                      border: `1px solid ${colors.borderInput}`,
                      borderRadius: '10px',
                      padding: '12px',
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      letterSpacing: '4px',
                      textAlign: 'center',
                      color: colors.textInput,
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
                    marginTop: '2px'
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
                      color: citizenCooldown > 0 ? colors.textSecondary : '#0284c7',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: citizenCooldown > 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {citizenCooldown > 0 ? `Resend OTP in ${citizenCooldown}s` : 'Resend OTP via SMS'}
                  </button>
                </div>
              </form>
            )}

            {/* ── SEPARATE SIH DEMO MODE SECTION ── */}
            <div
              style={{
                marginTop: '20px',
                paddingTop: '14px',
                borderTop: `1px solid ${isLight ? '#e2e8f0' : '#1e293b'}`
              }}
            >
              <div
                style={{
                  background: colors.demoBoxBg,
                  border: colors.demoBoxBorder,
                  borderRadius: '12px',
                  padding: '12px',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#f59e0b', marginBottom: '3px' }}>
                  🧪 SIH Demo Mode
                </div>
                <div style={{ fontSize: '0.68rem', color: colors.textSecondary, marginBottom: '10px' }}>
                  Presentation & Evaluator Access — Pre-configured demo accounts
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={bypassCitizenDemo}
                    style={{
                      width: '100%',
                      background: '#2563eb',
                      border: 'none',
                      color: '#ffffff',
                      borderRadius: '8px',
                      padding: '8px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    ⚡ Launch SIH Citizen Demo Mode
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCitizenPhone('+919876543214');
                      setCitizenError('');
                      setCitizenSuccess('');
                    }}
                    style={{
                      background: 'transparent',
                      border: `1px solid ${isLight ? '#cbd5e1' : '#334155'}`,
                      color: colors.textSecondary,
                      borderRadius: '8px',
                      padding: '6px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Fill Demo Number (+919876543214 · Code: 123456)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            OFFICER TAB CONTENT
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'officer' && (
          <div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: 800, fontSize: '0.94rem', color: colors.textTitle }}>
                Authorized Officer Portal
              </div>
              <div style={{ fontSize: '0.74rem', color: colors.textSecondary, marginTop: '2px' }}>
                Restricted to District Emergency Operation Center (DEOC), SDRF, and Field Commanders.
              </div>
            </div>

            {/* Officer Method Selector */}
            <div
              style={{
                display: 'flex',
                background: colors.tabBg,
                borderRadius: '8px',
                padding: '2px',
                marginBottom: '14px',
                border: `1px solid ${colors.tabBorder}`
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setOfficerAuthMethod('otp');
                  setOfficerError('');
                  setOfficerSuccess('');
                }}
                style={{
                  flex: 1,
                  padding: '7px 4px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  border: 'none',
                  background: officerAuthMethod === 'otp' ? '#2563eb' : 'transparent',
                  color: officerAuthMethod === 'otp' ? '#ffffff' : colors.tabInactiveText,
                  cursor: 'pointer'
                }}
              >
                📱 Mobile OTP
              </button>
              <button
                type="button"
                onClick={() => {
                  setOfficerAuthMethod('password');
                  setOfficerError('');
                  setOfficerSuccess('');
                }}
                style={{
                  flex: 1,
                  padding: '7px 4px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  border: 'none',
                  background: officerAuthMethod === 'password' ? '#2563eb' : 'transparent',
                  color: officerAuthMethod === 'password' ? '#ffffff' : colors.tabInactiveText,
                  cursor: 'pointer'
                }}
              >
                🔑 Password Login
              </button>
            </div>

            {/* Officer Error Notification */}
            {officerError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: isLight ? '#b91c1c' : '#fca5a5',
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

            {/* Officer Success Notification */}
            {officerSuccess && (
              <div
                style={{
                  background: 'rgba(34, 197, 94, 0.12)',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  color: isLight ? '#15803d' : '#86efac',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  marginBottom: '12px',
                  lineHeight: 1.4
                }}
              >
                ✓ {officerSuccess}
              </div>
            )}

            {officerAuthMethod === 'otp' ? (
              officerStep === 1 ? (
                <form onSubmit={handleSendOfficerOtp} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: colors.textSecondary,
                        display: 'block',
                        marginBottom: '6px',
                        letterSpacing: '0.5px'
                      }}
                    >
                      AUTHORIZED OFFICER MOBILE NUMBER
                    </label>
                    <input
                      type="tel"
                      value={officerPhone}
                      onChange={e => {
                        setOfficerPhone(e.target.value);
                        setOfficerError('');
                      }}
                      placeholder="e.g. 98765 43210"
                      style={{
                        width: '100%',
                        background: colors.bgInput,
                        border: `1px solid ${colors.borderInput}`,
                        borderRadius: '10px',
                        padding: '11px 12px',
                        fontSize: '0.9rem',
                        color: colors.textInput,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
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
                      marginTop: '2px'
                    }}
                  >
                    {officerLoading ? 'Checking Authorization...' : 'Send Officer OTP →'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOfficerOtp} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: colors.textSecondary, letterSpacing: '0.5px' }}>
                        OFFICER VERIFICATION CODE
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setOfficerStep(1);
                          setOfficerError('');
                          setOfficerSuccess('');
                        }}
                        style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 700 }}
                      >
                        Change Number
                      </button>
                    </div>
                    <input
                      type="text"
                      value={officerOtp}
                      onChange={e => {
                        setOfficerOtp(e.target.value);
                        setOfficerError('');
                      }}
                      placeholder="e.g. 123456"
                      maxLength={8}
                      style={{
                        width: '100%',
                        background: colors.bgInput,
                        border: `1px solid ${colors.borderInput}`,
                        borderRadius: '10px',
                        padding: '12px',
                        fontSize: '1.1rem',
                        fontWeight: 800,
                        letterSpacing: '4px',
                        textAlign: 'center',
                        color: colors.textInput,
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
                      marginTop: '2px'
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
                        color: officerCooldown > 0 ? colors.textSecondary : '#0284c7',
                        fontSize: '0.74rem',
                        fontWeight: 600,
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
                  <label style={{ fontSize: '0.72rem', color: colors.textSecondary, display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                    OFFICER USERNAME
                  </label>
                  <input
                    type="text"
                    value={officerUsername}
                    onChange={e => {
                      setOfficerUsername(e.target.value);
                      setOfficerError('');
                    }}
                    placeholder="admin or aizawl_officer"
                    style={{
                      width: '100%',
                      background: colors.bgInput,
                      color: colors.textInput,
                      border: `1px solid ${colors.borderInput}`,
                      borderRadius: '8px',
                      padding: '9px 10px',
                      fontSize: '0.82rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: colors.textSecondary, display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                    PASSWORD
                  </label>
                  <input
                    type="password"
                    value={officerPassword}
                    onChange={e => {
                      setOfficerPassword(e.target.value);
                      setOfficerError('');
                    }}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      background: colors.bgInput,
                      color: colors.textInput,
                      border: `1px solid ${colors.borderInput}`,
                      borderRadius: '8px',
                      padding: '9px 10px',
                      fontSize: '0.82rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
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
                    fontWeight: 800,
                    fontSize: '0.84rem',
                    cursor: officerLoading ? 'not-allowed' : 'pointer',
                    marginTop: '4px'
                  }}
                >
                  {officerLoading ? 'Authenticating...' : 'Sign In to Officer Portal →'}
                </button>
              </form>
            )}

            {/* ── SEPARATE SIH DEMO MODE SECTION FOR OFFICERS ── */}
            <div
              style={{
                marginTop: '18px',
                paddingTop: '12px',
                borderTop: `1px solid ${isLight ? '#e2e8f0' : '#1e293b'}`
              }}
            >
              <div
                style={{
                  background: colors.demoBoxBg,
                  border: colors.demoBoxBorder,
                  borderRadius: '12px',
                  padding: '12px',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#f59e0b', marginBottom: '3px' }}>
                  🧪 SIH Demo Mode
                </div>
                <div style={{ fontSize: '0.68rem', color: colors.textSecondary, marginBottom: '8px' }}>
                  Fast evaluator bypass & pre-configured credentials
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => bypassOfficerDemo('FIELD_OFFICER', 'aizawl_officer')}
                    style={{
                      background: '#1e293b',
                      color: '#38bdf8',
                      border: `1px solid ${isLight ? '#cbd5e1' : '#334155'}`,
                      borderRadius: '8px',
                      padding: '8px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    ⚡ Launch Demo Field Officer (Aizawl)
                  </button>

                  <button
                    type="button"
                    onClick={() => bypassOfficerDemo('ADMIN', 'admin')}
                    style={{
                      background: '#1e293b',
                      color: '#fb923c',
                      border: `1px solid ${isLight ? '#cbd5e1' : '#334155'}`,
                      borderRadius: '8px',
                      padding: '8px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    ⚡ Launch Demo State Admin (Dispur)
                  </button>
                </div>

                {/* Pre-fill Chips */}
                <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setOfficerPhone('+919876543210');
                      setOfficerUsername('admin');
                      setOfficerPassword('demo1234');
                      setOfficerError('');
                    }}
                    style={{
                      background: 'rgba(56, 189, 248, 0.1)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: '#0284c7',
                      borderRadius: '6px',
                      padding: '3px 6px',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Admin: ..10 / demo1234
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOfficerPhone('+919876543213');
                      setOfficerUsername('aizawl_officer');
                      setOfficerPassword('demo1234');
                      setOfficerError('');
                    }}
                    style={{
                      background: 'rgba(168, 85, 247, 0.1)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      color: isLight ? '#7c3aed' : '#c084fc',
                      borderRadius: '6px',
                      padding: '3px 6px',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Aizawl: ..13 / demo1234
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer System Badge */}
      <div style={{ marginTop: '16px', fontSize: '0.68rem', color: colors.footerText, textAlign: 'center' }}>
        🔒 SATARK EWS Native Android Client · 256-Bit Encrypted Session
      </div>
    </div>
  );
};
