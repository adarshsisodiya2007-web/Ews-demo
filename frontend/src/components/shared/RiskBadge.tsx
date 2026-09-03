import React from 'react';
import { Severity } from '../../types';
import { SeverityIcon } from './SeverityIcon';
import { t } from '../../i18n';

interface Props { severity: Severity; score?: number; lang?: string; }

export const RiskBadge: React.FC<Props> = ({ severity, score, lang = 'en' }) => {
  const getStyle = () => {
    switch (severity) {
      case 'LOW': return { bg: 'rgba(74, 124, 89, 0.2)', border: 'var(--color-risk-low)', color: 'var(--color-risk-low)' };
      case 'MODERATE': return { bg: 'rgba(196, 135, 58, 0.2)', border: 'var(--color-risk-moderate)', color: 'var(--color-risk-moderate)' };
      case 'HIGH': return { bg: 'rgba(184, 74, 57, 0.2)', border: 'var(--color-risk-high)', color: 'var(--color-risk-high)' };
      case 'CRITICAL': return { bg: 'rgba(139, 35, 21, 0.2)', border: 'var(--color-risk-critical)', color: 'var(--color-risk-critical)' };
    }
  };
  
  const style = getStyle();

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      background: style.bg, border: `1px solid ${style.border}`, color: style.color,
      padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-sm)'
    }}>
      <SeverityIcon severity={severity} size={12} />
      <span style={{ fontWeight: 600 }}>{t(`severity.${severity}`, lang)}</span>
      {score !== undefined && <span className="mono" style={{ marginLeft: '4px' }}>· {score}</span>}
    </div>
  );
};
