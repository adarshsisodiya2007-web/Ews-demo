import React from 'react';
import { ReportCategory } from '../../types';
import { t } from '../../i18n';

interface Props {
  selected: ReportCategory | null;
  onSelect: (cat: ReportCategory) => void;
  lang: string;
}

export const CategoryGrid: React.FC<Props> = ({ selected, onSelect, lang }) => {
  const categories: ReportCategory[] = ['CRACK', 'SLOPE_MOVEMENT', 'BLOCKED_ROAD', 'FLOODING'];

  const getIcon = (cat: ReportCategory) => {
    switch (cat) {
      case 'CRACK': return '⚠️'; // using emoji as simple fallback for svg
      case 'SLOPE_MOVEMENT': return '⛰️';
      case 'BLOCKED_ROAD': return '🚧';
      case 'FLOODING': return '🌊';
      default: return '❓';
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      {categories.map(cat => {
        const isSelected = selected === cat;
        return (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            style={{
              minHeight: '88px',
              background: isSelected ? 'var(--color-base-600)' : 'var(--color-citizen-card)',
              border: `1px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-base-400)'}`,
              borderRadius: 'var(--radius-md)',
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '24px' }}>{getIcon(cat)}</span>
            <span style={{ fontSize: '0.9rem' }}>{t(`report.category.${cat}`, lang)}</span>
          </button>
        );
      })}
    </div>
  );
};
