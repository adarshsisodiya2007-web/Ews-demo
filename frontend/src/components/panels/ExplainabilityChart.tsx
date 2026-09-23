import React, { useEffect, useState } from 'react';
import { ContributingFactors, Severity, ShapContribution } from '../../types';
import { t } from '../../i18n';

interface Props {
  factors?: ContributingFactors;
  shapContributions?: ShapContribution[];
  severity: Severity;
  lang?: string;
  modelVersion?: string;
}

export const ExplainabilityChart: React.FC<Props> = ({
  factors,
  shapContributions,
  severity,
  lang = 'en',
  modelVersion = 'XGBoost v1.0.0 (SHAP TreeExplainer)'
}) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const getTargetColor = () => {
    switch (severity) {
      case 'LOW': return 'var(--color-risk-low, #22c55e)';
      case 'MODERATE': return 'var(--color-risk-moderate, #eab308)';
      case 'HIGH': return 'var(--color-risk-high, #f97316)';
      case 'CRITICAL': return 'var(--color-risk-critical, #ef4444)';
    }
  };

  // If real SHAP attributions are passed from the trained XGBoost model
  if (shapContributions && shapContributions.length > 0) {
    const maxShap = Math.max(...shapContributions.map(c => Math.abs(c.shap_value)), 0.05);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
            Explainable AI (SHAP Attributions)
          </span>
          <span style={{
            fontSize: '0.68rem',
            background: 'rgba(56, 189, 248, 0.15)',
            color: '#38bdf8',
            padding: '2px 8px',
            borderRadius: '999px',
            fontWeight: 800,
            border: '1px solid rgba(56, 189, 248, 0.3)'
          }}>
            {modelVersion}
          </span>
        </div>

        {shapContributions.map((item, idx) => {
          const isPositive = item.shap_value >= 0;
          const absVal = Math.abs(item.shap_value);
          const barPct = Math.min(100, Math.round((absVal / maxShap) * 100));

          const barColor = item.impact === 'HIGH_RISK_DRIVER'
            ? 'linear-gradient(90deg, #f97316, #ef4444)'
            : item.impact === 'MODERATE_RISK_DRIVER'
            ? 'linear-gradient(90deg, #eab308, #f97316)'
            : item.impact === 'PROTECTIVE_FACTOR'
            ? 'linear-gradient(90deg, #06b6d4, #22c55e)'
            : 'linear-gradient(90deg, #64748b, #94a3b8)';

          return (
            <div key={idx} style={{
              background: 'rgba(15, 23, 42, 0.65)',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(51, 65, 85, 0.5)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
                  {item.feature.replace(/_/g, ' ').toUpperCase()}
                </span>
                <span className="mono" style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: isPositive ? '#f87171' : '#4ade80'
                }}>
                  {isPositive ? `+${item.shap_value.toFixed(3)}` : item.shap_value.toFixed(3)} SHAP
                </span>
              </div>

              {/* Bar */}
              <div style={{
                height: '7px',
                background: 'rgba(30, 41, 59, 0.9)',
                borderRadius: '4px',
                overflow: 'hidden',
                margin: '4px 0 6px 0'
              }}>
                <div style={{
                  height: '100%',
                  width: mounted ? `${barPct}%` : '0%',
                  background: barColor,
                  borderRadius: '4px',
                  transition: 'width 600ms cubic-bezier(0.4, 0, 0.2, 1)'
                }} />
              </div>

              <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.3 }}>
                {item.explanation}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback to factors if shapContributions not provided
  if (!factors) return null;

  const list = [
    { key: 'rainfall', label: t('factor.rainfall', lang), score: factors.rainfall?.contribution ?? 0 },
    { key: 'soilMoisture', label: t('factor.soilMoisture', lang), score: factors.soilMoisture?.contribution ?? 0 },
    { key: 'slope', label: t('factor.slope', lang), score: factors.slope?.contribution ?? 0 },
    { key: 'history', label: t('factor.history', lang), score: factors.history?.contribution ?? 0 },
    { key: 'citizenReports', label: t('factor.citizenReports', lang), score: factors.citizenReports?.contribution ?? 0 }
  ].sort((a, b) => b.score - a.score);

  const max = Math.max(...list.map(l => l.score), 0.01);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
        Contributing Factors Breakdown
      </div>
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
