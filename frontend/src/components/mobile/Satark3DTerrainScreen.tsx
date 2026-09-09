import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terrain3DVisualizer } from '../map/Terrain3DVisualizer';
import {
  getCitizenLocation,
  getCitizenCustomLocation,
  getCityConfig,
  CITY_AREA_OPTIONS,
  setCitizenLocation,
  CityAreaConfig
} from '../../services/citizenLocationService';

interface Props {
  onClose: () => void;
  lang?: string;
  theme?: 'dark' | 'light';
  initialCityId?: string;
}

export const Satark3DTerrainScreen: React.FC<Props> = ({
  onClose,
  lang = 'en',
  theme = 'dark',
  initialCityId
}) => {
  const isLight = theme === 'light';

  // 1. City / Area Synchronization
  const [currentCityId, setCurrentCityId] = useState<string>(() => {
    return initialCityId || getCitizenLocation() || 'guwahati';
  });
  const [customLocationName, setCustomLocationName] = useState<string | null>(() => getCitizenCustomLocation());
  const [showCitySheet, setShowCitySheet] = useState<boolean>(false);

  const cityConfig: CityAreaConfig = getCityConfig(currentCityId);
  const displayName = currentCityId === 'other' && customLocationName ? customLocationName : cityConfig.displayName;
  const shortName = currentCityId === 'other' && customLocationName ? customLocationName : cityConfig.name;

  // Listen to external location changes (e.g. from Profile or Header)
  useEffect(() => {
    const handleLocationChange = (e: any) => {
      const nextId = e.detail?.cityId || getCitizenLocation() || 'guwahati';
      const nextCustom = e.detail?.customName || getCitizenCustomLocation();
      setCurrentCityId(nextId);
      setCustomLocationName(nextCustom);
    };
    window.addEventListener('satark-location-change', handleLocationChange);
    return () => window.removeEventListener('satark-location-change', handleLocationChange);
  }, []);

  const handleSelectCity = (cityId: string) => {
    setCurrentCityId(cityId);
    setCitizenLocation(cityId);
    setShowCitySheet(false);
  };

  // 5. Maximize/Minimize State (declared early, used in back button handler)
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  // 2. Hardware Android Back Button Handling
  useEffect(() => {
    const handleAndroidBack = (e: Event) => {
      e.preventDefault(); // consume event
      if (isMaximized) {
        setIsMaximized(false);
      } else if (showCitySheet) {
        setShowCitySheet(false);
      } else {
        onClose();
      }
    };
    window.addEventListener('satark-android-back', handleAndroidBack);
    return () => window.removeEventListener('satark-android-back', handleAndroidBack);
  }, [onClose, showCitySheet, isMaximized]);

  // 3. Network / Offline State
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // 4. Interactive Layer State
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [runoffActive, setRunoffActive] = useState<boolean>(true);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [showLegend, setShowLegend] = useState<boolean>(true);
  const [showControls, setShowControls] = useState<boolean>(false);
  const [cameraKey, setCameraKey] = useState<number>(0);

  const resetCamera = useCallback(() => {
    setCameraKey(prev => prev + 1);
  }, []);

  // Color variables
  const bgHeader = isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(11, 19, 41, 0.95)';
  const borderCol = isLight ? '#e2e8f0' : '#1e293b';
  const textPrimary = isLight ? '#0f172a' : '#f8fafc';
  const textMuted = isLight ? '#64748b' : '#94a3b8';

  const riskLevel = cityConfig.demoRisk.level;
  const riskBadgeColor = riskLevel === 'RED' ? '#ef4444' : riskLevel === 'AMBER' ? '#f59e0b' : '#22c55e';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 200,
      background: '#0b1329',
      color: textPrimary,
      fontFamily: 'Inter, system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* ── TOP MOBILE NAVIGATION BAR (hidden when maximized) ── */}
      {!isMaximized && (
        <header style={{
          position: 'relative',
          zIndex: 20,
          background: bgHeader,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${borderCol}`,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          {/* Back Button */}
          <button
            onClick={onClose}
            style={{
              background: isLight ? '#f1f5f9' : 'rgba(30, 41, 59, 0.9)',
              border: `1px solid ${borderCol}`,
              borderRadius: '8px',
              color: '#38bdf8',
              padding: '6px 12px',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            ← Back
          </button>

          {/* Title */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 900, fontSize: '0.88rem', letterSpacing: '-0.01em', color: textPrimary }}>
              🏔️ 3D Terrain &amp; Runoff
            </div>
            <div style={{ fontSize: '0.64rem', color: textMuted }}>
              NASA SRTM 30m DEM Simulator
            </div>
          </div>

          {/* City Selector Pill */}
          <button
            onClick={() => setShowCitySheet(true)}
            style={{
              background: isLight ? '#eff6ff' : 'rgba(30, 41, 59, 0.9)',
              border: `1px solid ${isLight ? '#bfdbfe' : 'rgba(56, 189, 248, 0.4)'}`,
              borderRadius: '16px',
              color: isLight ? '#0284c7' : '#38bdf8',
              padding: '4px 10px',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              maxWidth: '120px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            <span>📍</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{shortName}</span>
            <span>▾</span>
          </button>
        </header>
      )}

      {/* ── OFFLINE STATUS NOTICE (hidden when maximized) ── */}
      {!isOnline && !isMaximized && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.2)',
          borderBottom: '1px solid rgba(245, 158, 11, 0.4)',
          color: '#fcd34d',
          padding: '4px 12px',
          fontSize: '0.70rem',
          fontWeight: 700,
          textAlign: 'center',
          zIndex: 15
        }}>
          ⚠️ Offline Mode · Local NASA SRTM DEM &amp; Runoff Cached Data Active
        </div>
      )}


      {/* ── 3D WEBGL TERRAIN + RUNOFF CANVAS ── */}
      <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
        <Terrain3DVisualizer
          key={`${currentCityId}-${cameraKey}`}
          zoneName={`${cityConfig.name} Slopes (${cityConfig.district})`}
          slope={cityConfig.slope}
          elevation={cityConfig.elev}
          fullScreen={true}
          interactive={true}
          rainfallMm={cityConfig.demoWeather.rain_24h_mm}
          soilMoisture={cityConfig.demoWeather.soil_moisture}
          riskLevel={cityConfig.demoRisk.level}
          actionProtocol={cityConfig.demoRisk.action_protocol}
          showHud={false}
          showTopControls={false}
          wireframeDefault={wireframe}
          autoRotateDefault={autoRotate}
        />

        {/* ── TOP-LEFT FLOATING TELEMETRY & RUNOFF HUD ── */}
        <div style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 10,
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '12px',
          padding: '10px 12px',
          maxWidth: '260px',
          boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
          pointerEvents: 'auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '4px' }}>
            <span style={{ fontWeight: 900, fontSize: '0.82rem', color: '#f8fafc' }}>
              {displayName}
            </span>
            <span style={{
              background: riskBadgeColor,
              color: '#ffffff',
              padding: '2px 6px',
              borderRadius: '6px',
              fontSize: '0.62rem',
              fontWeight: 900
            }}>
              {riskLevel}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px' }}>
            <div>Slope: <strong style={{ color: '#f87171' }}>{cityConfig.slope}°</strong></div>
            <div>Peak DEM: <strong style={{ color: '#38bdf8' }}>{cityConfig.elev} m</strong></div>
            <div>Rain 24h: <strong style={{ color: '#38bdf8' }}>{cityConfig.demoWeather.rain_24h_mm} mm</strong></div>
            <div>Soil Sat: <strong style={{ color: '#34d399' }}>{cityConfig.demoWeather.soil_moisture}%</strong></div>
          </div>

          <div style={{
            marginTop: '6px',
            paddingTop: '6px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '0.68rem',
            color: '#fca5a5',
            lineHeight: 1.3
          }}>
            🔴 <strong>Debris Flow &amp; Runoff:</strong> {cityConfig.demoRisk.description}
          </div>
        </div>

        {/* ── TOP-RIGHT QUICK LAYER CONTROLS TOGGLE ── */}
        <div style={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {/* Maximize / Minimize Toggle */}
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            title={isMaximized ? 'Minimize 3D terrain' : 'Maximize 3D terrain to full-screen'}
            style={{
              background: isMaximized ? '#2563eb' : 'rgba(15, 23, 42, 0.88)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              borderRadius: '8px',
              color: '#ffffff',
              padding: '6px 10px',
              fontSize: '0.82rem',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.5)'
            }}
          >
            {isMaximized ? '⊖ Min' : '⛶ Max'}
          </button>

          {/* Quick Layers Panel Toggle */}
          <button
            onClick={() => setShowControls(!showControls)}
            style={{
              background: showControls ? '#2563eb' : 'rgba(15, 23, 42, 0.88)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              color: '#ffffff',
              padding: '6px 10px',
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.35)'
            }}
          >
            <span>⚙️</span> Layers
          </button>

          {/* Quick Reset Camera */}
          <button
            onClick={resetCamera}
            title="Reset 3D camera angle"
            style={{
              background: 'rgba(15, 23, 42, 0.88)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              color: '#38bdf8',
              padding: '6px 10px',
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.35)'
            }}
          >
            <span>🎯</span> Center
          </button>

          {/* Legend Toggle */}
          <button
            onClick={() => setShowLegend(!showLegend)}
            style={{
              background: showLegend ? 'rgba(30, 41, 59, 0.9)' : 'rgba(15, 23, 42, 0.7)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              color: '#cbd5e1',
              padding: '6px 10px',
              fontSize: '0.70rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            📊 Legend
          </button>
        </div>

        {/* ── EXPANDED LAYER CONTROLS DRAWER ── */}
        {showControls && (
          <div style={{
            position: 'absolute',
            top: 96,
            right: 12,
            zIndex: 15,
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: '12px',
            padding: '12px',
            width: '180px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              3D &amp; Runoff Controls
            </div>

            {/* Wireframe Toggle */}
            <button
              onClick={() => setWireframe(!wireframe)}
              style={{
                background: wireframe ? '#2563eb' : '#1e293b',
                color: '#ffffff',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              {wireframe ? '🌐 Solid Mesh' : '🕸️ Wireframe'}
            </button>

            {/* Runoff Particles Active/Pause */}
            <button
              onClick={() => setRunoffActive(!runoffActive)}
              style={{
                background: runoffActive ? 'rgba(239, 68, 68, 0.25)' : '#1e293b',
                color: runoffActive ? '#f87171' : '#94a3b8',
                border: `1px solid ${runoffActive ? '#ef4444' : '#334155'}`,
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              {runoffActive ? '🔴 Runoff Flow: ON' : '⚪ Runoff Flow: OFF'}
            </button>

            {/* Auto-Rotate */}
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              style={{
                background: autoRotate ? 'rgba(56, 189, 248, 0.2)' : '#1e293b',
                color: autoRotate ? '#38bdf8' : '#94a3b8',
                border: `1px solid ${autoRotate ? '#0284c7' : '#334155'}`,
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              {autoRotate ? '🔄 Auto-Rotate: ON' : '⏸️ Auto-Rotate: OFF'}
            </button>
          </div>
        )}

        {/* ── BOTTOM-LEFT COMPACT MOBILE LEGEND ── */}
        {showLegend && (
          <div style={{
            position: 'absolute',
            bottom: 14,
            left: 12,
            zIndex: 10,
            background: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            padding: '8px 12px',
            fontSize: '0.68rem',
            color: '#cbd5e1',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.4)'
          }}>
            <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.70rem', marginBottom: '2px' }}>
              Terrain &amp; Runoff Legend
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '2px', background: '#ef4444' }} />
              <span>High Risk Steep Ridge (&gt; 15m elevation)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '2px', background: '#f59e0b' }} />
              <span>Moderate Slopes (8–15m elevation)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '2px', background: '#22c55e' }} />
              <span>Valley Base / Stable (&lt; 8m elevation)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', border: '1px solid #38bdf8' }} />
              <span>Debris &amp; Water Runoff Particles (Slope $\rightarrow$ Valley)</span>
            </div>
          </div>
        )}

        {/* ── BOTTOM-RIGHT INTERACTION HINT ── */}
        <div style={{
          position: 'absolute',
          bottom: 14,
          right: 12,
          zIndex: 10,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '4px 10px',
          fontSize: '0.66rem',
          color: '#94a3b8',
          pointerEvents: 'none'
        }}>
          👆 Drag: Orbit · Pinch: Zoom
        </div>
      </div>

      {/* ── CITY / AREA SELECTION BOTTOM SHEET ── */}
      {showCitySheet && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          zIndex: 300,
          display: 'flex',
          alignItems: 'flex-end'
        }}>
          <div style={{
            background: isLight ? '#ffffff' : '#0e172a',
            borderTop: `1px solid ${borderCol}`,
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            padding: '20px',
            width: '100%',
            maxHeight: '75vh',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 900, fontSize: '1rem', color: textPrimary }}>
                Select Monitored Area for 3D Terrain
              </div>
              <button
                onClick={() => setShowCitySheet(false)}
                style={{ background: 'transparent', border: 'none', color: textMuted, fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.74rem', color: textMuted }}>
              Switching area dynamically reloads NASA SRTM 30m DEM elevation mesh, slope angle, and simulated runoff paths.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '380px' }}>
              {CITY_AREA_OPTIONS.map(opt => {
                const isSelected = opt.id === currentCityId;
                const optRiskCol = opt.demoRisk.level === 'RED' ? '#ef4444' : opt.demoRisk.level === 'AMBER' ? '#f59e0b' : '#22c55e';

                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectCity(opt.id)}
                    style={{
                      background: isSelected
                        ? (isLight ? '#eff6ff' : 'rgba(2, 132, 199, 0.18)')
                        : (isLight ? '#f8fafc' : '#1e293b'),
                      border: `1px solid ${isSelected ? '#0284c7' : borderCol}`,
                      borderRadius: '10px',
                      padding: '12px 14px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.86rem', color: textPrimary }}>
                        📍 {opt.displayName}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: textMuted, marginTop: '2px' }}>
                        Slope: <strong style={{ color: textPrimary }}>{opt.slope}°</strong> · Elev: <strong style={{ color: textPrimary }}>{opt.elev}m</strong> · Rain: <strong style={{ color: textPrimary }}>{opt.demoWeather.rain_24h_mm}mm</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        background: optRiskCol,
                        color: '#ffffff',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.64rem',
                        fontWeight: 900
                      }}>
                        {opt.demoRisk.level}
                      </span>
                      {isSelected && <span style={{ color: '#38bdf8', fontSize: '0.9rem', fontWeight: 900 }}>✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
