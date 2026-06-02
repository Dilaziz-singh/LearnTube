import React from 'react';
import { Flame } from 'lucide-react';

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
}

export const StreakDisplay: React.FC<StreakDisplayProps> = ({
  currentStreak,
  longestStreak,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-4">
      <div className="flex items-center gap-2">
        <Flame
          size={28}
          strokeWidth={1.8}
          className={currentStreak > 0 ? 'animate-pulse-soft' : ''}
          style={{
            color:
              currentStreak > 0
                ? 'rgba(255,255,255,0.8)'
                : 'rgba(255,255,255,0.2)',
            transition: 'color 300ms ease',
          }}
        />
        <span
          className="animate-fade-in"
          style={{
            fontSize: '36px',
            fontWeight: 700,
            color: '#fafafa',
            lineHeight: 1,
            letterSpacing: '-0.03em',
          }}
        >
          {currentStreak}
        </span>
      </div>

      <span
        style={{
          fontSize: '13px',
          color: '#71717a',
          marginTop: '6px',
          fontWeight: 400,
        }}
      >
        day streak
      </span>

      <span
        style={{
          fontSize: '11px',
          color: '#52525b',
          marginTop: '8px',
          fontWeight: 400,
        }}
      >
        Best: {longestStreak} days
      </span>
    </div>
  );
};
