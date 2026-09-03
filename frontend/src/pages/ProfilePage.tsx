import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCitizenProfile,
  updateCitizenProfile,
  logoutCitizen,
  isCitizenAuthenticated,
  getStoredCitizenPhone
} from '../services/citizenAuthService';
import { CitizenProfile, CitizenProfileInput } from '../types';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CitizenProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [editing, setEditing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const [form, setForm] = useState<CitizenProfileInput>({
    fullName: '',
    gender: '',
    ageGroup: '',
    preferredLanguage: 'en',
    bloodGroup: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    accessibilityNeeds: ''
  });

  const storedPhone = getStoredCitizenPhone() || '+91 XXXXX XXXXX';

  useEffect(() => {
    if (!isCitizenAuthenticated()) {
      navigate('/login');
      return;
    }
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await getCitizenProfile();
      if (data) {
        setProfile(data);
        setForm({
          fullName: data.fullName || '',
          gender: data.gender || '',
          ageGroup: data.ageGroup || '',
          preferredLanguage: data.preferredLanguage || 'en',
          bloodGroup: data.bloodGroup || '',
          emergencyContactName: data.emergencyContactName || '',
          emergencyContactPhone: data.emergencyContactPhone || '',
          accessibilityNeeds: data.accessibilityNeeds || ''
        });
      } else {
        // First-time or not yet created profile
        setEditing(true);
      }
    } catch {
      setError('Unable to load profile from server. Displaying offline cached profile if available.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await updateCitizenProfile(form);
      setProfile(updated);
      setEditing(false);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 4000);
    } catch {
      setError('Failed to update profile. Please check network connection.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logoutCitizen();
    navigate('/login');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: "linear-gradient(180deg, rgba(7, 11, 20, 0.85) 0%, rgba(10, 16, 32, 0.94) 100%), url('/landslide_bg.jpg') center/cover fixed no-repeat",
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Top Header ── */}
      <header
        style={{
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
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
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#ffffff',
              padding: '2px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 900, fontSize: '1.2rem', letterSpacing: '0.04em', color: '#f8fafc' }}>
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
                }}
              >
                Citizen Profile
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
              National Early Warning Network · Emergency Rescue Identity
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => navigate('/citizen')}
            style={{
              background: '#1e293b',
              color: '#38bdf8',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ← Citizen Portal
          </button>
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(239, 68, 68, 0.2)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main style={{ flex: 1, maxWidth: '780px', width: '100%', margin: '0 auto', padding: '32px 16px' }}>
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: '10px', padding: '12px 16px', color: '#fca5a5', marginBottom: '20px', fontSize: '0.86rem' }}>
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div style={{ background: 'rgba(34, 197, 94, 0.2)', border: '1px solid #22c55e', borderRadius: '10px', padding: '12px 16px', color: '#86efac', marginBottom: '20px', fontSize: '0.86rem' }}>
            ✅ {success}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🔄</div>
            <div>Loading your citizen profile...</div>
          </div>
        ) : editing ? (
          /* ── EDIT FORM ── */
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(16px)',
              borderRadius: '16px',
              border: '1px solid rgba(51, 65, 85, 0.5)',
              padding: '28px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                {profile ? '✏️ Edit Citizen Profile' : '👤 Complete Your Profile'}
              </h2>
              {profile && (
                <button
                  onClick={() => setEditing(false)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
              )}
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                  Full Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Enter your full legal name"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                  Verified Phone Number
                </label>
                <input
                  type="text"
                  disabled
                  value={profile?.phone || storedPhone}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '8px', background: '#0f172a', border: '1px solid #1e293b', color: '#94a3b8', fontSize: '0.9rem', cursor: 'not-allowed' }}
                />
                <span style={{ fontSize: '0.72rem', color: '#38bdf8', marginTop: '4px', display: 'block' }}>
                  ✓ Phone number is cryptographically verified via OTP. To change your number, sign in with the new number.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                    Preferred Language <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={form.preferredLanguage}
                    onChange={(e) => setForm({ ...form, preferredLanguage: e.target.value })}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.9rem' }}
                  >
                    <option value="en">English</option>
                    <option value="hi">हिंदी (Hindi)</option>
                    <option value="as">অসমীয়া (Assamese)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                    Age Group <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>(optional)</span>
                  </label>
                  <select
                    value={form.ageGroup}
                    onChange={(e) => setForm({ ...form, ageGroup: e.target.value })}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.9rem' }}
                  >
                    <option value="">Not specified</option>
                    <option value="Under 18">Under 18</option>
                    <option value="18-25">18–25</option>
                    <option value="26-40">26–40</option>
                    <option value="41-60">41–60</option>
                    <option value="60+">60+</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                    Blood Group <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>(optional)</span>
                  </label>
                  <select
                    value={form.bloodGroup}
                    onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.9rem' }}
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

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                    Gender <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>(optional)</span>
                  </label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.9rem' }}
                  >
                    <option value="">Prefer not to say</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary / Other">Non-binary / Other</option>
                  </select>
                </div>
              </div>

              {/* Emergency Contact */}
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(51, 65, 85, 0.5)', borderRadius: '10px', padding: '14px', marginTop: '6px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f87171', marginBottom: '10px' }}>
                  🚨 Emergency Contact Information (Optional)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={form.emergencyContactName}
                      onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })}
                      placeholder="e.g. Spouse, Parent, Relative"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={form.emergencyContactPhone}
                      onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })}
                      placeholder="+91 98765 43210"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* Accessibility */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                  Accessibility or Medical Needs <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>(optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={form.accessibilityNeeds}
                  onChange={(e) => setForm({ ...form, accessibilityNeeds: e.target.value })}
                  placeholder="e.g. Wheelchair user, elderly assistance, hearing impaired, asthmatic"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.85rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #2563eb, #0284c7)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Saving Profile...' : '💾 Save Profile'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* ── VIEW PROFILE CARD ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(16px)',
                borderRadius: '16px',
                border: '1px solid rgba(51, 65, 85, 0.5)',
                padding: '28px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #2563eb, #0284c7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '26px',
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
                    }}
                  >
                    👤
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#f8fafc' }}>
                      {profile?.fullName || 'Citizen'}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                        {profile?.phone || storedPhone}
                      </span>
                      <span
                        style={{
                          background: 'rgba(34, 197, 94, 0.2)',
                          color: '#4ade80',
                          border: '1px solid rgba(34, 197, 94, 0.4)',
                          borderRadius: '12px',
                          padding: '1px 8px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                        }}
                      >
                        ✓ Verified Citizen
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setEditing(true)}
                  style={{
                    background: '#1e293b',
                    color: '#38bdf8',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ✏️ Edit Profile
                </button>
              </div>

              <hr style={{ borderColor: 'rgba(51, 65, 85, 0.4)', margin: '16px 0' }} />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '12px 16px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Preferred Language
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginTop: '4px' }}>
                    {profile?.preferredLanguage === 'hi' ? 'हिंदी (Hindi)' : profile?.preferredLanguage === 'as' ? 'অসমীয়া (Assamese)' : 'English'}
                  </div>
                </div>

                <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '12px 16px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Blood Group
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: profile?.bloodGroup ? '#f87171' : '#94a3b8', marginTop: '4px' }}>
                    {profile?.bloodGroup || 'Not specified'}
                  </div>
                </div>

                <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '12px 16px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Age Group
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginTop: '4px' }}>
                    {profile?.ageGroup || 'Not specified'}
                  </div>
                </div>

                <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '12px 16px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Gender
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginTop: '4px' }}>
                    {profile?.gender || 'Not specified'}
                  </div>
                </div>
              </div>

              {profile?.accessibilityNeeds && (
                <div style={{ marginTop: '16px', background: 'rgba(30, 41, 59, 0.5)', padding: '12px 16px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Accessibility &amp; Special Needs
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#cbd5e1', marginTop: '4px' }}>
                    {profile.accessibilityNeeds}
                  </div>
                </div>
              )}
            </div>

            {/* Emergency Contact Card */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(16px)',
                borderRadius: '16px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '24px',
              }}
            >
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1.05rem', fontWeight: 800, color: '#f87171' }}>
                🚨 Designated Emergency Contact
              </h3>
              {profile?.emergencyContactName ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Contact Name:</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                      {profile.emergencyContactName}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Contact Phone:</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                      {profile.emergencyContactPhone || 'Not specified'}
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                  No emergency contact added yet. Add a family member or relative who can be alerted if you are in danger.
                </p>
              )}
            </div>

            {/* Quick Links & Sign Out */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => navigate('/privacy')}
                style={{
                  background: 'transparent',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '8px',
                  padding: '9px 18px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                🛡️ Privacy &amp; Data Safeguards
              </button>

              <button
                onClick={handleLogout}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: '8px',
                  padding: '9px 18px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                🚪 Sign Out
              </button>
            </div>
          </div>
        )}
      </main>

      <footer
        style={{
          textAlign: 'center',
          padding: '18px',
          borderTop: '1px solid rgba(51, 65, 85, 0.4)',
          fontSize: '0.75rem',
          color: '#64748b',
        }}
      >
        SATARK — National Early Warning Network · Citizen Profile Management
      </footer>
    </div>
  );
};