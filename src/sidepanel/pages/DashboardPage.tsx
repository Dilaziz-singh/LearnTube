import React, { useState, useEffect } from 'react';
import { Play, Clock, Target, Zap } from 'lucide-react';
import { StatsCard } from '../components/StatsCard';
import { ProgressRing } from '../components/ProgressRing';
import { StreakDisplay } from '../components/StreakDisplay';
import { WeeklyChart } from '../components/WeeklyChart';

interface DashboardData {
  videosWatched: number;
  studyTimeMinutes: number;
  sessions: number;
  dailyGoalMinutes: number;
  currentStreak: number;
  longestStreak: number;
  weeklyData: { date: string; studyTime: number }[];
  recentVideos: { id: string; title: string; watchedAt: number; duration: number }[];
}

const formatTime = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData>({
    videosWatched: 0,
    studyTimeMinutes: 0,
    sessions: 0,
    dailyGoalMinutes: 60,
    currentStreak: 0,
    longestStreak: 0,
    weeklyData: [],
    recentVideos: [],
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_DASHBOARD_DATA' }, (response) => {
      if (response) {
        setData({
          videosWatched: response.videosWatched ?? 0,
          studyTimeMinutes: response.studyTimeMinutes ?? 0,
          sessions: response.sessions ?? 0,
          dailyGoalMinutes: response.dailyGoalMinutes ?? 60,
          currentStreak: response.currentStreak ?? 0,
          longestStreak: response.longestStreak ?? 0,
          weeklyData: response.weeklyData ?? [],
          recentVideos: response.recentVideos ?? [],
        });
      }
      setLoaded(true);
    });
  }, []);

  const goalProgress =
    data.dailyGoalMinutes > 0
      ? Math.min(100, Math.round((data.studyTimeMinutes / data.dailyGoalMinutes) * 100))
      : 0;

  return (
    <div className="flex flex-col px-4 pt-5 pb-4 gap-5">
      {/* Heading */}
      <div
        className="animate-slide-up"
        style={{ animationDelay: '0ms', opacity: 0, animationFillMode: 'forwards' }}
      >
        <h1
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#fafafa',
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          Today's Progress
        </h1>
        <p
          style={{
            fontSize: '12px',
            color: '#52525b',
            marginTop: '4px',
          }}
        >
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Stats Grid */}
      <div
        className="grid grid-cols-2 gap-3 animate-slide-up"
        style={{ animationDelay: '50ms', opacity: 0, animationFillMode: 'forwards' }}
      >
        <StatsCard icon={Play} label="Videos" value={data.videosWatched} />
        <StatsCard
          icon={Clock}
          label="Studied"
          value={formatTime(data.studyTimeMinutes)}
        />
        <StatsCard icon={Zap} label="Sessions" value={data.sessions} />
        <StatsCard
          icon={Target}
          label="Goal"
          value={`${goalProgress}%`}
          subtitle={`${formatTime(data.studyTimeMinutes)} / ${formatTime(data.dailyGoalMinutes)}`}
        />
      </div>

      {/* Progress Ring + Streak */}
      <div
        className="flex items-center justify-around py-2 rounded-xl animate-slide-up"
        style={{
          backgroundColor: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
          animationDelay: '100ms',
          opacity: 0,
          animationFillMode: 'forwards',
        }}
      >
        <ProgressRing
          progress={goalProgress}
          size={100}
          strokeWidth={5}
          label="daily goal"
        />
        <StreakDisplay
          currentStreak={data.currentStreak}
          longestStreak={data.longestStreak}
        />
      </div>

      {/* Weekly Chart */}
      {data.weeklyData.length > 0 && (
        <div
          className="animate-slide-up"
          style={{ animationDelay: '150ms', opacity: 0, animationFillMode: 'forwards' }}
        >
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
            This Week
          </p>
          <div
            className="rounded-xl py-3 px-2"
            style={{
              backgroundColor: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <WeeklyChart data={data.weeklyData} />
          </div>
        </div>
      )}

      {/* Recent Videos */}
      {data.recentVideos.length > 0 && (
        <div
          className="animate-slide-up"
          style={{ animationDelay: '200ms', opacity: 0, animationFillMode: 'forwards' }}
        >
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
            Recent Videos
          </p>
          <div className="flex flex-col gap-1.5">
            {data.recentVideos.slice(0, 5).map((video, index) => (
              <div
                key={video.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  transition: 'background-color 150ms ease',
                  cursor: 'default',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    'rgba(255,255,255,0.05)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    'rgba(255,255,255,0.02)')
                }
              >
                <div
                  className="flex items-center justify-center flex-shrink-0 rounded"
                  style={{
                    width: '28px',
                    height: '28px',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                  }}
                >
                  <Play size={12} color="#52525b" />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    style={{
                      fontSize: '12px',
                      color: '#d4d4d8',
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {video.title}
                  </p>
                  <p
                    style={{
                      fontSize: '10px',
                      color: '#3f3f46',
                      margin: '2px 0 0 0',
                    }}
                  >
                    {formatTime(Math.floor(video.duration / 60))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
