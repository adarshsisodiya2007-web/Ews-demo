import React, { useEffect, useState } from 'react';
import { ContributingFactors, Severity } from '../../types';
import { t } from '../../i18n';

interface Props {
  factors: ContributingFactors;
  severity: Severity;
  lang?: string;
}

export const ExplainabilityChart: React.FC<Props> = ({ factors, severity, lang = 'en' }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const getTargetColor = () => {
    switch (severity) {
      case 'LOW': return 'var(--color-risk-low)';
      case 'MODERATE': return 'var(--color-risk-moderate)';
      case 'HIGH': return 'var(--color-risk-high)';
      case 'CRITICAL': return 'var(--color-risk-critical)';
    }
  };

  const list = [
    { key: 'rainfall', label: t('factor.rainfall', lang), score: factors.rainfall.contribution },
    { key: 'soilMoisture', label: t('factor.soilMoisture', lang), score: factors.soilMoisture.contribution },
    { key: 'slope', label: t('factor.slope', lang), score: factors.slope.contribution },
    { key: 'history', label: t('factor.history', lang), score: factors.history.contribution },
    { key: 'citizenReports', label: t('factor.citizenReports', lang), score: factors.citizenReports.contribution }
  ].sort((a, b) => b.score - a.score);

  const max = Math.max(...list.map(l => l.score), 0.01);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {list.map(f => {
        const pct = (f.score / max) * 100;
        return (
          <div key={f.key} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '100px', fontSize: 'var(--text-sm)', color: 'var(--color-base-100)' }}>{f.label}</div>
            <div style={{ flex: 1, height: '8px', background: 'var(--color-base-600)', borderRadius: '4px', overflow: 'hidden', margin: '0 12px' }}>
              <div style={{
                height: '100%',
                width: mounted ? `${pct}%` : '0%',
                background: `linear-gradient(90deg, var(--color-accent) 0%, ${getTargetColor()} 100%)`,
                transition: 'width 600ms ease-out'
              }} />
            </div>
            <div className="mono" style={{ width: '40px', textAlign: 'right', fontSize: 'var(--text-xs)' }}>
              {Math.round(f.score * 100)}%
            </div>
          </div>
        );
      })}
    </div>
  );
};
