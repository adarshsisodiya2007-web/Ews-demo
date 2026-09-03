import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';
import {
  sendCitizenOtp,
  verifyCitizenOtp,
  createCitizenProfile
} from '../services/citizenAuthService';
import { CitizenProfileInput } from '../types';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  // Mode: 'citizen' or 'officer'
  const [authMode, setAuthMode] = useState<'citizen' | 'officer'>('citizen');

  // Citizen OTP flow steps: 1 = Phone, 2 = OTP, 3 = Create Profile
  const [citizenStep, setCitizenStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [demoNotice, setDemoNotice] = useState<string>('');
  const [cooldown, setCooldown] = useState<number>(0);
  const [otpLoading, setOtpLoading] = useState<boolean>(false);
  const [otpError, setOtpError] = useState<string>('');

  // Profile creation form for new citizens
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

  // Officer login state
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [officerError, setOfficerError] = useState<string>('');
  const [officerLoading, setOfficerLoading] = useState<boolean>(false);

  // Language & branding
  const [lang, setLang] = useState<'en' | 'hi' | 'as'>('en');

  // Cooldown countdown
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // ── CITIZEN OTP HANDLERS ───────────────────────────────────────────────────

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!phone.trim()) {
      setOtpError('Please enter a valid phone number.');
      return;
    }
    setOtpLoading(true);
    setOtpError('');
    try {
      const res = await sendCitizenOtp(phone);
      if (res.demoMode && res.demoOtp) {
        setDemoNotice(`Demo OTP mode active: Enter ${res.demoOtp}`);
      } else {
        setDemoNotice('');
      }
      setCooldown(res.cooldownSeconds || 60);
      setCitizenStep(2);
    } catch (err: any) {
      setOtpError(err.response?.data?.message || err.message || 'Failed to send OTP. Please check your network.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      setOtpError('Please enter the 6-digit OTP code.');
      return;
    }
    setOtpLoading(true);
    setOtpError('');
    try {
      const res = await verifyCitizenOtp(phone, otp);
      if (res.profileExists && res.profile) {
        // Existing user with completed profile -> enter Citizen Portal
        navigate('/citizen');
      } else {
        // First-time citizen -> prompt profile creation
        setCitizenStep(3);
      }
    } catch (err: any) {
      setOtpError(err.response?.data?.message || err.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.fullName.trim()) {
      setOtpError('Please enter your full name.');
      return;
    }
    setProfileLoading(true);
    setOtpError('');
    try {
      await createCitizenProfile({
        ...profileForm,
        preferredLanguage: profileForm.preferredLanguage || lang
      });
      navigate('/citizen');
    } catch (err: any) {
      setOtpError(err.response?.data?.message || 'Failed to save profile. Continuing to portal...');
      setTimeout(() => navigate('/citizen'), 1200);
    } finally {
      setProfileLoading(false);
    }
  };

  // ── OFFICER LOGIN HANDLER ──────────────────────────────────────────────────

  const handleOfficerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setOfficerError('Please enter username and password');
      return;
    }
    setOfficerLoading(true);
    setOfficerError('');
    try {
      const data = await login(username, password);
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
      setOfficerError('Invalid credentials. Try: admin / demo1234');
    } finally {
      setOfficerLoading(false);
    }
  };

  const fillDemo = (user: string) => {
    setUsername(user);
    setPassword('demo1234');
  };

  const t = {
    en: {
      heroTitle: 'Northeast & Western Ghats Disaster Intelligence',
      heroSubtitle: 'Real-time safety alerts, NASA 30m terrain analytics, AI-powered risk prediction, and safe evacuation for India.',
      liveBadge: '🟢 LIVE MONITORING & TELEMETRY SYNC',
      citizenTab: '📱 Citizen Sign In (Phone OTP)',
      officerTab: '🛡️ Officer / Admin Login',
      guestBtn: 'Continue without Sign In →',
    },
    hi: {
      heroTitle: 'पूर्वोत्तर एवं पश्चिमी घाट आपदा पूर्व सूचना प्रणाली',
      heroSubtitle: 'रीयल-टाइम सुरक्षा चेतावनी, नासा 30m भू-भाग विश्लेषण, एआई-संचालित जोखिम भविष्यवाणी एवं सुरक्षित निकासी।',
      liveBadge: '🟢 लाइव निगरानी एवं उपग्रह टेलीमेट्री',
      citizenTab: '📱 नागरिक लॉगिन (फोन OTP)',
      officerTab: '🛡️ अधिकारी / एडमिन लॉगिन',
      guestBtn: 'बिना लॉगिन जारी रखें →',
    },
    as: {
      heroTitle: 'উত্তৰ-পূব দুৰ্যোগ চোৰাংচোৱা প্লেটফৰ্ম',
      heroSubtitle: 'প্ৰকৃত সময়ৰ সুৰক্ষা সতৰ্কবাৰ্তা, নাছা ৩০মি উচ্চতা বিশ্লেষণ আৰু এআই ভূমিস্খলন পূৰ্বানুমান।',
      liveBadge: '🟢 লাইভ নিৰীক্ষণ সক্ৰিয়',
      citizenTab: '📱 নাগৰিক প্ৰৱেশ (ফোন OTP)',
      officerTab: '🛡️ বিষয়া / এডমিন প্ৰৱেশ',
      guestBtn: 'লগইন নকৰাকৈ আগবাঢ়ক →',
    }
  }[lang];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: "linear-gradient(180deg, rgba(7, 11, 20, 0.82) 0%, rgba(10, 16, 32, 0.92) 100%), url('/landslide_bg.jpg') center/cover fixed no-repeat",
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Top Header with SATARK Branding ── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/satark_logo.png"
            alt="SATARK Logo"
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              objectFit: 'contain',
              background: '#ffffff',
              padding: '2px',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.4)',
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 900, fontSize: '1.25rem', letterSpacing: '0.04em', color: '#f8fafc' }}>
                SATARK
              </span>
              <span
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
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
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
              National Early Warning Network
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Language selector */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', padding: '2px' }}>
            {(['en', 'hi', 'as'] as const).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  border: 'none',
                  background: lang === l ? '#2563eb' : 'transparent',
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={() => navigate('/sih-dashboard')}
            style={{
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid #38bdf8',
              color: '#38bdf8',
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
              background: 'rgba(234, 88, 12, 0.2)',
              border: '1px solid #ea580c',
              color: '#fb923c',
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

      {/* ── Main Entrance ── */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 16px',
        }}
      >
        {/* Hero */}
        <div style={{ textAlign: 'center', maxWidth: '620px', marginBottom: '24px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid #22c55e',
              color: '#4ade80',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              marginBottom: '12px',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            {t.liveBadge}
          </div>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 10px 0' }}>
            {t.heroTitle}
          </h1>
          <p style={{ fontSize: '0.92rem', color: '#94a3b8', lineHeight: '1.6', margin: 0 }}>
            {t.heroSubtitle}
          </p>
        </div>

        {/* ── Tabs Selector ── */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(51, 65, 85, 0.6)',
            borderRadius: '12px',
            padding: '4px',
            marginBottom: '20px',
            maxWidth: '520px',
            width: '100%',
          }}
        >
          <button
            onClick={() => setAuthMode('citizen')}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '8px',
              border: 'none',
              background: authMode === 'citizen' ? 'linear-gradient(135deg, #2563eb, #0284c7)' : 'transparent',
              color: authMode === 'citizen' ? '#ffffff' : '#94a3b8',
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {t.citizenTab}
          </button>
          <button
            onClick={() => setAuthMode('officer')}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '8px',
              border: 'none',
              background: authMode === 'officer' ? 'linear-gradient(135deg, #4f46e5, #4338ca)' : 'transparent',
              color: authMode === 'officer' ? '#ffffff' : '#94a3b8',
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {t.officerTab}
          </button>
        </div>

        {/* ── Dynamic Form Card ── */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.88)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '20px',
            padding: '30px',
            backdropFilter: 'blur(16px)',
            maxWidth: '520px',
            width: '100%',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          }}
        >
          {authMode === 'citizen' ? (
            /* ══════════════════════════════════════════════════════════════════
               CITIZEN PHONE OTP FLOW
               ══════════════════════════════════════════════════════════════════ */
            <div>
              {citizenStep === 1 && (
                /* Step 1: Phone Number Entry */
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '1.8rem' }}>📱</span>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                        Sign in to SATARK
                      </h2>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                        Enter your mobile number to receive a secure login code.
                      </div>
                    </div>
                  </div>

                  {otpError && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: '8px', padding: '10px', fontSize: '0.82rem', color: '#fca5a5', marginBottom: '14px' }}>
                      ⚠️ {otpError}
                    </div>
                  )}

                  <form onSubmit={handleSendOtp}>
                    <div style={{ marginBottom: '18px' }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                        Mobile Phone Number
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', fontSize: '0.9rem', color: '#94a3b8', fontWeight: 700 }}>
                          🇮🇳 +91
                        </div>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="98765 43210"
                          style={{
                            flex: 1,
                            padding: '10px 14px',
                            borderRadius: '8px',
                            background: '#1e293b',
                            border: '1px solid #334155',
                            color: '#f8fafc',
                            fontSize: '0.95rem',
                            outline: 'none',
                          }}
                        />
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '6px' }}>
                        Your phone number connects emergency incident reports to your profile during rescues.
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={otpLoading}
                      style={{
                        width: '100%',
                        padding: '13px',
                        background: 'linear-gradient(135deg, #2563eb, #0284c7)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '0.95rem',
                        fontWeight: 800,
                        cursor: otpLoading ? 'wait' : 'pointer',
                        boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                      }}
                    >
                      {otpLoading ? 'Sending OTP Code...' : 'Send Verification OTP →'}
                    </button>
                  </form>

                  <div style={{ textAlign: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(51, 65, 85, 0.5)' }}>
                    <button
                      type="button"
                      onClick={() => navigate('/citizen')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#38bdf8',
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {t.guestBtn}
                    </button>
                  </div>
                </div>
              )}

              {citizenStep === 2 && (
                /* Step 2: Enter OTP Code */
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <span style={{ fontSize: '1.8rem' }}>🔢</span>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                        Verify Your Phone
                      </h2>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                        Enter the 6-digit code sent to <strong>{phone}</strong>
                      </div>
                    </div>
                  </div>

                  {demoNotice && (
                    <div
                      style={{
                        background: 'rgba(34, 197, 94, 0.15)',
                        border: '1px solid #22c55e',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        fontSize: '0.82rem',
                        color: '#86efac',
                        marginBottom: '14px',
                        fontWeight: 600,
                      }}
                    >
                      💡 {demoNotice}
                    </div>
                  )}

                  {otpError && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: '8px', padding: '10px', fontSize: '0.82rem', color: '#fca5a5', marginBottom: '14px' }}>
                      ⚠️ {otpError}
                    </div>
                  )}

                  <form onSubmit={handleVerifyOtp}>
                    <div style={{ marginBottom: '18px' }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                        6-Digit Security OTP
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          background: '#1e293b',
                          border: '1px solid #334155',
                          color: '#f8fafc',
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
                      disabled={otpLoading}
                      style={{
                        width: '100%',
                        padding: '13px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '0.95rem',
                        fontWeight: 800,
                        cursor: otpLoading ? 'wait' : 'pointer',
                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                      }}
                    >
                      {otpLoading ? 'Verifying OTP...' : 'Verify OTP & Continue →'}
                    </button>
                  </form>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '0.8rem' }}>
                    <button
                      type="button"
                      onClick={() => { setCitizenStep(1); setOtp(''); setOtpError(''); }}
                      style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                    >
                      ← Change Phone
                    </button>

                    {cooldown > 0 ? (
                      <span style={{ color: '#64748b' }}>Resend in {cooldown}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendOtp()}
                        style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                      >
                        Resend Code
                      </button>
                    )}
                  </div>
                </div>
              )}

              {citizenStep === 3 && (
                /* Step 3: First-time Citizen Profile Creation */
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <span style={{ fontSize: '1.8rem' }}>👤</span>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                        Create Your Citizen Profile
                      </h2>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                        Provide essential details for disaster responder identification.
                      </div>
                    </div>
                  </div>

                  {otpError && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: '8px', padding: '10px', fontSize: '0.82rem', color: '#fca5a5', marginBottom: '14px' }}>
                      ⚠️ {otpError}
                    </div>
                  )}

                  <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                        Full Name <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={profileForm.fullName}
                        onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                        placeholder="e.g. Adarsh Singh"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.88rem' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                          Language
                        </label>
                        <select
                          value={profileForm.preferredLanguage}
                          onChange={(e) => setProfileForm({ ...profileForm, preferredLanguage: e.target.value })}
                          style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.88rem' }}
                        >
                          <option value="en">English</option>
                          <option value="hi">हिंदी (Hindi)</option>
                          <option value="as">অসমীয়া (Assamese)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                          Blood Group <span style={{ color: '#64748b', fontSize: '0.7rem' }}>(opt)</span>
                        </label>
                        <select
                          value={profileForm.bloodGroup}
                          onChange={(e) => setProfileForm({ ...profileForm, bloodGroup: e.target.value })}
                          style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.88rem' }}
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

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                        Emergency Contact (Optional)
                      </label>
                      <input
                        type="text"
                        value={profileForm.emergencyContactName}
                        onChange={(e) => setProfileForm({ ...profileForm, emergencyContactName: e.target.value })}
                        placeholder="Contact Name (e.g. Mother, Spouse)"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.85rem', marginBottom: '6px' }}
                      />
                      <input
                        type="tel"
                        value={profileForm.emergencyContactPhone}
                        onChange={(e) => setProfileForm({ ...profileForm, emergencyContactPhone: e.target.value })}
                        placeholder="Emergency Phone (+91 XXXXX XXXXX)"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.85rem' }}
                      />
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
            /* ══════════════════════════════════════════════════════════════════
               OFFICER / ADMIN USERNAME & PASSWORD LOGIN
               ══════════════════════════════════════════════════════════════════ */
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <span style={{ fontSize: '1.8rem' }}>🔒</span>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                    Officer &amp; Admin Sign In
                  </h2>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                    Authorized disaster management &amp; field responders only.
                  </div>
                </div>
              </div>

              {officerError && (
                <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: '8px', padding: '8px 12px', fontSize: '0.8rem', color: '#fca5a5', marginBottom: '12px' }}>
                  ⚠ {officerError}
                </div>
              )}

              <form onSubmit={handleOfficerLogin}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, marginBottom: '4px' }}>
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="admin"
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px',
                      background: '#1e293b', border: '1px solid #334155', color: '#f8fafc',
                      fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, marginBottom: '4px' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="demo1234"
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px',
                      background: '#1e293b', border: '1px solid #334155', color: '#f8fafc',
                      fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={officerLoading}
                  style={{
                    width: '100%',
                    padding: '13px',
                    background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    cursor: officerLoading ? 'wait' : 'pointer',
                    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)'
                  }}
                >
                  {officerLoading ? 'Authenticating...' : 'Log In as Officer →'}
                </button>
              </form>

              {/* Demo Credential Quick-Fill */}
              <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(51, 65, 85, 0.5)' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '8px' }}>
                  Demo Accounts (Password: demo1234):
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {['admin', 'kamrup_official', 'aizawl_officer', 'ekh_official', 'citizen_demo'].map(u => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => fillDemo(u)}
                      style={{
                        background: '#1e293b', color: '#38bdf8', border: '1px solid #334155',
                        borderRadius: '6px', padding: '3px 8px', fontSize: '0.72rem', cursor: 'pointer'
                      }}
                    >
                      {u}
                    </button>
                  ))}
                </div>

                {/* Direct 1-Tap Responder Portal Shortcut */}
                <div style={{ marginTop: '14px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem('ews_token', 'demo-responder-jwt-direct');
                      localStorage.setItem('ews_role', 'FIELD_OFFICER');
                      localStorage.setItem('ews_user', 'field_responder');
                      navigate('/responder');
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'rgba(234, 88, 12, 0.15)',
                      border: '1px solid #ea580c',
                      borderRadius: '8px',
                      color: '#fb923c',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 8px rgba(234, 88, 12, 0.2)'
                    }}
                  >
                    <span>🛡️</span>
                    <span>Enter Field Responder Portal Directly →</span>
                  </button>
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
          borderTop: '1px solid rgba(51, 65, 85, 0.4)',
          fontSize: '0.75rem',
          color: '#64748b',
        }}
      >
        SATARK — National Early Warning Network · SIH 2026 AI Landslide Early Warning System
      </footer>
    </div>
  );
};

export default LoginPage;
