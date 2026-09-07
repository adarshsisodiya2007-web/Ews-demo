import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';
import {
  sendCitizenOtp,
  verifyCitizenOtp,
  createCitizenProfile,
  sendOfficerOtp,
  verifyOfficerOtp
} from '../services/citizenAuthService';
import { CitizenProfileInput } from '../types';
import { useTheme } from '../context/ThemeContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  // Primary Mode: 'real_otp' (Production carrier SMS) vs 'sih_demo' (One-click judge/evaluator access)
  const [authMode, setAuthMode] = useState<'real_otp' | 'sih_demo'>('real_otp');

  // Under real_otp: 'citizen' or 'officer'
  const [userRole, setUserRole] = useState<'citizen' | 'officer'>('citizen');

  // Citizen OTP flow: 1 = Phone, 2 = OTP, 3 = Create Profile
  const [citizenStep, setCitizenStep] = useState<1 | 2 | 3>(1);
  const [citizenPhone, setCitizenPhone] = useState<string>('');
  const [citizenOtp, setCitizenOtp] = useState<string>('');
  const [citizenNotice, setCitizenNotice] = useState<string>('');
  const [citizenCooldown, setCitizenCooldown] = useState<number>(0);
  const [citizenLoading, setCitizenLoading] = useState<boolean>(false);
  const [citizenError, setCitizenError] = useState<string>('');
  const [citizenIsUnregistered, setCitizenIsUnregistered] = useState<boolean>(false);

  // Profile creation form for first-time citizens
  const [profileForm, setProfileForm] = useState<CitizenProfileInput>({
    fullName: '',
    gender: '',
    ageGroup: '',
    preferredLanguage: 'en',
    bloodGroup: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    accessibilityNeeds: ''
  });
  const [profileLoading, setProfileLoading] = useState<boolean>(false);

  // Officer Real OTP flow: 1 = Phone, 2 = OTP
  const [officerStep, setOfficerStep] = useState<1 | 2>(1);
  const [officerPhone, setOfficerPhone] = useState<string>('');
  const [officerOtp, setOfficerOtp] = useState<string>('');
  const [officerNotice, setOfficerNotice] = useState<string>('');
  const [officerCooldown, setOfficerCooldown] = useState<number>(0);
  const [officerOtpLoading, setOfficerOtpLoading] = useState<boolean>(false);
  const [officerOtpError, setOfficerOtpError] = useState<string>('');
  const [officerIsUnauthorized, setOfficerIsUnauthorized] = useState<boolean>(false);

  // SIH Demo Officer Login (Username/Password)
  const [demoUsername, setDemoUsername] = useState<string>('admin');
  const [demoPassword, setDemoPassword] = useState<string>('demo1234');
  const [demoError, setDemoError] = useState<string>('');
  const [demoLoading, setDemoLoading] = useState<boolean>(false);

  // Language & UI translations
  const [lang, setLang] = useState<'en' | 'hi' | 'as'>('en');

  // Cooldown timers
  useEffect(() => {
    if (citizenCooldown > 0) {
      const timer = setTimeout(() => setCitizenCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [citizenCooldown]);

  useEffect(() => {
    if (officerCooldown > 0) {
      const timer = setTimeout(() => setOfficerCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [officerCooldown]);

  // ── CITIZEN REAL OTP HANDLERS ──────────────────────────────────────────────
  const handleSendCitizenOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPhone = citizenPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setCitizenError('Please enter a valid 10-digit Indian mobile number.');
      setCitizenIsUnregistered(false);
      return;
    }

    setCitizenLoading(true);
    setCitizenError('');
    setCitizenIsUnregistered(false);

    try {
      const res = await sendCitizenOtp(citizenPhone);
      if (res.demoMode && res.demoOtp) {
        setCitizenNotice(`SIH Demo OTP active: Enter ${res.demoOtp}`);
      } else {
        setCitizenNotice(`OTP sent successfully to +91 ${cleanPhone}`);
      }
      setCitizenCooldown(res.cooldownSeconds || 60);
      setCitizenStep(2);
    } catch (err: any) {
      const msg = err.message || 'Failed to send OTP. Please check your connection.';
      setCitizenError(msg);
      if (err.isUnregistered || msg.toLowerCase().includes('not registered')) {
        setCitizenIsUnregistered(true);
      }
    } finally {
      setCitizenLoading(false);
    }
  };

  const handleVerifyCitizenOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!citizenOtp.trim() || citizenOtp.trim().length !== 6) {
      setCitizenError('Please enter the complete 6-digit OTP code.');
      return;
    }

    setCitizenLoading(true);
    setCitizenError('');

    try {
      const res = await verifyCitizenOtp(citizenPhone, citizenOtp);
      if (res.profileExists && res.profile) {
        navigate('/citizen');
      } else {
        setCitizenStep(3);
      }
    } catch (err: any) {
      setCitizenError(err.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setCitizenLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.fullName.trim()) {
      setCitizenError('Please enter your full name.');
      return;
    }

    setProfileLoading(true);
    setCitizenError('');

    try {
      await createCitizenProfile({
        ...profileForm,
        preferredLanguage: profileForm.preferredLanguage || lang
      });
      navigate('/citizen');
    } catch (err: any) {
      setCitizenError(err.response?.data?.message || 'Failed to save profile. Continuing to portal...');
      setTimeout(() => navigate('/citizen'), 1200);
    } finally {
      setProfileLoading(false);
    }
  };

  const resetCitizenFlow = () => {
    setCitizenStep(1);
    setCitizenOtp('');
    setCitizenError('');
    setCitizenIsUnregistered(false);
  };

  // ── OFFICER REAL OTP HANDLERS ──────────────────────────────────────────────
  const handleSendOfficerOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPhone = officerPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setOfficerOtpError('Please enter a valid 10-digit registered officer mobile number.');
      setOfficerIsUnauthorized(false);
      return;
    }

    setOfficerOtpLoading(true);
    setOfficerOtpError('');
    setOfficerIsUnauthorized(false);

    try {
      const res = await sendOfficerOtp(officerPhone);
      if (res.demoMode && res.demoOtp) {
        setOfficerNotice(`SIH Demo OTP active: Enter ${res.demoOtp}`);
      } else {
        setOfficerNotice(`Officer OTP sent successfully to +91 ${cleanPhone}`);
      }
      setOfficerCooldown(res.cooldownSeconds || 60);
      setOfficerStep(2);
    } catch (err: any) {
      const msg = err.message || 'Failed to send officer OTP. Please check your connection.';
      setOfficerOtpError(msg);
      if (err.isUnauthorized || msg.toLowerCase().includes('not registered')) {
        setOfficerIsUnauthorized(true);
      }
    } finally {
      setOfficerOtpLoading(false);
    }
  };

  const handleVerifyOfficerOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officerOtp.trim() || officerOtp.trim().length !== 6) {
      setOfficerOtpError('Please enter the complete 6-digit OTP code.');
      return;
    }

    setOfficerOtpLoading(true);
    setOfficerOtpError('');

    try {
      const data = await verifyOfficerOtp(officerPhone, officerOtp);
      if (data.role === 'FIELD_OFFICER') {
        navigate('/responder');
      } else if (['ADMIN', 'DISTRICT_OFFICIAL'].includes(data.role)) {
        navigate('/dashboard');
      } else {
        navigate('/citizen');
      }
    } catch (err: any) {
      setOfficerOtpError(err.message || 'Invalid or expired Officer OTP. Please try again.');
    } finally {
      setOfficerOtpLoading(false);
    }
  };

  const resetOfficerFlow = () => {
    setOfficerStep(1);
    setOfficerOtp('');
    setOfficerOtpError('');
    setOfficerIsUnauthorized(false);
  };

  // ── SIH DEMO OFFICER LOGIN (USERNAME / PASSWORD) ───────────────────────────
  const handleDemoOfficerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoUsername || !demoPassword) {
      setDemoError('Please enter both username and password.');
      return;
    }

    setDemoLoading(true);
    setDemoError('');

    try {
      const data = await login(demoUsername, demoPassword);
      localStorage.setItem('ews_token', data.token);
      localStorage.setItem('ews_role', data.role);
      localStorage.setItem('ews_user', data.username);
      localStorage.setItem('ews_lang', data.languagePref || 'en');

      if (data.role === 'FIELD_OFFICER') {
        navigate('/responder');
      } else if (['ADMIN', 'DISTRICT_OFFICIAL'].includes(data.role)) {
        navigate('/dashboard');
      } else {
        navigate('/citizen');
      }
    } catch {
      setDemoError('Authentication failed. Try: admin / demo1234');
    } finally {
      setDemoLoading(false);
    }
  };

  const fillDemoAccount = (user: string) => {
    setDemoUsername(user);
    setDemoPassword('demo1234');
    setDemoError('');
  };

  const enterResponderDirectly = () => {
    localStorage.setItem('ews_token', 'demo-responder-jwt-direct');
    localStorage.setItem('ews_role', 'FIELD_OFFICER');
    localStorage.setItem('ews_user', 'field_responder');
    navigate('/responder');
  };

  const enterCitizenDemoDirectly = () => {
    localStorage.setItem('ews_token', 'demo-citizen-jwt-direct');
    localStorage.setItem('ews_role', 'CITIZEN');
    localStorage.setItem('ews_user', '+919876543214');
    localStorage.setItem('satark_citizen_phone', '+919876543214');
    navigate('/citizen');
  };

  // ── THEME COLORS ───────────────────────────────────────────────────────────
  const colors = {
    pageBg: isDark
      ? "linear-gradient(180deg, rgba(7, 11, 20, 0.88) 0%, rgba(10, 16, 32, 0.94) 100%), url('/landslide_bg.jpg') center/cover fixed no-repeat"
      : "linear-gradient(180deg, rgba(248, 250, 252, 0.94) 0%, rgba(241, 245, 249, 0.98) 100%), url('/landslide_bg.jpg') center/cover fixed no-repeat",
    headerBg: isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.92)',
    headerBorder: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.8)',
    cardBg: isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.96)',
    cardBorder: isDark ? 'rgba(56, 189, 248, 0.3)' : 'rgba(203, 213, 225, 0.8)',
    cardShadow: isDark ? '0 12px 40px rgba(0, 0, 0, 0.5)' : '0 12px 40px rgba(15, 23, 42, 0.08)',
    tabBarBg: isDark ? 'rgba(15, 23, 42, 0.85)' : '#f1f5f9',
    tabBarBorder: isDark ? 'rgba(51, 65, 85, 0.6)' : '#e2e8f0',
    inputBg: isDark ? '#1e293b' : '#f8fafc',
    inputBorder: isDark ? '#334155' : '#cbd5e1',
    inputText: isDark ? '#f8fafc' : '#0f172a',
    titleColor: isDark ? '#f8fafc' : '#0f172a',
    mutedColor: isDark ? '#94a3b8' : '#64748b',
    footerBorder: isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.8)',
  };

  const t = {
    en: {
      heroTitle: 'Northeast & Western Ghats Disaster Intelligence',
      heroSubtitle: 'Real-time safety alerts, NASA 30m terrain analytics, AI-powered risk prediction, and safe evacuation for India.',
      liveBadge: '🟢 LIVE MONITORING & TELEMETRY SYNC',
      realOtpTab: '📱 Real Carrier OTP',
      sihDemoTab: '🧪 SIH 2026 Demo Mode',
      citizenSubTab: 'Citizen Login (Mobile OTP)',
      officerSubTab: 'Authorized Officer (Mobile OTP)',
      guestBtn: 'Continue without Sign In →',
    },
    hi: {
      heroTitle: 'पूर्वोत्तर एवं पश्चिमी घाट आपदा पूर्व सूचना प्रणाली',
      heroSubtitle: 'रीयल-टाइम सुरक्षा चेतावनी, नासा 30m भू-भाग विश्लेषण, एआई-संचालित जोखिम भविष्यवाणी एवं सुरक्षित निकासी।',
      liveBadge: '🟢 लाइव निगरानी एवं उपग्रह टेलीमेट्री',
      realOtpTab: '📱 वास्तविक मोबाइल OTP',
      sihDemoTab: '🧪 SIH 2026 डेमो मोड',
      citizenSubTab: 'नागरिक लॉगिन (मोबाइल OTP)',
      officerSubTab: 'अधिकृत अधिकारी (मोबाइल OTP)',
      guestBtn: 'बिना लॉगिन जारी रखें →',
    },
    as: {
      heroTitle: 'উত্তৰ-পূব দুৰ্যোগ চোৰাংচোৱা প্লেটফৰ্ম',
      heroSubtitle: 'প্ৰকৃত সময়ৰ সুৰক্ষা সতৰ্কবাৰ্তা, নাছা ৩০মি উচ্চতা বিশ্লেষণ আৰু এআই ভূমিস্খলন পূৰ্বানুমান।',
      liveBadge: '🟢 লাইভ নিৰীক্ষণ সক্ৰিয়',
      realOtpTab: '📱 মোবাইল OTP',
      sihDemoTab: '🧪 SIH 2026 ডেমো মোড',
      citizenSubTab: 'নাগৰিক প্ৰৱেশ (OTP)',
      officerSubTab: 'প্ৰাধিকৃত বিষয়া (OTP)',
      guestBtn: 'লগইন নকৰাকৈ আগবাঢ়ক →',
    }
  }[lang];


  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.pageBg,
        color: colors.inputText,
        fontFamily: 'Inter, system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        transition: 'background 0.25s ease, color 0.25s ease',
      }}
    >
      {/* ── Top Header with SATARK Branding & Theme Switcher ── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          background: colors.headerBg,
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${colors.headerBorder}`,
          position: 'sticky',
          top: 0,
          zIndex: 50,
          flexWrap: 'wrap',
          gap: '12px',
          transition: 'background 0.25s ease',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/satark_emblem.png"
            alt="SATARK Logo"
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              objectFit: 'contain',
              background: '#ffffff',
              padding: '2px',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.25)',
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 900, fontSize: '1.25rem', letterSpacing: '0.04em', color: colors.titleColor }}>
                SATARK
              </span>
              <span
                style={{
                  background: isDark ? 'rgba(56, 189, 248, 0.15)' : '#e0f2fe',
                  color: isDark ? '#38bdf8' : '#0284c7',
                  border: isDark ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid #bae6fd',
                  borderRadius: '6px',
                  padding: '1px 8px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.02em',
                }}
              >
                Citizen Safety
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: colors.mutedColor, marginTop: '2px' }}>
              National Early Warning Network
            </div>
          </div>
        </div>

        {/* Controls: Language, Theme Toggle, Shortcuts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Global Theme Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
              background: isDark ? '#1e293b' : '#f8fafc',
              color: isDark ? '#f8fafc' : '#0f172a',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: isDark ? '0 2px 6px rgba(0,0,0,0.3)' : '0 2px 6px rgba(0,0,0,0.06)',
              transition: 'all 0.2s ease',
            }}
          >
            <span>{isDark ? '☀️' : '🌙'}</span>
            <span>{isDark ? 'Light' : 'Dark'}</span>
          </button>

          {/* Language selector */}
          <div
            style={{
              display: 'flex',
              background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
              borderRadius: '20px',
              padding: '2px',
            }}
          >
            {(['en', 'hi', 'as'] as const).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  border: 'none',
                  background: lang === l ? '#2563eb' : 'transparent',
                  color: lang === l ? '#fff' : (isDark ? '#cbd5e1' : '#475569'),
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={() => navigate('/sih-dashboard')}
            style={{
              background: isDark ? 'rgba(56, 189, 248, 0.15)' : '#e0f2fe',
              border: isDark ? '1px solid #38bdf8' : '1px solid #0284c7',
              color: isDark ? '#38bdf8' : '#0369a1',
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            🗺️ 3D GIS Map
          </button>

          <button
            onClick={() => navigate('/responder')}
            style={{
              background: isDark ? 'rgba(234, 88, 12, 0.2)' : '#ffedd5',
              border: '1px solid #ea580c',
              color: isDark ? '#fb923c' : '#c2410c',
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            🛡️ Responder
          </button>
        </div>
      </header>

      {/* ── Main Section ── */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '28px 16px',
        }}
      >
        {/* Hero title */}
        <div style={{ textAlign: 'center', maxWidth: '640px', marginBottom: '20px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7',
              border: isDark ? '1px solid #22c55e' : '1px solid #86efac',
              color: isDark ? '#4ade80' : '#15803d',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              marginBottom: '10px',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            {t.liveBadge}
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 8px 0', color: colors.titleColor }}>
            {t.heroTitle}
          </h1>
          <p style={{ fontSize: '0.9rem', color: colors.mutedColor, lineHeight: '1.55', margin: 0 }}>
            {t.heroSubtitle}
          </p>
        </div>

        {/* ── TOP-LEVEL AUTH MODE TABS: Real Carrier OTP vs SIH 2026 Demo Mode ── */}
        <div
          style={{
            display: 'flex',
            background: colors.tabBarBg,
            border: `1px solid ${colors.tabBarBorder}`,
            borderRadius: '12px',
            padding: '4px',
            marginBottom: '16px',
            maxWidth: '520px',
            width: '100%',
          }}
        >
          <button
            type="button"
            onClick={() => setAuthMode('real_otp')}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '8px',
              border: 'none',
              background: authMode === 'real_otp' ? 'linear-gradient(135deg, #2563eb, #0284c7)' : 'transparent',
              color: authMode === 'real_otp' ? '#ffffff' : colors.mutedColor,
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {t.realOtpTab}
          </button>
          <button
            type="button"
            onClick={() => setAuthMode('sih_demo')}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '8px',
              border: 'none',
              background: authMode === 'sih_demo' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
              color: authMode === 'sih_demo' ? '#ffffff' : colors.mutedColor,
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {t.sihDemoTab}
          </button>
        </div>

        {/* ── MAIN CARD ── */}
        <div
          style={{
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: '20px',
            padding: '28px',
            backdropFilter: 'blur(16px)',
            maxWidth: '520px',
            width: '100%',
            boxShadow: colors.cardShadow,
            boxSizing: 'border-box',
            transition: 'background 0.25s ease, border 0.25s ease',
          }}
        >
          {authMode === 'real_otp' ? (
            /* ══════════════════════════════════════════════════════════════════════
               MODE 1: REAL CARRIER OTP (CITIZEN & AUTHORIZED OFFICER)
               ══════════════════════════════════════════════════════════════════════ */
            <div>
              {/* Role Sub-tabs */}
              <div
                style={{
                  display: 'flex',
                  background: isDark ? '#1e293b' : '#f1f5f9',
                  borderRadius: '10px',
                  padding: '3px',
                  marginBottom: '20px',
                }}
              >
                <button
                  type="button"
                  onClick={() => { setUserRole('citizen'); resetCitizenFlow(); }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: userRole === 'citizen' ? (isDark ? '#334155' : '#ffffff') : 'transparent',
                    color: userRole === 'citizen' ? (isDark ? '#38bdf8' : '#0284c7') : colors.mutedColor,
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: userRole === 'citizen' ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {t.citizenSubTab}
                </button>
                <button
                  type="button"
                  onClick={() => { setUserRole('officer'); resetOfficerFlow(); }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: userRole === 'officer' ? (isDark ? '#334155' : '#ffffff') : 'transparent',
                    color: userRole === 'officer' ? (isDark ? '#a855f7' : '#7c3aed') : colors.mutedColor,
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: userRole === 'officer' ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {t.officerSubTab}
                </button>
              </div>

              {userRole === 'citizen' ? (
                /* ─────────────────────────────────────────────────────────────
                   CITIZEN REAL OTP FLOW
                   ───────────────────────────────────────────────────────────── */
                <div>
                  {citizenStep === 1 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <span style={{ fontSize: '1.8rem' }}>📱</span>
                        <div>
                          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: colors.titleColor }}>
                            Citizen Mobile Verification
                          </h2>
                          <div style={{ fontSize: '0.78rem', color: colors.mutedColor, marginTop: '2px' }}>
                            Registered citizens receive a real SMS OTP for instant access.
                          </div>
                        </div>
                      </div>

                      {citizenError && (
                        <div
                          style={{
                            background: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2',
                            border: '1px solid #ef4444',
                            borderRadius: '10px',
                            padding: '12px 14px',
                            fontSize: '0.84rem',
                            color: isDark ? '#fca5a5' : '#b91c1c',
                            marginBottom: '16px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>⚠️</span>
                            <span style={{ fontWeight: 600 }}>{citizenError}</span>
                          </div>

                          {citizenIsUnregistered && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                onClick={resetCitizenFlow}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid #ef4444',
                                  background: isDark ? '#1e293b' : '#ffffff',
                                  color: isDark ? '#fca5a5' : '#b91c1c',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                ⟲ Try Again
                              </button>
                              <button
                                type="button"
                                onClick={() => setAuthMode('sih_demo')}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid #10b981',
                                  background: isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7',
                                  color: isDark ? '#86efac' : '#15803d',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                🧪 Switch to SIH Demo Mode
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      <form onSubmit={handleSendCitizenOtp}>
                        <div style={{ marginBottom: '18px' }}>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: colors.titleColor, marginBottom: '6px' }}>
                            Registered 10-Digit Mobile Number
                          </label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <div
                              style={{
                                background: colors.inputBg,
                                border: `1px solid ${colors.inputBorder}`,
                                borderRadius: '8px',
                                padding: '10px 12px',
                                fontSize: '0.9rem',
                                color: colors.mutedColor,
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <span>🇮🇳</span>
                              <span>+91</span>
                            </div>
                            <input
                              type="tel"
                              required
                              maxLength={10}
                              value={citizenPhone}
                              onChange={(e) => setCitizenPhone(e.target.value.replace(/\D/g, ''))}
                              placeholder="98765 43210"
                              style={{
                                flex: 1,
                                padding: '10px 14px',
                                borderRadius: '8px',
                                background: colors.inputBg,
                                border: `1px solid ${colors.inputBorder}`,
                                color: colors.inputText,
                                fontSize: '0.95rem',
                                outline: 'none',
                                fontWeight: 600,
                              }}
                            />
                          </div>
                          <div style={{ fontSize: '0.72rem', color: colors.mutedColor, marginTop: '6px' }}>
                            Only registered citizen mobile numbers can authenticate via real carrier OTP.
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={citizenLoading}
                          style={{
                            width: '100%',
                            padding: '13px',
                            background: 'linear-gradient(135deg, #2563eb, #0284c7)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '0.95rem',
                            fontWeight: 800,
                            cursor: citizenLoading ? 'wait' : 'pointer',
                            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                          }}
                        >
                          {citizenLoading ? 'Sending Carrier OTP...' : 'Send SMS OTP Code →'}
                        </button>
                      </form>

                      <div style={{ textAlign: 'center', marginTop: '16px', paddingTop: '14px', borderTop: `1px solid ${colors.tabBarBorder}` }}>
                        <button
                          type="button"
                          onClick={() => navigate('/citizen')}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: isDark ? '#38bdf8' : '#0284c7',
                            fontSize: '0.84rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {t.guestBtn || 'Continue without Sign In →'}
                        </button>
                      </div>
                    </div>
                  )}

                  {citizenStep === 2 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <span style={{ fontSize: '1.8rem' }}>🔢</span>
                        <div>
                          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: colors.titleColor }}>
                            Verify Citizen OTP
                          </h2>
                          <div style={{ fontSize: '0.78rem', color: colors.mutedColor, marginTop: '2px' }}>
                            Enter the 6-digit SMS code sent to <strong>+91 {citizenPhone}</strong>
                          </div>
                        </div>
                      </div>

                      {citizenNotice && (
                        <div
                          style={{
                            background: isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7',
                            border: isDark ? '1px solid #22c55e' : '1px solid #86efac',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            fontSize: '0.82rem',
                            color: isDark ? '#86efac' : '#15803d',
                            marginBottom: '14px',
                            fontWeight: 600,
                          }}
                        >
                          💡 {citizenNotice}
                        </div>
                      )}

                      {citizenError && (
                        <div
                          style={{
                            background: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2',
                            border: '1px solid #ef4444',
                            borderRadius: '8px',
                            padding: '10px',
                            fontSize: '0.82rem',
                            color: isDark ? '#fca5a5' : '#b91c1c',
                            marginBottom: '14px',
                          }}
                        >
                          ⚠️ {citizenError}
                        </div>
                      )}

                      <form onSubmit={handleVerifyCitizenOtp}>
                        <div style={{ marginBottom: '18px' }}>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: colors.titleColor, marginBottom: '6px' }}>
                            6-Digit Security OTP
                          </label>
                          <input
                            type="text"
                            maxLength={6}
                            required
                            value={citizenOtp}
                            onChange={(e) => setCitizenOtp(e.target.value.replace(/\D/g, ''))}
                            placeholder="123456"
                            style={{
                              width: '100%',
                              boxSizing: 'border-box',
                              padding: '12px 14px',
                              borderRadius: '8px',
                              background: colors.inputBg,
                              border: `1px solid ${colors.inputBorder}`,
                              color: colors.inputText,
                              fontSize: '1.4rem',
                              textAlign: 'center',
                              letterSpacing: '0.3em',
                              fontWeight: 800,
                              outline: 'none',
                            }}
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={citizenLoading}
                          style={{
                            width: '100%',
                            padding: '13px',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '0.95rem',
                            fontWeight: 800,
                            cursor: citizenLoading ? 'wait' : 'pointer',
                            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                          }}
                        >
                          {citizenLoading ? 'Verifying OTP...' : 'Verify OTP & Continue →'}
                        </button>
                      </form>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '0.8rem' }}>
                        <button
                          type="button"
                          onClick={resetCitizenFlow}
                          style={{ background: 'transparent', border: 'none', color: colors.mutedColor, cursor: 'pointer', padding: 0 }}
                        >
                          ← Change Phone
                        </button>

                        {citizenCooldown > 0 ? (
                          <span style={{ color: colors.mutedColor }}>Resend in {citizenCooldown}s</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSendCitizenOtp()}
                            style={{ background: 'transparent', border: 'none', color: isDark ? '#38bdf8' : '#0284c7', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                          >
                            Resend Code
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {citizenStep === 3 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <span style={{ fontSize: '1.8rem' }}>👤</span>
                        <div>
                          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: colors.titleColor }}>
                            Complete Citizen Profile
                          </h2>
                          <div style={{ fontSize: '0.78rem', color: colors.mutedColor, marginTop: '2px' }}>
                            Essential details for disaster rescue response.
                          </div>
                        </div>
                      </div>

                      <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: colors.titleColor, marginBottom: '4px' }}>
                            Full Name <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={profileForm.fullName}
                            onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                            placeholder="e.g. Adarsh Singh"
                            style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '8px', background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, color: colors.inputText, fontSize: '0.88rem' }}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: colors.titleColor, marginBottom: '4px' }}>
                              Language
                            </label>
                            <select
                              value={profileForm.preferredLanguage}
                              onChange={(e) => setProfileForm({ ...profileForm, preferredLanguage: e.target.value })}
                              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '8px', background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, color: colors.inputText, fontSize: '0.88rem' }}
                            >
                              <option value="en">English</option>
                              <option value="hi">हिंदी (Hindi)</option>
                              <option value="as">অসমীয়া (Assamese)</option>
                            </select>
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: colors.titleColor, marginBottom: '4px' }}>
                              Blood Group
                            </label>
                            <select
                              value={profileForm.bloodGroup}
                              onChange={(e) => setProfileForm({ ...profileForm, bloodGroup: e.target.value })}
                              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '8px', background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, color: colors.inputText, fontSize: '0.88rem' }}
                            >
                              <option value="">Not specified</option>
                              <option value="A+">A+</option>
                              <option value="A-">A-</option>
                              <option value="B+">B+</option>
                              <option value="B-">B-</option>
                              <option value="O+">O+</option>
                              <option value="O-">O-</option>
                              <option value="AB+">AB+</option>
                              <option value="AB-">AB-</option>
                            </select>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={profileLoading}
                          style={{
                            width: '100%',
                            padding: '12px',
                            background: 'linear-gradient(135deg, #2563eb, #0284c7)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '0.95rem',
                            fontWeight: 800,
                            cursor: profileLoading ? 'wait' : 'pointer',
                            marginTop: '6px',
                          }}
                        >
                          {profileLoading ? 'Saving Profile...' : 'Save Profile & Enter SATARK →'}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              ) : (
                /* ─────────────────────────────────────────────────────────────
                   OFFICER REAL OTP FLOW
                   ───────────────────────────────────────────────────────────── */
                <div>
                  {officerStep === 1 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <span style={{ fontSize: '1.8rem' }}>🛡️</span>
                        <div>
                          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: colors.titleColor }}>
                            Officer Mobile OTP Access
                          </h2>
                          <div style={{ fontSize: '0.78rem', color: colors.mutedColor, marginTop: '2px' }}>
                            Authorized disaster officers authenticate with their registered phone number.
                          </div>
                        </div>
                      </div>

                      {officerOtpError && (
                        <div
                          style={{
                            background: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2',
                            border: '1px solid #ef4444',
                            borderRadius: '10px',
                            padding: '12px 14px',
                            fontSize: '0.84rem',
                            color: isDark ? '#fca5a5' : '#b91c1c',
                            marginBottom: '16px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>⚠️</span>
                            <span style={{ fontWeight: 600 }}>{officerOtpError}</span>
                          </div>

                          {officerIsUnauthorized && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                onClick={resetOfficerFlow}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid #ef4444',
                                  background: isDark ? '#1e293b' : '#ffffff',
                                  color: isDark ? '#fca5a5' : '#b91c1c',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                ⟲ Try Again
                              </button>
                              <button
                                type="button"
                                onClick={() => setAuthMode('sih_demo')}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid #10b981',
                                  background: isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7',
                                  color: isDark ? '#86efac' : '#15803d',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                🧪 Switch to SIH Demo Mode
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      <form onSubmit={handleSendOfficerOtp}>
                        <div style={{ marginBottom: '18px' }}>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: colors.titleColor, marginBottom: '6px' }}>
                            Authorized Officer Mobile Number
                          </label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <div
                              style={{
                                background: colors.inputBg,
                                border: `1px solid ${colors.inputBorder}`,
                                borderRadius: '8px',
                                padding: '10px 12px',
                                fontSize: '0.9rem',
                                color: colors.mutedColor,
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <span>🇮🇳</span>
                              <span>+91</span>
                            </div>
                            <input
                              type="tel"
                              required
                              maxLength={10}
                              value={officerPhone}
                              onChange={(e) => setOfficerPhone(e.target.value.replace(/\D/g, ''))}
                              placeholder="98765 43210"
                              style={{
                                flex: 1,
                                padding: '10px 14px',
                                borderRadius: '8px',
                                background: colors.inputBg,
                                border: `1px solid ${colors.inputBorder}`,
                                color: colors.inputText,
                                fontSize: '0.95rem',
                                outline: 'none',
                                fontWeight: 600,
                              }}
                            />
                          </div>
                          <div style={{ fontSize: '0.72rem', color: colors.mutedColor, marginTop: '6px' }}>
                            Strict RBAC active: Number must be pre-authorized in the official registry.
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={officerOtpLoading}
                          style={{
                            width: '100%',
                            padding: '13px',
                            background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '0.95rem',
                            fontWeight: 800,
                            cursor: officerOtpLoading ? 'wait' : 'pointer',
                            boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
                          }}
                        >
                          {officerOtpLoading ? 'Sending Officer OTP...' : 'Send Officer OTP Code →'}
                        </button>
                      </form>

                      {/* Demo officer numbers cheat-sheet */}
                      <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: `1px solid ${colors.tabBarBorder}` }}>
                        <span style={{ fontSize: '0.72rem', color: colors.mutedColor, display: 'block', marginBottom: '8px' }}>
                          Authorized Officer Phones (Pre-registered in system):
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {[
                            { label: 'Admin', phone: '9876543210' },
                            { label: 'Kamrup Official', phone: '9876543211' },
                            { label: 'East Khasi Hills', phone: '9876543212' },
                            { label: 'Aizawl Responder', phone: '9876543213' }
                          ].map(item => (
                            <button
                              key={item.phone}
                              type="button"
                              onClick={() => { setOfficerPhone(item.phone); setOfficerOtpError(''); }}
                              style={{
                                background: colors.inputBg,
                                color: isDark ? '#38bdf8' : '#0284c7',
                                border: `1px solid ${colors.inputBorder}`,
                                borderRadius: '6px',
                                padding: '4px 8px',
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                                fontWeight: 600,
                              }}
                            >
                              {item.label}: {item.phone}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {officerStep === 2 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <span style={{ fontSize: '1.8rem' }}>🔢</span>
                        <div>
                          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: colors.titleColor }}>
                            Verify Officer OTP
                          </h2>
                          <div style={{ fontSize: '0.78rem', color: colors.mutedColor, marginTop: '2px' }}>
                            Enter the 6-digit SMS code sent to <strong>+91 {officerPhone}</strong>
                          </div>
                        </div>
                      </div>

                      {officerNotice && (
                        <div
                          style={{
                            background: isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7',
                            border: isDark ? '1px solid #22c55e' : '1px solid #86efac',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            fontSize: '0.82rem',
                            color: isDark ? '#86efac' : '#15803d',
                            marginBottom: '14px',
                            fontWeight: 600,
                          }}
                        >
                          💡 {officerNotice}
                        </div>
                      )}

                      {officerOtpError && (
                        <div
                          style={{
                            background: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2',
                            border: '1px solid #ef4444',
                            borderRadius: '8px',
                            padding: '10px',
                            fontSize: '0.82rem',
                            color: isDark ? '#fca5a5' : '#b91c1c',
                            marginBottom: '14px',
                          }}
                        >
                          ⚠️ {officerOtpError}
                        </div>
                      )}

                      <form onSubmit={handleVerifyOfficerOtp}>
                        <div style={{ marginBottom: '18px' }}>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: colors.titleColor, marginBottom: '6px' }}>
                            6-Digit Officer OTP
                          </label>
                          <input
                            type="text"
                            maxLength={6}
                            required
                            value={officerOtp}
                            onChange={(e) => setOfficerOtp(e.target.value.replace(/\D/g, ''))}
                            placeholder="123456"
                            style={{
                              width: '100%',
                              boxSizing: 'border-box',
                              padding: '12px 14px',
                              borderRadius: '8px',
                              background: colors.inputBg,
                              border: `1px solid ${colors.inputBorder}`,
                              color: colors.inputText,
                              fontSize: '1.4rem',
                              textAlign: 'center',
                              letterSpacing: '0.3em',
                              fontWeight: 800,
                              outline: 'none',
                            }}
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={officerOtpLoading}
                          style={{
                            width: '100%',
                            padding: '13px',
                            background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '0.95rem',
                            fontWeight: 800,
                            cursor: officerOtpLoading ? 'wait' : 'pointer',
                            boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
                          }}
                        >
                          {officerOtpLoading ? 'Verifying...' : 'Verify & Open Portal →'}
                        </button>
                      </form>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '0.8rem' }}>
                        <button
                          type="button"
                          onClick={resetOfficerFlow}
                          style={{ background: 'transparent', border: 'none', color: colors.mutedColor, cursor: 'pointer', padding: 0 }}
                        >
                          ← Change Phone
                        </button>

                        {officerCooldown > 0 ? (
                          <span style={{ color: colors.mutedColor }}>Resend in {officerCooldown}s</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSendOfficerOtp()}
                            style={{ background: 'transparent', border: 'none', color: isDark ? '#a855f7' : '#7c3aed', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                          >
                            Resend Code
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ══════════════════════════════════════════════════════════════════════
               MODE 2: SIH 2026 DEMO MODE (INSTANT EVALUATOR ACCESS)
               ══════════════════════════════════════════════════════════════════════ */
            <div>
              <div
                style={{
                  background: isDark ? 'rgba(16, 185, 129, 0.12)' : '#dcfce7',
                  border: isDark ? '1px solid #10b981' : '1px solid #86efac',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  marginBottom: '16px',
                  fontSize: '0.8rem',
                  color: isDark ? '#86efac' : '#15803d',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>🧪</span>
                <span><strong>SIH 2026 Presentation Mode</strong>: Instant one-click credentials for judges and evaluators without carrier SMS dependency.</span>
              </div>

              {/* Direct 1-Tap Responder Portal Shortcut */}
              <div style={{ marginBottom: '14px' }}>
                <button
                  type="button"
                  onClick={enterResponderDirectly}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: isDark ? 'rgba(234, 88, 12, 0.2)' : '#ffedd5',
                    border: '1px solid #ea580c',
                    borderRadius: '10px',
                    color: isDark ? '#fb923c' : '#c2410c',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 8px rgba(234, 88, 12, 0.2)'
                  }}
                >
                  <span>🛡️</span>
                  <span>1-Tap Field Responder Portal Access →</span>
                </button>
              </div>

              {/* Direct Citizen Demo Shortcut */}
              <div style={{ marginBottom: '18px' }}>
                <button
                  type="button"
                  onClick={enterCitizenDemoDirectly}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    background: isDark ? 'rgba(37, 99, 235, 0.15)' : '#dbeafe',
                    border: '1px solid #2563eb',
                    borderRadius: '10px',
                    color: isDark ? '#38bdf8' : '#1d4ed8',
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <span>📱</span>
                  <span>1-Tap Citizen Demo Portal Access →</span>
                </button>
              </div>

              {/* Officer Demo Login Form */}
              <div style={{ borderTop: `1px solid ${colors.tabBarBorder}`, paddingTop: '14px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: colors.titleColor, marginBottom: '10px' }}>
                  Officer &amp; Administrator Credential Sign In
                </div>

                {demoError && (
                  <div style={{ background: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2', border: '1px solid #ef4444', borderRadius: '8px', padding: '8px 12px', fontSize: '0.8rem', color: isDark ? '#fca5a5' : '#b91c1c', marginBottom: '12px' }}>
                    ⚠ {demoError}
                  </div>
                )}

                <form onSubmit={handleDemoOfficerLogin}>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: colors.mutedColor, fontWeight: 700, marginBottom: '4px' }}>
                      Username
                    </label>
                    <input
                      type="text"
                      value={demoUsername}
                      onChange={e => setDemoUsername(e.target.value)}
                      placeholder="admin"
                      style={{
                        width: '100%', padding: '9px 12px', borderRadius: '8px',
                        background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, color: colors.inputText,
                        fontSize: '0.88rem', boxSizing: 'border-box', outline: 'none'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: colors.mutedColor, fontWeight: 700, marginBottom: '4px' }}>
                      Password
                    </label>
                    <input
                      type="password"
                      value={demoPassword}
                      onChange={e => setDemoPassword(e.target.value)}
                      placeholder="demo1234"
                      style={{
                        width: '100%', padding: '9px 12px', borderRadius: '8px',
                        background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, color: colors.inputText,
                        fontSize: '0.88rem', boxSizing: 'border-box', outline: 'none'
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={demoLoading}
                    style={{
                      width: '100%',
                      padding: '11px',
                      background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      cursor: demoLoading ? 'wait' : 'pointer',
                      boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)'
                    }}
                  >
                    {demoLoading ? 'Authenticating...' : 'Sign In as Officer →'}
                  </button>
                </form>

                {/* Demo accounts quick-fill buttons */}
                <div style={{ marginTop: '14px' }}>
                  <span style={{ fontSize: '0.72rem', color: colors.mutedColor, display: 'block', marginBottom: '6px' }}>
                    Quick Select Evaluator Role (Password: demo1234):
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {[
                      { user: 'admin', label: 'Admin' },
                      { user: 'kamrup_official', label: 'Kamrup DM' },
                      { user: 'ekh_official', label: 'EKH Hills' },
                      { user: 'aizawl_officer', label: 'Aizawl Officer' },
                      { user: 'citizen_demo', label: 'Demo Citizen' }
                    ].map(item => (
                      <button
                        key={item.user}
                        type="button"
                        onClick={() => fillDemoAccount(item.user)}
                        style={{
                          background: colors.inputBg,
                          color: isDark ? '#38bdf8' : '#0284c7',
                          border: `1px solid ${colors.inputBorder}`,
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer
        style={{
          textAlign: 'center',
          padding: '16px',
          borderTop: `1px solid ${colors.footerBorder}`,
          fontSize: '0.75rem',
          color: colors.mutedColor,
        }}
      >
        SATARK — National Early Warning Network · SIH 2026 AI Landslide Early Warning System
      </footer>
    </div>
  );
};

export default LoginPage;
