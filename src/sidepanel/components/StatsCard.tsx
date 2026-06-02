import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  icon: Icon,
  label,
  value,
  subtitle,
}) => {
  return (
    <div
      className="rounded-xl px-4 py-3.5"
      style={{
        backgroundColor: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        transition: 'background-color 150ms ease',
        cursor: 'default',
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)')
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)')
      }
    >
      <div className="flex items-center gap-1.5 pb-2">
        <Icon size={13} color="#52525b" strokeWidth={1.8} />
        <span
          style={{
            fontSize: '11px',
            fontWeight: 500,
            color: '#52525b',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {label}
        </span>
      </div>

      <p
        className="animate-fade-in"
        style={{
          fontSize: '24px',
          fontWeight: 600,
          color: '#fafafa',
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          margin: 0,
        }}
      >
        {value}
      </p>

      {subtitle && (
        <p
          style={{
            fontSize: '11px',
            color: '#52525b',
            marginTop: '4px',
            margin: '4px 0 0 0',
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
};
