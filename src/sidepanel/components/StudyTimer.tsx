import React from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface StudyTimerProps {
  seconds: number;
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

const formatTime = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
};

export const StudyTimer: React.FC<StudyTimerProps> = ({
  seconds,
  isRunning,
  onStart,
  onPause,
  onReset,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-6">
      {/* Time display */}
      <div className="flex items-center gap-2">
        <span
          style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: '48px',
            fontWeight: 300,
            color: '#fafafa',
            letterSpacing: '0.04em',
            lineHeight: 1,
            textShadow: isRunning
              ? '0 0 40px rgba(255,255,255,0.15)'
              : 'none',
            transition: 'text-shadow 300ms ease',
          }}
        >
          {formatTime(seconds)}
        </span>

        {/* Running indicator dot */}
        {isRunning && (
          <div
            className="animate-pulse-soft"
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.8)',
              marginLeft: '4px',
              marginBottom: '16px',
            }}
          />
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mt-8">
        {/* Reset button */}
        <button
          onClick={onReset}
          className="flex items-center justify-center border-none"
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer',
            transition: 'all 200ms ease',
            color: '#71717a',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.color = '#fafafa';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
            e.currentTarget.style.color = '#71717a';
          }}
        >
          <RotateCcw size={18} strokeWidth={1.8} />
        </button>

        {/* Play / Pause button */}
        <button
          onClick={isRunning ? onPause : onStart}
          className="flex items-center justify-center border-none"
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: isRunning
              ? 'rgba(255,255,255,0.12)'
              : 'rgba(255,255,255,0.9)',
            border: '1px solid rgba(255,255,255,0.15)',
            cursor: 'pointer',
            transition: 'all 200ms ease',
            color: isRunning ? '#fafafa' : '#09090b',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {isRunning ? (
            <Pause size={22} strokeWidth={2} />
          ) : (
            <Play size={22} strokeWidth={2} style={{ marginLeft: '2px' }} />
          )}
        </button>

        {/* Spacer for visual balance */}
        <div style={{ width: '44px', height: '44px' }} />
      </div>
    </div>
  );
};
