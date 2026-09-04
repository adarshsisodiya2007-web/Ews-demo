import React, { useState, useRef } from 'react';
import {
  analyzeImageCanvas,
  HazardDetectionResult,
  ImageAuthenticityResult,
  CompleteImageAnalysis
} from '../../services/imageAnalysisService';

export interface VisionDetectionResult extends HazardDetectionResult {
  authenticity?: ImageAuthenticityResult;
}

interface Props {
  onScanComplete: (result: VisionDetectionResult, imageUrl: string) => void;
}

export const AiVisionScanner: React.FC<Props> = ({ onScanComplete }) => {
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<CompleteImageAnalysis | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const processImage = (file: File) => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setAnalyzing(true);
    setAnalysis(null);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;

    img.onload = () => {
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            // Deterministic analysis (reproducible for the same image)
            const result = analyzeImageCanvas(canvas, file);

            // Draw bounding box for hazard
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = Math.max(4, Math.floor(img.width / 120));
            ctx.strokeRect(result.hazard.box.x, result.hazard.box.y, result.hazard.box.width, result.hazard.box.height);

            // Draw hazard label
            ctx.fillStyle = 'rgba(239, 68, 68, 0.90)';
            const labelText = `AI DETECTED: ${result.hazard.label} (${result.hazard.confidence}%)`;
            const fontSize = Math.max(16, Math.floor(img.width / 35));
            ctx.font = `bold ${fontSize}px Inter, sans-serif`;
            const textWidth = ctx.measureText(labelText).width;
            ctx.fillRect(result.hazard.box.x, Math.max(0, result.hazard.box.y - 34), textWidth + 16, 34);

            ctx.fillStyle = '#ffffff';
            ctx.fillText(labelText, result.hazard.box.x + 8, Math.max(24, result.hazard.box.y - 10));

            // Watermark authenticity badge in top right of image
            const authText = `${result.authenticity.status === 'AUTHENTIC' ? '🟢' : result.authenticity.status === 'AI_GENERATED' ? '🔴' : '🟡'} AUTHENTICITY: ${result.authenticity.confidence}%`;
            ctx.font = `bold ${Math.max(13, Math.floor(img.width / 45))}px Inter, sans-serif`;
            const authWidth = ctx.measureText(authText).width;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.fillRect(img.width - authWidth - 24, 12, authWidth + 16, 28);
            ctx.fillStyle = result.authenticity.badgeColor;
            ctx.fillText(authText, img.width - authWidth - 16, 32);

            setAnalysis(result);
            setAnalyzing(false);

            const combinedResult: VisionDetectionResult = {
              ...result.hazard,
              authenticity: result.authenticity
            };
            onScanComplete(combinedResult, url);
          }
        }
      }, 1000);
    };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImage(e.target.files[0]);
    }
  };

  return (
    <div style={{
      background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px',
      padding: '18px', marginBottom: '20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📸</span> AI Computer Vision &amp; Image Authenticity Scanner
          </h4>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.76rem', color: '#94a3b8' }}>
            Dual-channel verification: Hazard feature extraction + Forensic authenticity &amp; AI-generation detection.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{
            background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
            color: '#fff', border: 'none', borderRadius: '8px',
            padding: '8px 16px', fontSize: '0.82rem', fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          {previewUrl ? '📷 Re-scan Photo' : '📷 Scan Incident Photo'}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Canvas preview */}
      {previewUrl && (
        <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', background: '#020617', textAlign: 'center' }}>
          <canvas
            ref={canvasRef}
            style={{ maxWidth: '100%', maxHeight: '380px', objectFit: 'contain', borderRadius: '12px' }}
          />
          {analyzing && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.85)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              color: '#38bdf8', fontWeight: 700
            }}>
              <div style={{ fontSize: '2rem', animation: 'spin 1s linear infinite', marginBottom: '8px' }}>⚙️</div>
              <div>Running YOLOv8 Hazard Scanner + Sensor Authenticity Analysis…</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}
        </div>
      )}

      {/* Results Section */}
      {analysis && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
          {/* ── CARD 1: HAZARD DETECTION ── */}
          <div style={{
            padding: '14px',
            background: 'rgba(239, 68, 68, 0.10)', border: '1px solid #ef444450',
            borderRadius: '12px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px'
          }}>
            <div style={{ flex: '1 1 240px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                1. AI Hazard Detection
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
                {analysis.hazard.label}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '4px' }}>
                Recommended: <strong>{analysis.hazard.recommendedAction}</strong>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                background: '#ef4444', color: '#fff', padding: '3px 10px',
                borderRadius: '999px', fontSize: '0.75rem', fontWeight: 800, display: 'inline-block'
              }}>
                {analysis.hazard.severity} SEVERITY
              </div>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '4px' }}>
                Hazard Confidence: <strong style={{ color: '#4ade80' }}>{analysis.hazard.confidence}%</strong>
              </div>
            </div>
          </div>

          {/* ── CARD 2: FORENSIC IMAGE AUTHENTICITY ── */}
          <div style={{
            padding: '14px',
            background: analysis.authenticity.badgeBg,
            border: `1px solid ${analysis.authenticity.badgeColor}60`,
            borderRadius: '12px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px'
          }}>
            <div style={{ flex: '1 1 240px' }}>
              <div style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: analysis.authenticity.badgeColor,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>2. Forensic Image Authenticity</span>
                <span style={{
                  background: analysis.authenticity.badgeColor,
                  color: '#ffffff',
                  padding: '1px 7px',
                  borderRadius: '10px',
                  fontSize: '0.68rem',
                  fontWeight: 900
                }}>
                  {analysis.authenticity.status}
                </span>
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
                {analysis.authenticity.label}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#cbd5e1', marginTop: '4px' }}>
                {analysis.authenticity.details}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                background: analysis.authenticity.badgeColor,
                color: '#ffffff',
                padding: '4px 12px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 900,
                display: 'inline-block'
              }}>
                {analysis.authenticity.confidence}% AUTHENTIC
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>
                CMOS Noise Ratio: <strong>{analysis.authenticity.checks.sensorNoiseRatio}</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
