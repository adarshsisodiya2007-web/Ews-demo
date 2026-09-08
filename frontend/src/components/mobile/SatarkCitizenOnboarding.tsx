import React, { useState, useEffect } from 'react';
import {
  getCachedCitizenProfile,
  updateCitizenProfile,
  createCitizenProfile
} from '../../services/citizenAuthService';
import { CitizenProfileInput } from '../../types';

interface SatarkCitizenOnboardingProps {
  onComplete: () => void;
  onBackToLogin: () => void;
}

export interface NortheastLanguageOption {
  code: string;
  name: string;
  nativeName?: string;
  region: string;
  isDefault?: boolean;
}

export const NORTHEAST_LANGUAGES: NortheastLanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', region: 'Primary / Default', isDefault: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', region: 'National' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', region: 'Assam' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', region: 'Tripura / Assam' },
  { code: 'mni', name: 'Meitei (Manipuri)', nativeName: 'মৈতৈলোন্', region: 'Manipur' },
  { code: 'miz', name: 'Mizo', nativeName: 'Mizo ṭawng', region: 'Mizoram' },
  { code: 'kha', name: 'Khasi', nativeName: 'Ka Ktien Khasi', region: 'Meghalaya' },
  { code: 'gar', name: 'Garo', nativeName: 'A·chik', region: 'Meghalaya' }
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const SatarkCitizenOnboarding: React.FC<SatarkCitizenOnboardingProps> = ({
  onComplete,
  onBackToLogin
}) => {
  const [step, setStep] = useState<1 | 2>(1);

  // Theme support
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('satark_mobile_theme') as 'dark' | 'light') ||
           (localStorage.getItem('satark_theme') as 'dark' | 'light') || 'dark';
  });

  const isLight = theme === 'light';

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('satark_mobile_theme', next);
    localStorage.setItem('satark_theme', next);
    document.documentElement.setAttribute('data-theme', next);
    window.dispatchEvent(new CustomEvent('satark-theme-change', { detail: next }));
  };

  // Step 1: Basic Details Form State
  const [fullName, setFullName] = useState<string>(() => {
    const cached = getCachedCitizenProfile();
    if (cached?.fullName && !cached.fullName.startsWith('+91')) {
      return cached.fullName;
    }
    const user = localStorage.getItem('ews_user') || '';
    if (user && !user.startsWith('+91') && user !== 'citizen_demo') {
      return user;
    }
    return '';
  });

  const [emergencyContactName, setEmergencyContactName] = useState<string>(() => {
    const cached = getCachedCitizenProfile();
    return cached?.emergencyContactName || '';
  });

  const [emergencyContactPhone, setEmergencyContactPhone] = useState<string>(() => {
    const cached = getCachedCitizenProfile();
    return cached?.emergencyContactPhone || '';
  });

  const [bloodGroup, setBloodGroup] = useState<string>(() => {
    const cached = getCachedCitizenProfile();
    return cached?.bloodGroup || '';
  });

  const [addressArea, setAddressArea] = useState<string>(() => {
    return localStorage.getItem('satark_citizen_address') || '';
  });

  // Step 2: Language Selection State — Default is English
  const [selectedLang, setSelectedLang] = useState<string>(() => {
    return localStorage.getItem('ews_lang') || 'en';
  });

  // Error & Loading States
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // Phone validation helper
  const validatePhoneIfEntered = (phone: string): { valid: boolean; normalized: string } => {
    const trimmed = phone.trim();
    if (!trimmed) return { valid: true, normalized: '' };
    const cleaned = trimmed.replace(/[\s\-\(\)]/g, '');
    let digits = cleaned;
    if (digits.startsWith('+91')) digits = digits.slice(3);
    else if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2);
    else if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
    else if (digits.startsWith('+')) digits = digits.slice(1);

    if (/^[6-9]\d{9}$/.test(digits)) {
      return { valid: true, normalized: `+91${digits}` };
    }
    return { valid: false, normalized: '' };
  };

  // Action: Save & Continue
  const handleSaveAndContinue = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim()) {
      setErrorMsg('Please enter your Full Name to continue.');
      return;
    }

    if (emergencyContactPhone.trim()) {
      const check = validatePhoneIfEntered(emergencyContactPhone);
      if (!check.valid) {
        setErrorMsg('Please enter a valid 10-digit emergency contact phone number.');
        return;
      }
    }

    setSaving(true);
    try {
      // Save address locally
      if (addressArea.trim()) {
        localStorage.setItem('satark_citizen_address', addressArea.trim());
      }

      const payload: CitizenProfileInput = {
        fullName: fullName.trim(),
        preferredLanguage: selectedLang,
        emergencyContactName: emergencyContactName.trim() || undefined,
        emergencyContactPhone: emergencyContactPhone.trim() ? validatePhoneIfEntered(emergencyContactPhone).normalized : undefined,
        bloodGroup: bloodGroup || undefined,
        accessibilityNeeds: addressArea.trim() ? `Area: ${addressArea.trim()}` : undefined
      };

      try {
        await updateCitizenProfile(payload);
      } catch {
        try {
          await createCitizenProfile(payload);
        } catch {
          // If network is offline, continue gracefully with cached updates
        }
      }

      // Transition to Step 2: Language Selection
      setStep(2);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save profile. Continuing to language selection...');
      setTimeout(() => setStep(2), 500);
    } finally {
      setSaving(false);
    }
  };

  // Action: Skip for Now (Directly to Language Selection)
  const handleSkipBasicDetails = () => {
    setErrorMsg('');
    localStorage.setItem('satark_basic_details_skipped', 'true');
    setStep(2);
  };

  // Action: Finalize Onboarding & Continue to SATARK
  const handleFinalizeOnboarding = async () => {
    setErrorMsg('');
    setSaving(true);

    try {
      // 1. Persist chosen language
      localStorage.setItem('ews_lang', selectedLang);

      // 2. Mark onboarding completed
      const currentUser = localStorage.getItem('ews_user') || localStorage.getItem('satark_citizen_phone') || 'citizen';
      localStorage.setItem('citizenOnboardingCompleted', 'true');
      localStorage.setItem(`citizenOnboardingCompleted_${currentUser}`, 'true');
      const citizenPhone = localStorage.getItem('satark_citizen_phone');
      if (citizenPhone && citizenPhone !== currentUser) {
        localStorage.setItem(`citizenOnboardingCompleted_${citizenPhone}`, 'true');
      }

      // 3. Sync language to backend profile if possible
      try {
        await updateCitizenProfile({
          fullName: fullName.trim() || 'Citizen',
          preferredLanguage: selectedLang
        });
      } catch {
        // Continue even if network is restricted
      }

      // 4. Notify app listeners
      window.dispatchEvent(new CustomEvent('satark-profile-updated', { detail: { preferredLanguage: selectedLang } }));
      window.dispatchEvent(new CustomEvent('satark-language-change', { detail: selectedLang }));

      // 5. Enter Citizen Portal
      onComplete();
    } catch {
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  // Dynamic Theme Colors
  const colors = {
    bgPage: isLight
      ? 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)'
      : 'radial-gradient(circle at 50% 15%, #0f1c3f 0%, #070d1e 50%, #03060c 100%)',
    bgCard: isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.95)',
    borderCard: isLight ? '1px solid #cbd5e1' : '1px solid rgba(51, 65, 85, 0.7)',
    shadowCard: isLight ? '0 16px 36px rgba(0, 0, 0, 0.08)' : '0 20px 40px rgba(0,0,0,0.55)',
    textPrimary: isLight ? '#0f172a' : '#f8fafc',
    textSecondary: isLight ? '#475569' : '#94a3b8',
    textMuted: isLight ? '#64748b' : '#64748b',
    bgInput: isLight ? '#f8fafc' : '#070c17',
    borderInput: isLight ? '#cbd5e1' : '#334155',
    textInput: isLight ? '#0f172a' : '#ffffff',
    activeCardBorder: '#38bdf8',
    activeCardBg: isLight ? '#eff6ff' : 'rgba(14, 165, 233, 0.12)'
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.bgPage,
        color: colors.textPrimary,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px 16px 32px 16px',
        boxSizing: 'border-box'
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}
      >
        {/* Back navigation button */}
        <button
          type="button"
          onClick={() => {
            if (step === 2) {
              setStep(1);
            } else {
              onBackToLogin();
            }
          }}
          style={{
            background: isLight ? '#e2e8f0' : '#1e293b',
            border: `1px solid ${colors.borderInput}`,
            borderRadius: '8px',
            padding: '6px 12px',
            color: colors.textPrimary,
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          ← {step === 2 ? 'Basic Details' : 'Back to Login'}
        </button>

        {/* Global Light / Dark Theme Switch */}
        <button
          type="button"
          onClick={toggleTheme}
          style={{
            background: isLight ? '#e2e8f0' : '#1e293b',
            border: `1px solid ${colors.borderInput}`,
            borderRadius: '20px',
            padding: '6px 14px',
            color: colors.textPrimary,
            fontSize: '0.78rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}
        >
          {isLight ? '☀ Light' : '🌙 Dark'}
        </button>
      </div>

      {/* Main Container Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: colors.bgCard,
          border: colors.borderCard,
          borderRadius: '20px',
          boxShadow: colors.shadowCard,
          padding: '24px 20px',
          boxSizing: 'border-box'
        }}
      >
        {/* SATARK Official Emblem & Step Indicator */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              margin: '0 auto 10px auto',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              boxShadow: '0 8px 16px rgba(2, 132, 199, 0.35)'
            }}
          >
            🛡️
          </div>

          <div
            style={{
              display: 'inline-block',
              background: isLight ? '#e0f2fe' : 'rgba(56, 189, 248, 0.15)',
              color: isLight ? '#0369a1' : '#38bdf8',
              borderRadius: '12px',
              padding: '4px 12px',
              fontSize: '0.72rem',
              fontWeight: 900,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '8px'
            }}
          >
            STEP {step} OF 2 • {step === 1 ? 'BASIC DETAILS' : 'LANGUAGE SELECTION'}
          </div>

          <h1
            style={{
              margin: '0 0 6px 0',
              fontSize: '1.35rem',
              fontWeight: 900,
              color: colors.textPrimary,
              letterSpacing: '-0.02em'
            }}
          >
            {step === 1 ? 'Complete Your Basic Details' : 'Choose Your Language'}
          </h1>

          <p
            style={{
              margin: 0,
              fontSize: '0.82rem',
              color: colors.textSecondary,
              lineHeight: 1.45
            }}
          >
            {step === 1
              ? 'Add a few details to help SATARK provide a better emergency response experience.'
              : 'Select your preferred language for the SATARK experience.'}
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMsg && (
          <div
            style={{
              background: isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              borderRadius: '10px',
              padding: '10px 12px',
              color: isLight ? '#991b1b' : '#fca5a5',
              fontSize: '0.8rem',
              fontWeight: 600,
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ── STEP 1: BASIC DETAILS FORM ────────────────────────────────────────── */}
        {step === 1 && (
          <form onSubmit={handleSaveAndContinue} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Field A: Full Name (Required) */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: colors.textSecondary,
                  marginBottom: '6px'
                }}
              >
                FULL NAME <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                style={{
                  width: '100%',
                  background: colors.bgInput,
                  color: colors.textInput,
                  border: `1px solid ${colors.borderInput}`,
                  borderRadius: '10px',
                  padding: '12px 14px',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>

            {/* Field B: Emergency Contact Name (Optional) */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: colors.textSecondary,
                  marginBottom: '6px'
                }}
              >
                EMERGENCY CONTACT NAME <span style={{ color: colors.textMuted, fontWeight: 500 }}>(Optional)</span>
              </label>
              <input
                type="text"
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
                placeholder="e.g. Priya Sharma (Spouse / Parent)"
                style={{
                  width: '100%',
                  background: colors.bgInput,
                  color: colors.textInput,
                  border: `1px solid ${colors.borderInput}`,
                  borderRadius: '10px',
                  padding: '12px 14px',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>

            {/* Field C: Emergency Contact Phone (Optional) */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: colors.textSecondary,
                  marginBottom: '6px'
                }}
              >
                EMERGENCY CONTACT PHONE <span style={{ color: colors.textMuted, fontWeight: 500 }}>(Optional)</span>
              </label>
              <input
                type="tel"
                value={emergencyContactPhone}
                onChange={(e) => setEmergencyContactPhone(e.target.value)}
                placeholder="10-digit number e.g. 9876543210"
                style={{
                  width: '100%',
                  background: colors.bgInput,
                  color: colors.textInput,
                  border: `1px solid ${colors.borderInput}`,
                  borderRadius: '10px',
                  padding: '12px 14px',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>

            {/* Field D: Blood Group (Optional Dropdown) */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: colors.textSecondary,
                  marginBottom: '6px'
                }}
              >
                BLOOD GROUP <span style={{ color: colors.textMuted, fontWeight: 500 }}>(Optional)</span>
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                style={{
                  width: '100%',
                  background: colors.bgInput,
                  color: colors.textInput,
                  border: `1px solid ${colors.borderInput}`,
                  borderRadius: '10px',
                  padding: '12px 14px',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">-- Select Blood Group --</option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>

            {/* Field E: Address / Area (Optional) */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: colors.textSecondary,
                  marginBottom: '6px'
                }}
              >
                ADDRESS / AREA <span style={{ color: colors.textMuted, fontWeight: 500 }}>(Optional)</span>
              </label>
              <input
                type="text"
                value={addressArea}
                onChange={(e) => setAddressArea(e.target.value)}
                placeholder="e.g. Guwahati Ward 12, Kamrup Metro"
                style={{
                  width: '100%',
                  background: colors.bgInput,
                  color: colors.textInput,
                  border: `1px solid ${colors.borderInput}`,
                  borderRadius: '10px',
                  padding: '12px 14px',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>

            {/* Buttons: Primary Save & Continue + Secondary Skip for Now */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '0.95rem',
                  fontWeight: 900,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {saving ? 'Saving Details...' : 'Save & Continue →'}
              </button>

              <button
                type="button"
                onClick={handleSkipBasicDetails}
                disabled={saving}
                style={{
                  width: '100%',
                  background: 'transparent',
                  color: colors.textSecondary,
                  border: `1px solid ${colors.borderInput}`,
                  borderRadius: '12px',
                  padding: '12px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                Skip for Now
              </button>
            </div>
          </form>
        )}

        {/* ── STEP 2: NORTHEAST INDIA LANGUAGE SELECTION ────────────────────────── */}
        {step === 2 && (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: '10px',
                marginBottom: '20px',
                maxHeight: '380px',
                overflowY: 'auto',
                paddingRight: '4px'
              }}
            >
              {NORTHEAST_LANGUAGES.map((langOpt) => {
                const isSelected = selectedLang === langOpt.code;
                return (
                  <div
                    key={langOpt.code}
                    onClick={() => setSelectedLang(langOpt.code)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: isSelected
                        ? '2px solid #0284c7'
                        : `1px solid ${colors.borderInput}`,
                      background: isSelected
                        ? colors.activeCardBg
                        : isLight ? '#f8fafc' : '#070c17',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '0.95rem',
                            fontWeight: 800,
                            color: isSelected ? (isLight ? '#0284c7' : '#38bdf8') : colors.textPrimary
                          }}
                        >
                          {langOpt.name}
                        </span>
                        {langOpt.nativeName && langOpt.nativeName !== langOpt.name && (
                          <span
                            style={{
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              color: colors.textSecondary
                            }}
                          >
                            ({langOpt.nativeName})
                          </span>
                        )}
                      </div>

                      <span
                        style={{
                          fontSize: '0.72rem',
                          color: colors.textMuted,
                          fontWeight: 500
                        }}
                      >
                        {langOpt.region}
                      </span>
                    </div>

                    <div>
                      {isSelected ? (
                        <div
                          style={{
                            background: '#0284c7',
                            color: '#ffffff',
                            borderRadius: '20px',
                            padding: '4px 10px',
                            fontSize: '0.74rem',
                            fontWeight: 900,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          ✓ Selected
                        </div>
                      ) : (
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            border: `2px solid ${colors.borderInput}`
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Button: Continue to SATARK */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={handleFinalizeOnboarding}
                disabled={saving}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '0.95rem',
                  fontWeight: 900,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(22, 163, 74, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {saving ? 'Entering SATARK...' : 'Continue to SATARK →'}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={saving}
                style={{
                  width: '100%',
                  background: 'transparent',
                  color: colors.textSecondary,
                  border: 'none',
                  padding: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                ← Back to Basic Details
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div
        style={{
          marginTop: '16px',
          textAlign: 'center',
          fontSize: '0.72rem',
          color: colors.textMuted
        }}
      >
        SATARK Disaster Early Warning • Government of India & NER
      </div>
    </div>
  );
};
