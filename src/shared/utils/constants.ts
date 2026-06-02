export const DEFAULT_SETTINGS = {
  learnModeEnabled: false,
  autoActivate: false,
  distractions: {
    hideHomeFeed: true,
    hideShorts: true,
    hideComments: true,
    hideRelated: true,
    hideEndScreen: true,
    hideAutoplay: true,
    extraStrictEnabled: false,
  },
  timer: {
    autoStart: true,
    dailyGoalMinutes: 60,
    showInBadge: true,
  },
  ai: {
    apiKey: '',
    provider: 'gemini' as const,
    model: 'gemini-2.0-flash',
  },
};

export const STORAGE_KEYS = {
  SETTINGS: 'settings',
  STREAK: 'streak',
  HISTORY: 'history',
  sessionPrefix: (date: string) => `sessions:${date}`,
  dailyStats: (date: string) => `stats:daily:${date}`,
  weeklyStats: (weekId: string) => `stats:weekly:${weekId}`,
  videoNotes: (videoId: string) => `video:${videoId}:notes`,
  videoTranscript: (videoId: string) => `video:${videoId}:transcript`,
  videoSummary: (videoId: string) => `video:${videoId}:summary`,
  videoQuizzes: (videoId: string) => `video:${videoId}:quizzes`,
  videoInfo: (videoId: string) => `video:${videoId}:info`,
};

export const MIN_STUDY_TIME_FOR_STREAK = 900; // 15 minutes in seconds
