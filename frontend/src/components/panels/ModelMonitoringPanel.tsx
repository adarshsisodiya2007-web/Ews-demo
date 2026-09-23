import React, { useEffect, useState } from 'react';
import { ModelInfo } from '../../types';
import { fetchModelInfo } from '../../services/api';

export const ModelMonitoringPanel: React.FC = () => {
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchModelInfo()
      .then(res => {
        setModelInfo(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ padding: '16px', color: '#94a3b8' }}>Loading model monitoring metrics…</div>;
  }

  if (!modelInfo) return null;

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.95)',
      borderRadius: '16px',
      border: '1px solid #1e293b',
      padding: '20px',
      marginTop: '16px',
      color: '#f8fafc'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🧠</span> ML Model Registry &amp; Continuous Monitoring
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.76rem', color: '#94a3b8' }}>
            Live performance benchmarking on held-out test data (20% split)
          </p>
        </div>
        <div style={{
          background: 'rgba(34, 197, 94, 0.15)',
          color: '#4ade80',
          border: '1px solid #22c55e',
          padding: '4px 12px',
          borderRadius: '999px',
          fontSize: '0.74rem',
          fontWeight: 800
        }}>
          ● Active: {modelInfo.model_name} ({modelInfo.version})
        </div>
      </div>

      {/* High level counters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '16px' }}>
        <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '12px', borderRadius: '10px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Total Dataset Samples</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f8fafc', marginTop: '2px' }}>
            {modelInfo.dataset_samples.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.65rem', color: '#64748b' }}>1,200 Train / 300 Test</div>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '12px', borderRadius: '10px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Features Evaluated</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#38bdf8', marginTop: '2px' }}>
            {modelInfo.features_count} Features
          </div>
          <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Topographic + Meteo</div>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '12px', borderRadius: '10px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Accuracy (Held-out)</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#4ade80', marginTop: '2px' }}>
            {(modelInfo.evaluation_metrics.accuracy * 100).toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.65rem', color: '#64748b' }}>F1: {modelInfo.evaluation_metrics.f1_score.toFixed(3)}</div>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '12px', borderRadius: '10px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>ROC-AUC / PR-AUC</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#a855f7', marginTop: '2px' }}>
            {modelInfo.evaluation_metrics.roc_auc.toFixed(3)}
          </div>
          <div style={{ fontSize: '0.65rem', color: '#64748b' }}>PR-AUC: {modelInfo.evaluation_metrics.pr_auc.toFixed(3)}</div>
        </div>
      </div>

      {/* Model Benchmark Comparison Table */}
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.84rem', fontWeight: 800, color: '#cbd5e1', textTransform: 'uppercase' }}>
          Rigorous Baseline Model Comparison
        </h4>
        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #334155' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(30, 41, 59, 0.9)', color: '#94a3b8' }}>
                <th style={{ padding: '8px 12px' }}>Model Candidate</th>
                <th style={{ padding: '8px 10px' }}>Accuracy</th>
                <th style={{ padding: '8px 10px' }}>Precision</th>
                <th style={{ padding: '8px 10px' }}>Recall</th>
                <th style={{ padding: '8px 10px' }}>F1-Score</th>
                <th style={{ padding: '8px 10px' }}>ROC-AUC</th>
                <th style={{ padding: '8px 10px' }}>PR-AUC</th>
              </tr>
            </thead>
            <tbody>
              {modelInfo.baseline_comparison.map((row, idx) => (
                <tr key={idx} style={{
                  background: row.Model.includes('XGBoost') ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                  borderTop: '1px solid #334155',
                  fontWeight: row.Model.includes('XGBoost') ? 700 : 400
                }}>
                  <td style={{ padding: '8px 12px', color: row.Model.includes('XGBoost') ? '#38bdf8' : '#f8fafc' }}>
                    {row.Model}
                  </td>
                  <td style={{ padding: '8px 10px' }}>{(row.Accuracy * 100).toFixed(1)}%</td>
                  <td style={{ padding: '8px 10px' }}>{(row.Precision * 100).toFixed(1)}%</td>
                  <td style={{ padding: '8px 10px' }}>{(row.Recall * 100).toFixed(1)}%</td>
                  <td style={{ padding: '8px 10px' }}>{row['F1-score'].toFixed(3)}</td>
                  <td style={{ padding: '8px 10px' }}>{row['ROC-AUC'].toFixed(3)}</td>
                  <td style={{ padding: '8px 10px' }}>{row['PR-AUC'].toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Retraining & Continuous Architecture Notice */}
      <div style={{
        background: 'rgba(2, 6, 23, 0.6)',
        borderRadius: '10px',
        padding: '12px 14px',
        border: '1px solid #334155',
        fontSize: '0.74rem',
        color: '#94a3b8',
        lineHeight: 1.4
      }}>
        <div style={{ fontWeight: 800, color: '#f8fafc', marginBottom: '4px' }}>
          🛡️ Continuous Model Retraining Pipeline Safeguards:
        </div>
        <div>
          Citizen reports undergo strict officer triage (<span style={{ color: '#eab308' }}>UNDER REVIEW</span> → <span style={{ color: '#4ade80' }}>VERIFIED</span>). Only verified field incidents with validated coordinates are appended to the benchmark retraining pool to prevent adversarial data poisoning.
        </div>
      </div>
    </div>
  );
};
