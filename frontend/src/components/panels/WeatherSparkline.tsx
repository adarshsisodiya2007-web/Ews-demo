import React from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { SensorReading } from '../../types';

interface Props { readings: SensorReading[]; }

export const WeatherSparkline: React.FC<Props> = ({ readings }) => {
  if (!readings || readings.length === 0) {
    return <div style={{ height: '80px', color: 'var(--color-base-400)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No data</div>;
  }

  return (
    <div style={{ height: '80px', width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={readings}>
          <Tooltip 
            contentStyle={{ background: 'var(--color-base-700)', border: 'none', borderRadius: 'var(--radius-sm)' }}
            labelStyle={{ display: 'none' }}
            itemStyle={{ color: 'var(--color-base-000)' }}
            formatter={(val: number) => [`${val} mm`, 'Rainfall']}
          />
          <Area 
            type="monotone" 
            dataKey="rainfallMm24h" 
            stroke="var(--color-accent)" 
            fill="var(--color-accent)" 
            fillOpacity={0.2} 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
