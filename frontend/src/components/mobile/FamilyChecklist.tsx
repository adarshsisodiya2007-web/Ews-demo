import React, { useState, useEffect } from 'react';
import { t } from '../../i18n';

interface FamilyChecklistProps {
  onClose: () => void;
  lang?: string;
  theme?: 'light' | 'dark';
}

const LANDSLIDE_STORAGE_KEY = 'familyChecklist_landslide';
const FLOOD_STORAGE_KEY = 'familyChecklist_flood';

const LANDSLIDE_ITEMS = [
  'checklist.ls.1',
  'checklist.ls.2',
  'checklist.ls.3',
  'checklist.ls.4',
  'checklist.ls.5',
  'checklist.ls.6',
  'checklist.ls.7',
  'checklist.ls.8',
  'checklist.ls.9',
  'checklist.ls.10'
];

const FLOOD_ITEMS = [
  'checklist.fl.1',
  'checklist.fl.2',
  'checklist.fl.3',
  'checklist.fl.4',
  'checklist.fl.5',
  'checklist.fl.6',
  'checklist.fl.7',
  'checklist.fl.8',
  'checklist.fl.9',
  'checklist.fl.10'
];

function loadSavedChecks(key: string): boolean[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 10) {
        return parsed.map(Boolean);
      }
    }
  } catch {}
  return Array(10).fill(false);
}

