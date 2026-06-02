import React from 'react';

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 120,
  strokeWidth = 6,
  label,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const offset = circumference - (clampedProgress / 100) * circumference;
  const center = size / 2;

  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ width: size, height: size, position: 'relative' }}
    >
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.85)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 600ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </svg>

      {/* Center label */}
      <div
        className="absolute flex flex-col items-center justify-center"
        style={{
          top: 0,
          left: 0,
          width: size,
          height: size,
        }}
      >
        <span
          style={{
            fontSize: size * 0.22,
            fontWeight: 600,
            color: '#fafafa',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          {Math.round(clampedProgress)}%
        </span>
        {label && (
          <span
            style={{
              fontSize: size * 0.09,
              color: '#52525b',
              marginTop: '2px',
              fontWeight: 500,
            }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
};
