import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { useGeolocation } from '../hooks/useGeolocation';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { CategoryGrid } from '../components/report/CategoryGrid';
import { AiVisionScanner, VisionDetectionResult } from '../components/report/AiVisionScanner';
import { PhotoCapture } from '../components/report/PhotoCapture';
import { OfflineStatusHeader } from '../components/layout/OfflineStatusHeader';
import { ReportCategory } from '../types';
import { queueReport, generateClientReportId } from '../services/offlineStore';
import { submitReport, uploadPhoto } from '../services/api';

const ReportFormPage = () => {
  const navigate = useNavigate();
  const { isOnline, pendingCount } = useOfflineSync();
  const { coords } = useGeolocation();
  const lang = (localStorage.getItem('ews_lang') as 'en' | 'hi' | 'as') || 'en';
  const { startListening, stopListening, isListening, transcript } = useVoiceAssistant(lang);

  const [category, setCategory] = useState<ReportCategory | null>('CRACK');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState<File | Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [, setVisionData] = useState<VisionDetectionResult | null>(null);
  const [inputMode, setInputMode] = useState<'ai_scan' | 'photo_capture'>('ai_scan');

  // When speech transcript comes, append to description
  React.useEffect(() => {
    if (transcript) {
      setDescription(prev => prev ? `${prev} ${transcript}` : transcript);
    }
  }, [transcript]);

  const handleAiScanComplete = (result: VisionDetectionResult, imageUrl?: string) => {
    setVisionData(result);

    // Auto-fill category based on AI Vision detection
    if (result.hazardType === 'TENSION_CRACK') {
      setCategory('CRACK');
    } else if (result.hazardType === 'MUDFLOW' || result.hazardType === 'SLOPE_EROSION') {
      setCategory('SLOPE_MOVEMENT');
    } else if (result.hazardType === 'ROAD_FRACTURE') {
      setCategory('BLOCKED_ROAD');
    } else {
      setCategory('OTHER');
    }

    setDescription(prev =>
      `[AI Vision Analysis: ${result.label} (${result.confidence}% confidence)]. ${result.recommendedAction} ${prev}`
    );

    if (imageUrl) {
      setPhotoPreview(imageUrl);
      // Convert preview to Blob for offline sync storage
      fetch(imageUrl)
        .then(res => res.blob())
        .then(blob => setCapturedPhoto(blob))
        .catch(() => {});
    }
  };

  const handleStandardPhotoSelected = (file: File) => {
    setCapturedPhoto(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  const handleRemovePhoto = () => {
    setCapturedPhoto(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoPreview(null);
  };

  const handleSubmit = async () => {
    if (!category) return;
    setSubmitting(true);
    const clientReportId = generateClientReportId();

    const payload = {
      geoLat: coords?.lat || 11.5534,
      geoLng: coords?.lng || 76.1320,
      category,
      description,
      reporterType: 'CITIZEN' as const,
      photoUrl: null as string | null,
      clientReportId,
    };

    try {
      if (isOnline) {
        let uploadedUrl: string | null = null;
        if (capturedPhoto) {
          try {
            uploadedUrl = await uploadPhoto(capturedPhoto, `citizen_${clientReportId}.jpg`);
            payload.photoUrl = uploadedUrl;
          } catch (uploadErr) {
            console.warn('Photo upload failed online, queueing offline:', uploadErr);
            await queueReport(payload, capturedPhoto);
            setSuccessMessage('Photo upload interrupted by network. Report queued locally and will sync automatically upon reconnection.');
            setSuccess(true);
            return;
          }
        }

        await submitReport(payload);
        setSuccessMessage('Incident report successfully submitted and broadcast to Emergency Command Center.');
      } else {
        // Offline flow: store report payload and photo blob locally in IndexedDB with zero data loss
        await queueReport(payload, capturedPhoto || undefined);
        setSuccessMessage('Offline Mode Active: Incident report and photographic evidence stored locally (PENDING_SYNC). Will automatically upload as soon as cellular service returns.');
      }
      setSuccess(true);
    } catch (e) {
      console.error('Submission error, fallback to offline queue:', e);
      // Even if online check passed, if server request threw network error, safeguard in offline queue
      await queueReport(payload, capturedPhoto || undefined);
      setSuccessMessage('Network connection unstable: Report safely preserved in local offline queue (PENDING_SYNC).');
      setSuccess(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0b1329', color: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <OfflineStatusHeader />

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px 16px' }}>

        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <button
            onClick={() => navigate('/citizen')}
            style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: '8px', padding: '8px 14px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
          >
            ← Back to Citizen Portal
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '0.8rem', color: isOnline ? '#4ade80' : '#f59e0b', fontWeight: 700 }}>
              {isOnline ? '🟢 Connected (Instant Cloud Sync)' : '🟠 Offline Mode (Zero Data Loss Queue)'}
            </div>
            {pendingCount > 0 && (
              <span style={{ background: '#f59e0b20', border: '1px solid #f59e0b', color: '#fcd34d', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700 }}>
                {pendingCount} Queued
              </span>
            )}
          </div>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '18px', padding: '28px' }}>
          <h2 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', fontWeight: 900, color: '#f8fafc' }}>
            📋 Report Landslide / Road Hazard
          </h2>
          <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#94a3b8' }}>
            Crowdsourced disaster verification. Works completely offline with automatic cloud synchronization.
          </p>

          {/* Mode Switcher: AI Vision vs Photo Capture */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
            <button
              onClick={() => setInputMode('ai_scan')}
              style={{
                flex: 1, padding: '10px', borderRadius: '10px',
                border: inputMode === 'ai_scan' ? '2px solid #38bdf8' : '1px solid #334155',
                background: inputMode === 'ai_scan' ? 'rgba(56,189,248,0.15)' : '#1e293b',
                color: inputMode === 'ai_scan' ? '#38bdf8' : '#94a3b8',
                fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
              }}
            >
              🤖 AI Computer Vision Scanner
            </button>
            <button
              onClick={() => setInputMode('photo_capture')}
              style={{
                flex: 1, padding: '10px', borderRadius: '10px',
                border: inputMode === 'photo_capture' ? '2px solid #38bdf8' : '1px solid #334155',
                background: inputMode === 'photo_capture' ? 'rgba(56,189,248,0.15)' : '#1e293b',
                color: inputMode === 'photo_capture' ? '#38bdf8' : '#94a3b8',
                fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
              }}
            >
              📷 Standard Camera / Photo Evidence
            </button>
          </div>

          {/* 1A. AI Vision Scanner */}
          {inputMode === 'ai_scan' && (
            <div style={{ marginBottom: '20px' }}>
              <AiVisionScanner onScanComplete={handleAiScanComplete} />
            </div>
          )}

          {/* 1B. Standard Photo Capture */}
          {inputMode === 'photo_capture' && (
            <div style={{ background: '#1e293b', padding: '16px', borderRadius: '12px', marginBottom: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '8px' }}>
                Capture or Upload Site Photo (Stored locally if offline):
              </div>
              <PhotoCapture
                onPhotoSelected={handleStandardPhotoSelected}
                preview={photoPreview}
                onRemovePhoto={handleRemovePhoto}
              />
            </div>
          )}

          {/* 2. Hazard Category Grid */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '8px' }}>
              Hazard Category:
            </label>
            <CategoryGrid selected={category} onSelect={setCategory} lang={lang} />
          </div>

          {/* 3. Description with Voice Dictation */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1' }}>
                Incident Details:
              </label>
              <button
                onClick={() => isListening ? stopListening() : startListening()}
                style={{
                  background: isListening ? '#ef4444' : 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid #3b82f650', color: isListening ? '#fff' : '#60a5fa',
                  borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer'
                }}
              >
                {isListening ? '🛑 Listening… Click to Stop' : '🎤 Speak / Voice Dictate'}
              </button>
            </div>
            <textarea
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe road blockage, mudflow severity, or stranded vehicles..."
              style={{
                width: '100%', padding: '12px', background: '#1e293b', border: '1px solid #334155',
                borderRadius: '8px', color: '#f8fafc', fontSize: '0.9rem', resize: 'vertical'
              }}
            />
          </div>

          {/* 4. GPS Location Status */}
          <div style={{ background: '#1e293b', padding: '12px 16px', borderRadius: '10px', marginBottom: '24px', fontSize: '0.8rem', color: '#94a3b8' }}>
            📍 GPS Coordinates: <strong style={{ color: '#f8fafc' }}>{coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'Auto-detecting GPS (11.5534, 76.1320)...'}</strong>
          </div>

          {/* Result Alert Box */}
          {success && (
            <div style={{
              background: isOnline ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
              border: `1px solid ${isOnline ? '#22c55e' : '#f59e0b'}`,
              borderRadius: '10px', padding: '14px', marginBottom: '20px',
              color: isOnline ? '#86efac' : '#fde68a', fontSize: '0.9rem'
            }}>
              <div style={{ fontWeight: 800, marginBottom: '4px' }}>
                {isOnline ? '✅ Cloud Sync Acknowledged' : '📦 Stored in Local Offline Queue'}
              </div>
              <div>{successMessage}</div>
              <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    setSuccess(false);
                    setDescription('');
                    setCapturedPhoto(null);
                    setPhotoPreview(null);
                  }}
                  style={{
                    background: '#1e293b', color: '#fff', border: '1px solid #475569',
                    borderRadius: '6px', padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer'
                  }}
                >
                  Submit Another Report
                </button>
                <button
                  onClick={() => navigate('/citizen')}
                  style={{
                    background: '#2563eb', color: '#fff', border: 'none',
                    borderRadius: '6px', padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer'
                  }}
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          )}

          {/* Submit Button */}
          {!success && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                width: '100%', padding: '14px',
                background: !isOnline
                  ? 'linear-gradient(135deg, #d97706, #b45309)'
                  : 'linear-gradient(135deg, #16a34a, #15803d)',
                color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: 800,
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: !isOnline ? '0 4px 16px rgba(217, 119, 6, 0.4)' : '0 4px 16px rgba(22, 163, 74, 0.4)'
              }}
            >
              {submitting
                ? 'Saving Record…'
                : !isOnline
                ? '📦 Save Offline Report & Photo (Pending Sync)'
                : '🚀 Submit Incident Report'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportFormPage;
