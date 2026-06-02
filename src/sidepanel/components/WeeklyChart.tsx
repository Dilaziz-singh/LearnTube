import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface WeeklyDataPoint {
  date: string;
  studyTime: number; // in minutes
}

interface WeeklyChartProps {
  data: WeeklyDataPoint[];
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatTime = (minutes: number): string => {
  if (minutes === 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

const CustomTooltip: React.FC<any> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0];
  return (
    <div
      style={{
        backgroundColor: 'rgba(24, 24, 27, 0.95)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '8px',
        padding: '8px 12px',
        fontSize: '12px',
        color: '#fafafa',
        fontWeight: 500,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      {formatTime(data.value)}
    </div>
  );
};

export const WeeklyChart: React.FC<WeeklyChartProps> = ({ data }) => {
  const chartData = useMemo(() => {
    return data.map((item) => {
      const date = new Date(item.date);
      const dayName = dayNames[date.getDay()];
      return {
        name: dayName,
        studyTime: item.studyTime,
      };
    });
  }, [data]);

  const maxStudyTime = useMemo(
    () => Math.max(...chartData.map((d) => d.studyTime), 1),
    [chartData]
  );

  return (
    <div style={{ width: '100%', height: 140 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 4, left: 4, bottom: 0 }}
          barCategoryGap="25%"
        >
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{
              fontSize: 10,
              fill: '#52525b',
              fontWeight: 400,
            }}
            dy={8}
          />
          <YAxis hide />
          <Tooltip
            content={<CustomTooltip />}
            cursor={false}
          />
          <Bar
            dataKey="studyTime"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
            animationDuration={800}
            animationEasing="ease-out"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.studyTime === maxStudyTime && entry.studyTime > 0
                    ? 'rgba(255,255,255,0.85)'
                    : 'rgba(255,255,255,0.3)'
                }
                style={{ transition: 'fill 150ms ease' }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
