/**
 * SATARK Family Members Manager Component
 * Renders inside Citizen Profile:
 * - List of all saved family members (unlimited)
 * - Real GPS Live Location support ("Use Current Location" button)
 * - Reverse-geocoding into human-readable city/area
 * - "Last updated: just now / X min ago" timestamp
 * - "DEMO LOCATION" tag for simulated demo locations
 * - Add, Edit, Change Location, and Delete members
 * - Full persistence via familySafetyService
 * 
 * SIH 2026 EWS-NER
 */
import React, { useState, useEffect } from 'react';
import {
  FamilyMember,
  RelationshipType,
  getFamilyMembers,
  addFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
  getAvatarForRelationship,
  computeMemberSafety,
  getFamilyDemoScenario,
  reverseGeocodeCoords,
  formatLocationAge
} from '../../services/familySafetyService';

interface Props {
  isLight: boolean;
  borderCol: string;
  textPrimary: string;
  textMuted: string;
  bgCard: string;
  onOpenSafetyPopup?: () => void;
}

const RELATIONSHIP_OPTIONS: RelationshipType[] = [
  'Mother',
  'Father',
  'Brother',
  'Sister',
  'Grandparent',
  'Son',
  'Daughter',
  'Spouse',
  'Friend',
  'Other'
];

import { CITY_AREA_OPTIONS } from '../../services/citizenLocationService';

