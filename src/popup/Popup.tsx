import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Play,
  Clock,
  Flame,
  LayoutDashboard,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

interface PopupStats {
  videosWatched: number;
  studyTimeMinutes: number;
  currentStreak: number;
}

export const Popup: React.FC = () => {
  const [learnMode, setLearnMode] = useState(false);
  const [stats, setStats] = useState<PopupStats>({
    videosWatched: 0,
    studyTimeMinutes: 0,
    currentStreak: 0,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_LEARN_MODE' }, (response) => {
      if (response?.enabled !== undefined) {
        setLearnMode(response.enabled);
      }
    });

    chrome.runtime.sendMessage({ type: 'GET_TODAY_STATS' }, (response) => {
      if (response) {
        setStats({
          videosWatched: response.videosWatched ?? 0,
          studyTimeMinutes: response.studyTimeMinutes ?? 0,
          currentStreak: response.currentStreak ?? 0,
        });
      }
      setLoaded(true);
    });
  }, []);

  const handleToggleLearnMode = useCallback(() => {
    const next = !learnMode;
    setLearnMode(next);
    chrome.runtime.sendMessage({ type: 'SET_LEARN_MODE', enabled: next });
  }, [learnMode]);

  const handleOpenDashboard = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
  }, []);

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <div
      className="flex flex-col"
      style={{
        width: '380px',
        minHeight: '480px',
        backgroundColor: '#09090b',
        fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center rounded-lg"
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <BookOpen size={16} strokeWidth={2} color="#fafafa" />
          </div>
          <span
            className="font-semibold tracking-tight"
            style={{ fontSize: '17px', color: '#fafafa' }}
          >
            LearnTube
          </span>
        </div>
        <div
          className="rounded-full px-2 py-0.5"
          style={{
            fontSize: '10px',
            fontWeight: 500,
            color: '#52525b',
            backgroundColor: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
            letterSpacing: '0.02em',
          }}
        >
          {learnMode ? 'Active' : 'Off'}
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          height: '1px',
          backgroundColor: 'rgba(255,255,255,0.06)',
          marginLeft: '20px',
          marginRight: '20px',
        }}
      />

      {/* Learn Mode Toggle */}
      <div className="px-5 pt-5 pb-4">
        <button
          onClick={handleToggleLearnMode}
          className="flex w-full items-center justify-between rounded-xl px-4 py-3.5"
          style={{
            backgroundColor: learnMode
              ? 'rgba(255,255,255,0.07)'
              : 'rgba(255,255,255,0.03)',
            border: `1px solid ${learnMode ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
            cursor: 'pointer',
            transition: 'all 200ms ease',
          }}
        >
          <div className="flex items-center gap-3">
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#fafafa' }}>
              Learn Mode
            </span>
          </div>

          {/* Toggle switch */}
          <div
            className="relative rounded-full"
            style={{
              width: '44px',
              height: '24px',
              backgroundColor: learnMode
                ? 'rgba(255,255,255,0.85)'
                : 'rgba(255,255,255,0.1)',
              transition: 'background-color 200ms ease',
            }}
          >
            <div
              className="absolute rounded-full"
              style={{
                width: '18px',
                height: '18px',
                top: '3px',
                left: learnMode ? '23px' : '3px',
                backgroundColor: learnMode ? '#09090b' : 'rgba(255,255,255,0.4)',
                transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}
            />
          </div>
        </button>
      </div>

      {/* Today's Stats */}
      <div className="px-5 pb-3">
        <p
          className="pb-2.5"
          style={{
            fontSize: '11px',
            fontWeight: 500,
            color: '#52525b',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Today
        </p>
        <div className="grid grid-cols-2 gap-3">
          {/* Videos stat */}
          <div
            className="rounded-xl px-4 py-3.5"
            style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              transition: 'background-color 150ms ease',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)')
            }
          >
            <div className="flex items-center gap-1.5 pb-2">
              <Play size={12} color="#52525b" />
              <span style={{ fontSize: '11px', color: '#52525b', fontWeight: 500 }}>
                Videos
              </span>
            </div>
            <p
              className={loaded ? 'animate-fade-in' : ''}
              style={{
                fontSize: '28px',
                fontWeight: 600,
                color: '#fafafa',
                lineHeight: 1,
                letterSpacing: '-0.02em',
              }}
            >
              {stats.videosWatched}
            </p>
          </div>

          {/* Study time stat */}
          <div
            className="rounded-xl px-4 py-3.5"
            style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              transition: 'background-color 150ms ease',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)')
            }
          >
            <div className="flex items-center gap-1.5 pb-2">
              <Clock size={12} color="#52525b" />
              <span style={{ fontSize: '11px', color: '#52525b', fontWeight: 500 }}>
                Studied
              </span>
            </div>
            <p
              className={loaded ? 'animate-fade-in' : ''}
              style={{
                fontSize: '28px',
                fontWeight: 600,
                color: '#fafafa',
                lineHeight: 1,
                letterSpacing: '-0.02em',
              }}
            >
              {formatTime(stats.studyTimeMinutes)}
            </p>
          </div>
        </div>
      </div>

      {/* Streak */}
      <div className="px-5 pb-4">
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3.5"
          style={{
            backgroundColor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <Flame
            size={20}
            className={stats.currentStreak > 0 ? 'animate-pulse-soft' : ''}
            style={{
              color: stats.currentStreak > 0 ? 'rgba(255,255,255,0.8)' : '#52525b',
            }}
          />
          <div className="flex items-baseline gap-1.5">
            <span
              className={loaded ? 'animate-fade-in' : ''}
              style={{
                fontSize: '22px',
                fontWeight: 600,
                color: '#fafafa',
                letterSpacing: '-0.02em',
              }}
            >
              {stats.currentStreak}
            </span>
            <span style={{ fontSize: '13px', color: '#71717a' }}>day streak</span>
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Open Dashboard */}
      <div className="px-5 pb-4">
        <button
          onClick={handleOpenDashboard}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3"
          style={{
            backgroundColor: 'transparent',
            border: '1px solid rgba(255,255,255,0.12)',
            cursor: 'pointer',
            transition: 'all 150ms ease',
            fontSize: '13px',
            fontWeight: 500,
            color: '#fafafa',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
          }}
        >
          <LayoutDashboard size={15} />
          <span>Open Dashboard</span>
        </button>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-center pb-4"
        style={{ fontSize: '10px', color: '#3f3f46' }}
      >
        LearnTube v1.0.0
      </div>
    </div>
  );
};