export const FamilyChecklist: React.FC<FamilyChecklistProps> = ({
  onClose,
  lang: propLang = 'en',
  theme: propTheme = 'dark'
}) => {
  // Theme management
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('satark_mobile_theme') as 'light' | 'dark') ||
           (localStorage.getItem('satark_theme') as 'light' | 'dark') ||
           propTheme;
  });

  useEffect(() => {
    const onThemeChange = (e: any) => {
      const next = e.detail || localStorage.getItem('satark_mobile_theme') || localStorage.getItem('satark_theme');
      if (next === 'light' || next === 'dark') setCurrentTheme(next);
    };
    window.addEventListener('satark-theme-change', onThemeChange);
    return () => window.removeEventListener('satark-theme-change', onThemeChange);
  }, []);

  // Language management
  const [currentLang, setCurrentLang] = useState<string>(() => {
    return localStorage.getItem('ews_lang') || propLang;
  });

  useEffect(() => {
    const onLangChange = (e: any) => {
      const next = e.detail || localStorage.getItem('ews_lang') || 'en';
      setCurrentLang(next);
    };
    window.addEventListener('satark-language-change', onLangChange);
    return () => window.removeEventListener('satark-language-change', onLangChange);
  }, []);

  // Navigation & Checklist Selection
  const [selectedCategory, setSelectedCategory] = useState<'landslide' | 'flood' | null>(null);
  const [showSafetyPopup, setShowSafetyPopup] = useState<boolean>(false);

  // Checkbox states (persisted separately)
  const [landslideChecks, setLandslideChecks] = useState<boolean[]>(() => loadSavedChecks(LANDSLIDE_STORAGE_KEY));
  const [floodChecks, setFloodChecks] = useState<boolean[]>(() => loadSavedChecks(FLOOD_STORAGE_KEY));

  // Toggle checklist item
  const handleToggleCheck = (index: number) => {
    if (selectedCategory === 'landslide') {
      const updated = [...landslideChecks];
      updated[index] = !updated[index];
      setLandslideChecks(updated);
      try {
        localStorage.setItem(LANDSLIDE_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
    } else if (selectedCategory === 'flood') {
      const updated = [...floodChecks];
      updated[index] = !updated[index];
      setFloodChecks(updated);
      try {
        localStorage.setItem(FLOOD_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
    }
  };

  // Android Hardware Back Button Integration
  useEffect(() => {
    const handleBack = (e: CustomEvent) => {
      if (showSafetyPopup) {
        setShowSafetyPopup(false);
        e.preventDefault();
        return;
      }
      if (selectedCategory !== null) {
        setSelectedCategory(null);
        e.preventDefault();
        return;
      }
      onClose();
      e.preventDefault();
    };

    window.addEventListener('satark-android-back' as any, handleBack);
    return () => window.removeEventListener('satark-android-back' as any, handleBack);
  }, [showSafetyPopup, selectedCategory, onClose]);

  const isLight = currentTheme === 'light';

  // Palette
  const colors = {
    bgMain: isLight ? '#f8fafc' : '#070c17',
    bgHeader: isLight ? '#ffffff' : '#0b1329',
    bgCard: isLight ? '#ffffff' : '#0e172a',
    borderCol: isLight ? '#e2e8f0' : '#1e293b',
    textPrimary: isLight ? '#0f172a' : '#f8fafc',
    textMuted: isLight ? '#64748b' : '#94a3b8',
    itemHoverBg: isLight ? '#f1f5f9' : '#1e293b',
    itemCheckedBg: isLight ? '#f0fdf4' : 'rgba(34, 197, 94, 0.1)',
    itemCheckedBorder: isLight ? '#bbf7d0' : 'rgba(34, 197, 94, 0.35)'
  };

  const activeChecks = selectedCategory === 'landslide' ? landslideChecks : floodChecks;
  const activeItems = selectedCategory === 'landslide' ? LANDSLIDE_ITEMS : FLOOD_ITEMS;
  const completedCount = activeChecks.filter(Boolean).length;
  const progressPercent = Math.round((completedCount / 10) * 100);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.bgMain,
        color: colors.textPrimary,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}
    >
      {/* ── TOP HEADER BAR ── */}
      <header
        style={{
          padding: '12px 16px',
          background: colors.bgHeader,
          borderBottom: `1px solid ${colors.borderCol}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 30
        }}
      >
        <button
          type="button"
          onClick={() => {
            if (selectedCategory !== null) {
              setSelectedCategory(null);
            } else {
              onClose();
            }
          }}
          style={{
            background: isLight ? '#f1f5f9' : '#1e293b',
            border: `1px solid ${colors.borderCol}`,
            color: '#38bdf8',
            borderRadius: '8px',
            padding: '6px 14px',
            fontSize: '0.82rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer'
          }}
        >
          ← {selectedCategory !== null ? t('checklist.backToMenu', currentLang) : t('checklist.backToHome', currentLang)}
        </button>

        <div style={{ fontWeight: 900, fontSize: '0.92rem', color: colors.textPrimary, letterSpacing: '0.02em' }}>
          {selectedCategory === 'landslide'
            ? t('checklist.landslideOption', currentLang)
            : selectedCategory === 'flood'
            ? t('checklist.floodOption', currentLang)
            : t('checklist.mainTitle', currentLang)}
        </div>

        <div style={{ width: '40px' }} />
      </header>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main
        style={{
          flex: 1,
          padding: '16px 14px 40px 14px',
          maxWidth: '520px',
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
          overflowY: 'auto'
        }}
      >
        {/* ── VIEW 1: CATEGORY SELECTOR (LANDSLIDE / FLOOD) ── */}
        {selectedCategory === null && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Intro Header */}
            <div style={{ textAlign: 'center', margin: '8px 0 12px 0' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  margin: '0 auto 10px auto',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.75rem',
                  boxShadow: '0 8px 18px rgba(2, 132, 199, 0.35)'
                }}
              >
                📋
              </div>

              <h1
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 900,
                  margin: '0 0 6px 0',
                  color: colors.textPrimary,
                  letterSpacing: '-0.01em'
                }}
              >
                {t('checklist.mainTitle', currentLang)}
              </h1>

              <p
                style={{
                  fontSize: '0.84rem',
                  color: colors.textMuted,
                  margin: 0,
                  lineHeight: 1.45
                }}
              >
                {t('checklist.mainSubtitle', currentLang)}
              </p>
            </div>

            {/* Option 1: LANDSLIDE */}
            <div
              onClick={() => setSelectedCategory('landslide')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedCategory('landslide')}
              style={{
                background: colors.bgCard,
                border: isLight ? '1px solid #fed7aa' : '1px solid rgba(234, 88, 12, 0.35)',
                borderRadius: '16px',
                padding: '20px 18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: isLight ? '0 4px 16px rgba(234, 88, 12, 0.08)' : '0 6px 20px rgba(0,0,0,0.45)',
                transition: 'transform 0.15s ease, border-color 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '12px',
                    background: isLight ? '#ffedd5' : 'rgba(234, 88, 12, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.75rem',
                    flexShrink: 0
                  }}
                >
                  ⛰️
                </div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '1.05rem', color: isLight ? '#c2410c' : '#fb923c' }}>
                    {t('checklist.landslideOption', currentLang)}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: colors.textMuted, marginTop: '3px' }}>
                    {t('checklist.landslideOptionSub', currentLang)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: colors.textMuted, marginTop: '4px', fontWeight: 600 }}>
                    {landslideChecks.filter(Boolean).length} / 10 {t('checklist.completed', currentLang).toLowerCase()}
                  </div>
                </div>
              </div>

              <div style={{ color: isLight ? '#ea580c' : '#fb923c', fontSize: '1.2rem', fontWeight: 900 }}>
                ›
              </div>
            </div>

            {/* Option 2: FLOOD */}
            <div
              onClick={() => setSelectedCategory('flood')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedCategory('flood')}
              style={{
                background: colors.bgCard,
                border: isLight ? '1px solid #bfdbfe' : '1px solid rgba(37, 99, 235, 0.35)',
                borderRadius: '16px',
                padding: '20px 18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: isLight ? '0 4px 16px rgba(37, 99, 235, 0.08)' : '0 6px 20px rgba(0,0,0,0.45)',
                transition: 'transform 0.15s ease, border-color 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '12px',
                    background: isLight ? '#dbeafe' : 'rgba(37, 99, 235, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.75rem',
                    flexShrink: 0
                  }}
                >
                  🌊
                </div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '1.05rem', color: isLight ? '#1d4ed8' : '#60a5fa' }}>
                    {t('checklist.floodOption', currentLang)}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: colors.textMuted, marginTop: '3px' }}>
                    {t('checklist.floodOptionSub', currentLang)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: colors.textMuted, marginTop: '4px', fontWeight: 600 }}>
                    {floodChecks.filter(Boolean).length} / 10 {t('checklist.completed', currentLang).toLowerCase()}
                  </div>
                </div>
              </div>

              <div style={{ color: isLight ? '#2563eb' : '#60a5fa', fontSize: '1.2rem', fontWeight: 900 }}>
                ›
              </div>
            </div>
          </div>
        )}

        {/* ── VIEW 2: ACTIVE CHECKLIST (LANDSLIDE OR FLOOD) ── */}
        {selectedCategory !== null && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Header Card */}
            <div
              style={{
                background: colors.bgCard,
                border: `1px solid ${colors.borderCol}`,
                borderRadius: '16px',
                padding: '16px',
                boxShadow: isLight ? '0 2px 10px rgba(0,0,0,0.04)' : '0 4px 16px rgba(0,0,0,0.4)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{ fontSize: '1.6rem' }}>
                  {selectedCategory === 'landslide' ? '⛰️' : '🌊'}
                </span>
                <div>
                  <h2
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 900,
                      margin: 0,
                      color: selectedCategory === 'landslide' ? (isLight ? '#c2410c' : '#fb923c') : (isLight ? '#1d4ed8' : '#60a5fa')
                    }}
                  >
                    {selectedCategory === 'landslide'
                      ? t('checklist.landslideHeader', currentLang)
                      : t('checklist.floodHeader', currentLang)}
                  </h2>
                </div>
              </div>

              <p style={{ fontSize: '0.8rem', color: colors.textMuted, margin: '6px 0 12px 0', lineHeight: 1.45 }}>
                {selectedCategory === 'landslide'
                  ? t('checklist.landslideSubtitle', currentLang)
                  : t('checklist.floodSubtitle', currentLang)}
              </p>

              {/* Progress Bar & Counter */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase' }}>
                  {t('checklist.completed', currentLang)}: {completedCount} / 10
                </span>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: completedCount === 10 ? '#22c55e' : colors.textPrimary }}>
                  {progressPercent}%
                </span>
              </div>

              <div
                style={{
                  width: '100%',
                  height: '8px',
                  background: isLight ? '#e2e8f0' : '#1e293b',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    width: `${progressPercent}%`,
                    height: '100%',
                    background: completedCount === 10 ? '#22c55e' : (selectedCategory === 'landslide' ? '#ea580c' : '#2563eb'),
                    borderRadius: '4px',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>

            {/* 10 Checklist Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeItems.map((itemKey, idx) => {
                const isChecked = activeChecks[idx];
                return (
                  <div
                    key={itemKey}
                    onClick={() => handleToggleCheck(idx)}
                    role="checkbox"
                    aria-checked={isChecked}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        handleToggleCheck(idx);
                      }
                    }}
                    style={{
                      background: isChecked ? colors.itemCheckedBg : colors.bgCard,
                      border: `1px solid ${isChecked ? colors.itemCheckedBorder : colors.borderCol}`,
                      borderRadius: '12px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease, border-color 0.15s ease',
                      boxSizing: 'border-box'
                    }}
                  >
                    {/* Checkbox Icon Element */}
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        border: isChecked ? 'none' : `2px solid ${isLight ? '#94a3b8' : '#475569'}`,
                        background: isChecked ? '#22c55e' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: '#ffffff',
                        fontWeight: 900,
                        fontSize: '0.9rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {isChecked && '✓'}
                    </div>

                    {/* Item Number & Description */}
                    <div style={{ flex: 1 }}>
                      <span
                        style={{
                          fontSize: '0.86rem',
                          fontWeight: isChecked ? 600 : 500,
                          color: isChecked ? (isLight ? '#166534' : '#86efac') : colors.textPrimary,
                          lineHeight: 1.4
                        }}
                      >
                        <span style={{ fontWeight: 800, marginRight: '6px', opacity: 0.75 }}>{idx + 1}.</span>
                        {t(itemKey, currentLang)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom OK Button */}
            <div style={{ marginTop: '8px', paddingTop: '8px' }}>
              <button
                type="button"
                onClick={() => setShowSafetyPopup(true)}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '1rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(22, 163, 74, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {t('checklist.ok', currentLang)}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── SAFETY CONFIRMATION POPUP / DIALOG ── */}
      {showSafetyPopup && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.82)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)'
          }}
        >
          <div
            style={{
              background: colors.bgCard,
              border: `1px solid ${colors.borderCol}`,
              borderRadius: '20px',
              padding: '24px 20px',
              maxWidth: '360px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              boxSizing: 'border-box'
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                margin: '0 auto 14px auto',
                borderRadius: '50%',
                background: isLight ? '#dcfce7' : 'rgba(34, 197, 94, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem'
              }}
            >
              🛡️
            </div>

            <h3
              style={{
                margin: '0 0 10px 0',
                fontSize: '1.2rem',
                fontWeight: 900,
                color: colors.textPrimary
              }}
            >
              {t('checklist.safetyPopupTitle', currentLang)}
            </h3>

            <p
              style={{
                margin: '0 0 20px 0',
                fontSize: '0.92rem',
                color: colors.textPrimary,
                lineHeight: 1.5,
                fontWeight: 600
              }}
            >
              {t('checklist.safetyPopupMessage', currentLang)}
            </p>

            <button
              type="button"
              onClick={() => {
                setShowSafetyPopup(false);
                setSelectedCategory(null);
              }}
              style={{
                width: '100%',
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '0.92rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              {t('checklist.safetyPopupConfirm', currentLang)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
