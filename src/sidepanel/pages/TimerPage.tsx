import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Minus, Plus } from 'lucide-react';
import { StudyTimer } from '../components/StudyTimer';

interface Session {
  id: string;
  videoTitle: string;
  duration: number; // seconds
  startedAt: number;
}

const formatTime = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const formatSessionDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
};

export const TimerPage: React.FC = () => {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [dailyGoal, setDailyGoal] = useState(60); // minutes
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [sessions, setSessions] = useState<Session[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch initial timer state from background
  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_TIMER_STATE' }, (response) => {
      if (response) {
        setSeconds(response.seconds ?? 0);
        setIsRunning(response.isRunning ?? false);
        setDailyGoal(response.dailyGoalMinutes ?? 60);
        setTodayMinutes(response.todayMinutes ?? 0);
        setSessions(response.sessions ?? []);
      }
    });
  }, []);

  // Live tick when running
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const handleStart = useCallback(() => {
    setIsRunning(true);
    chrome.runtime.sendMessage({ type: 'TIMER_START' });
  }, []);

  const handlePause = useCallback(() => {
    setIsRunning(false);
    chrome.runtime.sendMessage({ type: 'TIMER_PAUSE', seconds });
  }, [seconds]);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setSeconds(0);
    chrome.runtime.sendMessage({ type: 'TIMER_RESET' });
  }, []);

  const handleGoalChange = useCallback(
    (delta: number) => {
      const newGoal = Math.max(15, Math.min(480, dailyGoal + delta));
      setDailyGoal(newGoal);
      chrome.runtime.sendMessage({
        type: 'SET_DAILY_GOAL',
        minutes: newGoal,
      });
    },
    [dailyGoal]
  );

  const totalTodayMinutes = todayMinutes + Math.floor(seconds / 60);
  const goalProgress =
    dailyGoal > 0
      ? Math.min(100, Math.round((totalTodayMinutes / dailyGoal) * 100))
      : 0;

  return (
    <div className="flex flex-col px-4 pt-5 pb-4 gap-5">
      {/* Header */}
      <div>
        <h1
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#fafafa',
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          Study Timer
        </h1>
      </div>

      {/* Timer */}
      <div
        className="rounded-xl"
        style={{
          backgroundColor: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <StudyTimer
          seconds={seconds}
          isRunning={isRunning}
          onStart={handleStart}
          onPause={handlePause}
          onReset={handleReset}
        />
      </div>

      {/* Daily goal progress */}
      <div
        className="rounded-xl px-4 py-3.5"
        style={{
          backgroundColor: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center justify-between mb-2.5">
          <span
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#71717a',
            }}
          >
            Daily Goal
          </span>
          <span
            style={{
              fontSize: '12px',
              color: '#fafafa',
              fontWeight: 500,
            }}
          >
            {formatTime(totalTodayMinutes)} / {formatTime(dailyGoal)}
          </span>
        </div>

        {/* Progress bar */}
        <div
          className="rounded-full overflow-hidden"
          style={{
            height: '4px',
            backgroundColor: 'rgba(255,255,255,0.06)',
            marginBottom: '12px',
          }}
        >
          <div
            className="rounded-full"
            style={{
              height: '100%',
              width: `${goalProgress}%`,
              backgroundColor: 'rgba(255,255,255,0.75)',
              transition: 'width 400ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </div>

        {/* Goal adjuster */}
        <div className="flex items-center justify-between">
          <span style={{ fontSize: '11px', color: '#52525b' }}>
            Adjust goal
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleGoalChange(-15)}
              className="flex items-center justify-center border-none"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer',
                color: '#71717a',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.color = '#fafafa';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.color = '#71717a';
              }}
            >
              <Minus size={14} />
            </button>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: '#fafafa',
                minWidth: '40px',
                textAlign: 'center',
              }}
            >
              {formatTime(dailyGoal)}
            </span>
            <button
              onClick={() => handleGoalChange(15)}
              className="flex items-center justify-center border-none"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer',
                color: '#71717a',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.color = '#fafafa';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.color = '#71717a';
              }}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Today's sessions */}
      {sessions.length > 0 && (
        <div>
          <p
            style={{
              fontSize: '11px',
              fontWeight: 500,
              color: '#52525b',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '10px',
            }}
          >
            Today's Sessions
          </p>
          <div className="flex flex-col gap-1.5">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-lg px-3 py-2.5"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <p
                  style={{
                    fontSize: '12px',
                    color: '#d4d4d8',
                    margin: 0,
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    paddingRight: '8px',
                  }}
                >
                  {session.videoTitle || 'Study session'}
                </p>
                <span
                  style={{
                    fontSize: '11px',
                    color: '#52525b',
                    fontFamily: "'JetBrains Mono', monospace",
                    flexShrink: 0,
                  }}
                >
                  {formatSessionDuration(session.duration)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