export const SatarkFamilyMembersManager: React.FC<Props> = ({
  isLight,
  borderCol,
  textPrimary,
  textMuted,
  bgCard,
  onOpenSafetyPopup
}) => {
  const [members, setMembers] = useState<FamilyMember[]>(() => getFamilyMembers());
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState<string>('');
  const [formRelationship, setFormRelationship] = useState<RelationshipType>('Mother');
  const [formCity, setFormCity] = useState<string>('Jabalpur');
  const [formArea, setFormArea] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formLat, setFormLat] = useState<number | undefined>(undefined);
  const [formLng, setFormLng] = useState<number | undefined>(undefined);
  const [formIsLive, setFormIsLive] = useState<boolean>(false);

  // Location Modal State
  const [locationMember, setLocationMember] = useState<FamilyMember | null>(null);
  const [locationCity, setLocationCity] = useState<string>('');
  const [locationArea, setLocationArea] = useState<string>('');
  const [locationLat, setLocationLat] = useState<number | undefined>(undefined);
  const [locationLng, setLocationLng] = useState<number | undefined>(undefined);
  const [locationIsLive, setLocationIsLive] = useState<boolean>(false);

  // GPS Acquisition State
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Periodic re-render so "X min ago" stays fresh
  const [, setTick] = useState<number>(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  // Sync state
  useEffect(() => {
    const handleUpdate = () => {
      setMembers(getFamilyMembers());
    };
    window.addEventListener('satark-family-updated', handleUpdate);
    return () => window.removeEventListener('satark-family-updated', handleUpdate);
  }, []);

  const openAddModal = () => {
    setEditingMemberId(null);
    setFormName('');
    setFormRelationship('Mother');
    setFormCity('Jabalpur');
    setFormArea('');
    setFormPhone('');
    setFormLat(undefined);
    setFormLng(undefined);
    setFormIsLive(false);
    setGpsError(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (m: FamilyMember) => {
    setEditingMemberId(m.id);
    setFormName(m.name);
    setFormRelationship(m.relationship);
    setFormCity(m.city);
    setFormArea(m.area || '');
    setFormPhone(m.phone || '');
    setFormLat(m.lat);
    setFormLng(m.lng);
    setFormIsLive(!!m.isLiveLocation);
    setGpsError(null);
    setIsAddModalOpen(true);
  };

  const openLocationModal = (m: FamilyMember) => {
    setLocationMember(m);
    setLocationCity(m.city);
    setLocationArea(m.area || '');
    setLocationLat(m.lat);
    setLocationLng(m.lng);
    setLocationIsLive(!!m.isLiveLocation);
    setGpsAccuracy(null);
    setGpsError(null);
  };

  // Real Live GPS Detection Handler
  const handleUseCurrentLocation = (isForm: boolean) => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported on this device/browser.');
      return;
    }

    setIsDetectingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setGpsAccuracy(Math.round(accuracy));

        // Reverse geocode coordinates
        const geo = await reverseGeocodeCoords(latitude, longitude);

        if (isForm) {
          setFormLat(latitude);
          setFormLng(longitude);
          setFormCity(geo.city);
          if (geo.area) setFormArea(geo.area);
          setFormIsLive(true);
        } else {
          setLocationLat(latitude);
          setLocationLng(longitude);
          setLocationCity(geo.city);
          if (geo.area) setLocationArea(geo.area);
          setLocationIsLive(true);
        }

        setIsDetectingGps(false);
      },
      (error) => {
        setIsDetectingGps(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGpsError('Location permission denied. Please allow GPS access in settings.');
        } else if (error.code === error.TIMEOUT) {
          setGpsError('GPS acquisition timed out. Please select city manually.');
        } else {
          setGpsError('GPS position unavailable. Please enter city manually.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCity.trim()) return;

    if (editingMemberId) {
      updateFamilyMember(editingMemberId, {
        name: formName.trim(),
        relationship: formRelationship,
        city: formCity.trim(),
        area: formArea.trim() || undefined,
        phone: formPhone.trim() || undefined,
        lat: formLat,
        lng: formLng,
        isLiveLocation: formIsLive,
        locationUpdatedAt: Date.now(),
        avatar: getAvatarForRelationship(formRelationship)
      });
    } else {
      addFamilyMember({
        name: formName.trim(),
        relationship: formRelationship,
        city: formCity.trim(),
        area: formArea.trim() || undefined,
        phone: formPhone.trim() || undefined,
        lat: formLat,
        lng: formLng,
        isLiveLocation: formIsLive,
        locationUpdatedAt: Date.now(),
        avatar: getAvatarForRelationship(formRelationship)
      });
    }

    setMembers(getFamilyMembers());
    setIsAddModalOpen(false);
  };

  const handleSaveLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationMember || !locationCity.trim()) return;

    updateFamilyMember(locationMember.id, {
      city: locationCity.trim(),
      area: locationArea.trim() || undefined,
      lat: locationLat,
      lng: locationLng,
      isLiveLocation: locationIsLive,
      locationUpdatedAt: Date.now()
    });

    setMembers(getFamilyMembers());
    setLocationMember(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Remove this family member from safety monitoring?')) {
      deleteFamilyMember(id);
      setMembers(getFamilyMembers());
    }
  };

  const currentScenario = getFamilyDemoScenario();

  return (
    <div
      style={{
        background: isLight ? '#f8fafc' : '#0b1329',
        border: `1px solid ${borderCol}`,
        borderRadius: '16px',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      {/* Section Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '18px' }}>👨‍👩‍👧</span>
            <span style={{ fontSize: '0.92rem', fontWeight: 800, color: textPrimary }}>
              Family Safety Network
            </span>
          </div>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: textMuted }}>
            Real GPS & location safety status for your loved ones.
          </p>
        </div>

        {/* View Popup Button */}
        {onOpenSafetyPopup && (
          <button
            type="button"
            onClick={onOpenSafetyPopup}
            style={{
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)'
            }}
          >
            <span>☀️ Status Popup</span>
          </button>
        )}
      </div>

      {/* List of Saved Members */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {members.map(member => {
          const safety = computeMemberSafety(member, currentScenario);
          const isModerate = safety.status === 'MODERATE';
          const isCrit = safety.status === 'CRITICAL' || safety.status === 'HIGH';

          const badgeBg = isCrit ? '#fee2e2' : isModerate ? '#fef3c7' : '#dcfce7';
          const badgeCol = isCrit ? '#b91c1c' : isModerate ? '#b45309' : '#15803d';

          const locationStatusText = formatLocationAge(member.locationUpdatedAt, !member.isLiveLocation, member.isLiveLocation);

          return (
            <div
              key={member.id}
              style={{
                background: isLight ? '#ffffff' : '#111c38',
                border: `1px solid ${isCrit ? '#fca5a5' : isModerate ? '#fde047' : borderCol}`,
                borderRadius: '12px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              {/* Top row: Avatar + Name + Relationship + Status Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: isLight ? '#f1f5f9' : '#1e293b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px'
                    }}
                  >
                    {member.avatar || '👤'}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 800, color: textPrimary }}>
                      {member.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: textMuted }}>
                      {member.relationship}
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    backgroundColor: badgeBg,
                    color: badgeCol,
                    padding: '3px 8px',
                    borderRadius: '8px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {isCrit ? '🚨' : isModerate ? '🟠' : '🟢'} {safety.badgeText} ({safety.score})
                </span>
              </div>

              {/* Middle row: Location pill with Real Live GPS indicator & timestamp */}
              <div
                style={{
                  fontSize: '0.74rem',
                  color: isLight ? '#0369a1' : '#38bdf8',
                  background: isLight ? '#f0f9ff' : 'rgba(56, 189, 248, 0.1)',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700 }}>
                    📍 {member.city}{member.area ? ` (${member.area})` : ''}
                  </span>
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      padding: '1px 5px',
                      borderRadius: '4px',
                      backgroundColor: member.isLiveLocation ? '#dcfce7' : '#e2e8f0',
                      color: member.isLiveLocation ? '#15803d' : '#475569'
                    }}
                  >
                    {member.isLiveLocation ? '📡 LIVE GPS' : 'DEMO LOCATION'}
                  </span>
                </div>
                <div style={{ fontSize: '0.68rem', color: textMuted, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{locationStatusText}</span>
                  {member.phone && <span>📞 {member.phone}</span>}
                </div>
              </div>

              {/* Action Buttons: Change Location, Edit, Delete */}
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', paddingTop: '2px' }}>
                <button
                  type="button"
                  onClick={() => openLocationModal(member)}
                  style={{
                    background: isLight ? '#eff6ff' : '#1e293b',
                    border: `1px solid ${isLight ? '#bfdbfe' : '#334155'}`,
                    borderRadius: '6px',
                    color: '#2563eb',
                    padding: '4px 8px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  📍 Change Location
                </button>
                <button
                  type="button"
                  onClick={() => openEditModal(member)}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${borderCol}`,
                    borderRadius: '6px',
                    color: textPrimary,
                    padding: '4px 8px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  ✏️ Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(member.id)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #fca5a5',
                    borderRadius: '6px',
                    color: '#ef4444',
                    padding: '4px 8px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* + Add Family Member Button */}
      <button
        type="button"
        onClick={openAddModal}
        style={{
          width: '100%',
          backgroundColor: isLight ? '#eff6ff' : '#1e293b',
          border: `1.5px dashed ${isLight ? '#93c5fd' : '#3b82f6'}`,
          borderRadius: '12px',
          padding: '10px',
          color: '#2563eb',
          fontSize: '0.8rem',
          fontWeight: 800,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          marginTop: '2px'
        }}
      >
        <span>➕</span>
        <span>Add Family Member</span>
      </button>

      {/* ── Modal 1: Add / Edit Family Member ── */}
      {isAddModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '16px'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '340px',
              backgroundColor: isLight ? '#ffffff' : '#0e172a',
              borderRadius: '24px',
              padding: '20px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxSizing: 'border-box',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: textPrimary }}>
                {editingMemberId ? 'Edit Family Member' : 'Add Family Member'}
              </span>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', color: textMuted, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMember} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Name */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: textMuted, display: 'block', marginBottom: '3px' }}>
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Maa, Papa, Brother, Sister"
                  style={{
                    width: '100%',
                    background: isLight ? '#f8fafc' : '#1e293b',
                    color: textPrimary,
                    border: `1px solid ${borderCol}`,
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '0.8rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Relationship */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: textMuted, display: 'block', marginBottom: '3px' }}>
                  Relationship *
                </label>
                <select
                  value={formRelationship}
                  onChange={e => setFormRelationship(e.target.value as RelationshipType)}
                  style={{
                    width: '100%',
                    background: isLight ? '#f8fafc' : '#1e293b',
                    color: textPrimary,
                    border: `1px solid ${borderCol}`,
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '0.8rem'
                  }}
                >
                  {RELATIONSHIP_OPTIONS.map(rel => (
                    <option key={rel} value={rel}>{getAvatarForRelationship(rel)} {rel}</option>
                  ))}
                </select>
              </div>

              {/* City / Location with "Use Current Location" Button */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: textMuted }}>
                    Location (City / Area) *
                  </label>
                  <button
                    type="button"
                    onClick={() => handleUseCurrentLocation(true)}
                    disabled={isDetectingGps}
                    style={{
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      color: '#2563eb',
                      borderRadius: '6px',
                      padding: '2px 8px',
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>{isDetectingGps ? '⏳' : '📍'}</span>
                    <span>{isDetectingGps ? 'Detecting GPS...' : 'Use Current Location'}</span>
                  </button>
                </div>

                <input
                  type="text"
                  required
                  value={formCity}
                  onChange={e => {
                    setFormCity(e.target.value);
                    setFormIsLive(false);
                  }}
                  placeholder="e.g. Jabalpur, Meppadi, Guwahati"
                  style={{
                    width: '100%',
                    background: isLight ? '#f8fafc' : '#1e293b',
                    color: textPrimary,
                    border: `1px solid ${borderCol}`,
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '0.8rem',
                    boxSizing: 'border-box'
                  }}
                />

                {/* GPS Status Indicator */}
                {formIsLive && formLat && formLng && (
                  <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>📡</span>
                    <span>Live GPS: {formLat.toFixed(4)}°N, {formLng.toFixed(4)}°E {gpsAccuracy ? `(±${gpsAccuracy}m)` : ''}</span>
                  </div>
                )}

                {gpsError && (
                  <div style={{ fontSize: '0.68rem', color: '#dc2626', fontWeight: 600, marginTop: '4px' }}>
                    ⚠️ {gpsError}
                  </div>
                )}

                {/* Predefined SATARK Areas */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                  {CITY_AREA_OPTIONS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setFormCity(c.name);
                        setFormArea(c.state || c.district);
                        setFormLat(c.lat);
                        setFormLng(c.lon);
                        setFormIsLive(false);
                      }}
                      style={{
                        background: formCity === c.name ? '#38bdf8' : (isLight ? '#f1f5f9' : '#1e293b'),
                        color: formCity === c.name ? '#ffffff' : textMuted,
                        border: 'none',
                        borderRadius: '4px',
                        padding: '3px 7px',
                        fontSize: '0.66rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Phone */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: textMuted, display: 'block', marginBottom: '3px' }}>
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={e => setFormPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  style={{
                    width: '100%',
                    background: isLight ? '#f8fafc' : '#1e293b',
                    color: textPrimary,
                    border: `1px solid ${borderCol}`,
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '0.8rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{
                    flex: 1,
                    backgroundColor: 'transparent',
                    border: `1px solid ${borderCol}`,
                    color: textMuted,
                    padding: '9px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    backgroundColor: '#2563eb',
                    border: 'none',
                    color: '#ffffff',
                    padding: '9px',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  Save Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 2: Location Setup Modal (Real Live GPS + Change Location) ── */}
      {locationMember && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '16px'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '340px',
              backgroundColor: isLight ? '#ffffff' : '#0e172a',
              borderRadius: '24px',
              padding: '20px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxSizing: 'border-box'
            }}
          >
            {/* Header with Member Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '22px' }}>{locationMember.avatar || '👤'}</span>
                <div>
                  <div style={{ fontSize: '0.94rem', fontWeight: 800, color: textPrimary }}>
                    {locationMember.name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: textMuted }}>
                    {locationMember.relationship} · Location Setup
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLocationMember(null)}
                style={{ background: 'none', border: 'none', fontSize: '18px', color: textMuted, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Current Saved Location Display */}
            <div
              style={{
                backgroundColor: isLight ? '#f1f5f9' : '#1e293b',
                borderRadius: '10px',
                padding: '10px',
                fontSize: '0.76rem',
                color: textPrimary
              }}
            >
              <div style={{ fontWeight: 700, color: textMuted, fontSize: '0.68rem', marginBottom: '2px' }}>
                CURRENT SAVED LOCATION
              </div>
              <div style={{ fontWeight: 800, fontSize: '0.84rem' }}>
                📍 {locationMember.city}{locationMember.area ? ` (${locationMember.area})` : ''}
              </div>
              <div style={{ fontSize: '0.68rem', color: textMuted, marginTop: '2px' }}>
                {formatLocationAge(locationMember.locationUpdatedAt, !locationMember.isLiveLocation, locationMember.isLiveLocation)}
              </div>
            </div>

            {/* "Use Current Location" Button */}
            <button
              type="button"
              onClick={() => handleUseCurrentLocation(false)}
              disabled={isDetectingGps}
              style={{
                width: '100%',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '10px',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
              }}
            >
              <span>{isDetectingGps ? '⏳' : '📡'}</span>
              <span>{isDetectingGps ? 'Acquiring Real GPS Fix...' : 'Use Current Location'}</span>
            </button>

            {/* GPS Feedback & Error */}
            {locationIsLive && locationLat && locationLng && (
              <div
                style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  fontSize: '0.72rem',
                  color: '#15803d'
                }}
              >
                <div style={{ fontWeight: 800 }}>✓ GPS Location Acquired</div>
                <div style={{ fontSize: '0.68rem', marginTop: '2px' }}>
                  {locationLat.toFixed(4)}°N, {locationLng.toFixed(4)}°E {gpsAccuracy ? `(±${gpsAccuracy}m accuracy)` : ''}
                </div>
              </div>
            )}

            {gpsError && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  fontSize: '0.72rem',
                  color: '#b91c1c'
                }}
              >
                ⚠️ {gpsError}
              </div>
            )}

            <form onSubmit={handleSaveLocation} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: textMuted, display: 'block', marginBottom: '4px' }}>
                  City / Area Field *
                </label>
                <input
                  type="text"
                  required
                  value={locationCity}
                  onChange={e => {
                    setLocationCity(e.target.value);
                    setLocationIsLive(false);
                  }}
                  placeholder="e.g. Jabalpur, Meppadi, Guwahati"
                  style={{
                    width: '100%',
                    background: isLight ? '#f8fafc' : '#1e293b',
                    color: textPrimary,
                    border: `1px solid ${borderCol}`,
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '0.8rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Quick choices */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {CITY_AREA_OPTIONS.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setLocationCity(c.name);
                      setLocationArea(c.state || c.district);
                      setLocationLat(c.lat);
                      setLocationLng(c.lon);
                      setLocationIsLive(false);
                    }}
                    style={{
                      background: locationCity === c.name ? '#38bdf8' : (isLight ? '#f1f5f9' : '#1e293b'),
                      color: locationCity === c.name ? '#ffffff' : textMuted,
                      border: 'none',
                      borderRadius: '4px',
                      padding: '3px 7px',
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setLocationMember(null)}
                  style={{
                    flex: 1,
                    backgroundColor: 'transparent',
                    border: `1px solid ${borderCol}`,
                    color: textMuted,
                    padding: '9px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    backgroundColor: '#16a34a',
                    border: 'none',
                    color: '#ffffff',
                    padding: '9px',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  Save Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
