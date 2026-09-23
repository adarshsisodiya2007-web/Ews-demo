import React, { useState } from 'react';
import { SimulationResult } from '../../types';
import { simulateRisk } from '../../services/api';

interface Props {
  baselineLat?: number;
  baselineLon?: number;
  baselineSlope?: number;
  baselineRain24h?: number;
  baselineMoisture?: number;
}

export const SimulationWorkbench: React.FC<Props> = ({
  baselineLat = 11.5513,
  baselineLon = 76.1264,
  baselineSlope = 38.5,
  baselineRain24h = 45.0,
  baselineMoisture = 0.40
}) => {
  const [simSlope, setSimSlope] = useState<number>(baselineSlope);
  const [simRain, setSimRain] = useState<number>(160.0);
  const [simMoisture, setSimMoisture] = useState<number>(0.85);

  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleRunSimulation = async () => {
    setLoading(true);
    try {
      const res = await simulateRisk({
        baseline_lat: baselineLat,
        baseline_lon: baselineLon,
        baseline_slope: baselineSlope,
        baseline_rain_24h: baselineRain24h,
        baseline_soil_moisture: baselineMoisture,
        simulated_slope: simSlope,
        simulated_rain_24h: simRain,
        simulated_soil_moisture: simMoisture
      });
      setSimResult(res);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.4), rgba(15, 23, 42, 0.9))',
      borderRadius: '16px',
      border: '1px solid #6366f1',
      padding: '18px',
      marginTop: '16px',
      boxShadow: '0 8px 30px rgba(99, 102, 241, 0.15)'
    }}>
      {/* Banner Disclaimer */}
      <div style={{
        background: 'rgba(239, 68, 68, 0.15)',
        border: '1px solid #ef4444',
        borderRadius: '8px',
        padding: '6px 12px',
        marginBottom: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: '#f87171',
        fontSize: '0.78rem',
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        <span>⚠️</span> SIMULATION MODE — NOT A LIVE PREDICTION
      </div>

      <div style={{ marginBottom: '14px' }}>
        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🧪</span> Environmental Parameter Simulation Workbench
        </h4>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.76rem', color: '#94a3b8' }}>
          Simulate weather escalation or engineering slope changes and evaluate instantaneous XGBoost response.
        </p>
      </div>

      {/* Sliders Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
        {/* Rainfall Slider */}
        <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '12px', borderRadius: '10px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '6px' }}>
            <span>Simulated 24h Rain:</span>
            <span className="mono" style={{ color: '#38bdf8' }}>{simRain} mm</span>
          </div>
          <input
            type="range"
            min="0"
            max="350"
            step="5"
            value={simRain}
            onChange={e => setSimRain(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#38bdf8' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#64748b', marginTop: '2px' }}>
            <span>0 mm</span>
            <span>150 mm (Threshold)</span>
            <span>350 mm</span>
          </div>
        </div>

        {/* Soil Moisture Slider */}
        <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '12px', borderRadius: '10px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '6px' }}>
            <span>Soil Saturation:</span>
            <span className="mono" style={{ color: '#a855f7' }}>{Math.round(simMoisture * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.10"
            max="1.00"
            step="0.05"
            value={simMoisture}
            onChange={e => setSimMoisture(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#a855f7' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#64748b', marginTop: '2px' }}>
            <span>10% (Dry)</span>
            <span>60% (Saturation)</span>
            <span>100%</span>
          </div>
        </div>

        {/* Slope Angle Slider */}
        <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '12px', borderRadius: '10px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '6px' }}>
            <span>Terrain Slope:</span>
            <span className="mono" style={{ color: '#f59e0b' }}>{simSlope}°</span>
          </div>
          <input
            type="range"
            min="5"
            max="60"
            step="1"
            value={simSlope}
            onChange={e => setSimSlope(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#f59e0b' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#64748b', marginTop: '2px' }}>
            <span>5° (Gentle)</span>
            <span>35° (Critical)</span>
            <span>60° (Cliff)</span>
          </div>
        </div>
      </div>

      <button
        onClick={handleRunSimulation}
        disabled={loading}
        style={{
          background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
          color: '#ffffff',
          border: 'none',
          borderRadius: '10px',
          padding: '10px 20px',
          fontSize: '0.84rem',
          fontWeight: 800,
          cursor: 'pointer',
          width: '100%',
          boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
        }}
      >
        {loading ? 'Evaluating Model…' : '⚡ Run Simulation Inference'}
      </button>

      {/* Simulation Result Comparison Card */}
      {simResult && (
        <div style={{
          marginTop: '16px',
          padding: '14px',
          background: 'rgba(2, 6, 23, 0.7)',
          borderRadius: '12px',
          border: '1px solid #4338ca'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase' }}>
              Simulation Outcome Comparison
            </span>
            <span style={{
              background: simResult.risk_delta > 0 ? '#ef4444' : '#22c55e',
              color: '#fff',
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '999px'
            }}>
              {simResult.risk_delta > 0 ? `+${Math.round(simResult.risk_delta * 100)}% Risk Increase` : `${Math.round(simResult.risk_delta * 100)}% Risk Change`}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            {/* Baseline */}
            <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '10px', borderRadius: '8px', border: '1px solid #334155' }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Baseline Risk</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#f8fafc', margin: '2px 0' }}>
                {Math.round(simResult.baseline.risk_score * 100)}%
              </div>
              <div style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>
                Rain: {simResult.baseline.rain_24h_mm}mm · Sat: {Math.round(simResult.baseline.soil_moisture * 100)}%
              </div>
            </div>

            {/* Simulated */}
            <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '10px', borderRadius: '8px', border: '1px solid #4f46e5' }}>
              <div style={{ fontSize: '0.72rem', color: '#a5b4fc' }}>Simulated Risk</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: simResult.simulated.risk_score >= 0.7 ? '#f87171' : '#f59e0b', margin: '2px 0' }}>
                {Math.round(simResult.simulated.risk_score * 100)}%
              </div>
              <div style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>
                Rain: {simResult.simulated.rain_24h_mm}mm · Sat: {Math.round(simResult.simulated.soil_moisture * 100)}%
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.74rem', color: '#e2e8f0', background: 'rgba(15, 23, 42, 0.5)', padding: '8px', borderRadius: '6px' }}>
            <strong>Action Protocol:</strong> {simResult.simulated.action_protocol}
          </div>
        </div>
      )}
    </div>
  );
};
