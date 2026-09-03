import React, { useRef } from 'react';

interface Props {
  onPhotoSelected: (file: File) => void;
  preview: string | null;
  onRemovePhoto: () => void;
}

export const PhotoCapture: React.FC<Props> = ({ onPhotoSelected, preview, onRemovePhoto }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onPhotoSelected(e.target.files[0]);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '24px 0' }}>
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        style={{ display: 'none' }} 
      />
      
      {preview ? (
        <div style={{ position: 'relative', width: '120px', height: '120px' }}>
          <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
          <button 
            onClick={onRemovePhoto} 
            style={{ position: 'absolute', top: -8, right: -8, background: 'var(--color-risk-critical)', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
      ) : (
        <button 
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'var(--color-accent)', color: '#fff', border: 'none',
            cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.8rem', boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}
        >
          <span style={{ fontSize: '24px', marginBottom: '4px' }}>📷</span>
        </button>
      )}
    </div>
  );
};
