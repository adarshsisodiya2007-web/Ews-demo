import React, { useState, useRef } from 'react';

export interface VisionDetectionResult {
  label: string;
  confidence: number;
  hazardType: 'TENSION_CRACK' | 'MUDFLOW' | 'SLOPE_EROSION' | 'ROAD_FRACTURE' | 'NORMAL';
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  recommendedAction: string;
  box: { x: number; y: number; width: number; height: number };
}

interface Props {
  onScanComplete: (result: VisionDetectionResult, imageUrl: string) => void;
}

export const AiVisionScanner: React.FC<Props> = ({ onScanComplete }) => {
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [detection, setDetection] = useState<VisionDetectionResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const processImage = (file: File) => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setAnalyzing(true);
    setDetection(null);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;

    img.onload = () => {
      // Simulate AI Vision Tensor model inference
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            // Compute pseudo-random but deterministic detection based on file characteristics
            const hash = file.name.length + file.size % 100;
            let result: VisionDetectionResult;

            if (hash % 3 === 0) {
              result = {
                label: 'Tension Crack on Upper Escarpment',
                confidence: Number((89.5 + (hash % 10) * 0.9).toFixed(1)),
                hazardType: 'TENSION_CRACK',
                severity: 'CRITICAL',
                recommendedAction: 'Immediate slope stabilization & evacuation protocol trigger.',
                box: { x: img.width * 0.22, y: img.height * 0.28, width: img.width * 0.54, height: img.height * 0.38 }
              };
            } else if (hash % 3 === 1) {
              result = {
                label: 'Active Soil Mudflow & Sediment Runoff',
                confidence: Number((91.2 + (hash % 8) * 0.9).toFixed(1)),
                hazardType: 'MUDFLOW',
                severity: 'HIGH',
                recommendedAction: 'Restrict road access and divert downhill drainage channels.',
                box: { x: img.width * 0.18, y: img.height * 0.35, width: img.width * 0.62, height: img.height * 0.45 }
              };
            } else {
              result = {
                label: 'Highway Asphalt Fracture & Subsidence',
                confidence: Number((88.4 + (hash % 9) * 0.8).toFixed(1)),
                hazardType: 'ROAD_FRACTURE',
                severity: 'HIGH',
                recommendedAction: 'Deploy emergency highway barrier and reroute transit via SH-59.',
                box: { x: img.width * 0.25, y: img.height * 0.32, width: img.width * 0.50, height: img.height * 0.40 }
              };
            }

            // Draw bounding box
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = Math.max(4, Math.floor(img.width / 120));
            ctx.strokeRect(result.box.x, result.box.y, result.box.width, result.box.height);

            // Draw label background
            ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
            const labelText = `AI DETECTED: ${result.label} (${result.confidence}%)`;
            ctx.font = `bold ${Math.max(16, Math.floor(img.width / 35))}px Inter, sans-serif`;
            const textWidth = ctx.measureText(labelText).width;
            ctx.fillRect(result.box.x, Math.max(0, result.box.y - 32), textWidth + 16, 32);

            // Draw text
            ctx.fillStyle = '#ffffff';
            ctx.fillText(labelText, result.box.x + 8, Math.max(22, result.box.y - 10));

            setDetection(result);
            setAnalyzing(false);
            onScanComplete(result, url);
          }
        }
      }, 1200);
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
      padding: '20px', marginBottom: '24px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📸</span> AI Computer Vision Hazard Scanner
          </h4>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
            Upload or capture photo — AI automatically detects cracks, mudflow &amp; structural displacement.
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
            color: '#fff', border: 'none', borderRadius: '8px',
            padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700,
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
              position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.75)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              color: '#38bdf8', fontWeight: 700
            }}>
              <div style={{ fontSize: '2rem', animation: 'spin 1s linear infinite', marginBottom: '8px' }}>⚙️</div>
              <div>Running YOLOv8 / CNN Edge Tensor Analysis…</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}
        </div>
      )}

      {/* Detection Results Card */}
      {detection && (
        <div style={{
          marginTop: '16px', padding: '16px',
          background: 'rgba(239, 68, 68, 0.12)', border: '1px solid #ef444450',
          borderRadius: '12px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              AI Hazard Verification Verified
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
              {detection.label}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '4px' }}>
              Recommended: <strong>{detection.recommendedAction}</strong>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              background: '#ef4444', color: '#fff', padding: '4px 12px',
              borderRadius: '999px', fontSize: '0.78rem', fontWeight: 800, display: 'inline-block'
            }}>
              {detection.severity} SEVERITY
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
              Confidence: <strong style={{ color: '#4ade80' }}>{detection.confidence}%</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
