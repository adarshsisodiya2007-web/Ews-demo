import React from 'react';
import { Severity } from '../../types';

interface Props { severity: Severity; size?: number; }

export const SeverityIcon: React.FC<Props> = ({ severity, size = 16 }) => {
  let char = '●';
  let className = '';
  
  if (severity === 'LOW') char = '●';
  else if (severity === 'MODERATE') char = '◆';
  else if (severity === 'HIGH') char = '▲';
  else if (severity === 'CRITICAL') { char = '✦'; className = 'critical-pulse'; }

  return (
    <span 
      className={`sev-${severity.toLowerCase()} ${className}`} 
      style={{ fontSize: size, lineHeight: 1 }}
    >
      {char}
    </span>
  );
};
