// Study Session
export interface StudySession {
  id: string;
  videoId: string;
  videoTitle: string;
  channelName: string;
  startTime: number; // Unix timestamp
  endTime: number | null;
  duration: number; // seconds
  isActive: boolean;
}

// Daily stats
export interface DailyStats {
  date: string; // YYYY-MM-DD
  totalStudyTime: number; // seconds
  videosWatched: number;
  sessionsCompleted: number;
  videoIds: string[];
}

// Weekly stats
export interface WeeklyStats {
  weekId: string; // YYYY-WW
  totalStudyTime: number;
  videosWatched: number;
  dailyBreakdown: { date: string; studyTime: number }[];
}

// Learning streak
export interface LearningStreak {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string; // YYYY-MM-DD
  streakStartDate: string;
}

// Video info
export interface VideoInfo {
  videoId: string;
  title: string;
  channelName: string;
  channelId: string;
  thumbnailUrl: string;
  duration: number;
  lastWatched: number;
}

// Video note
export interface VideoNote {
  id: string;
  videoId: string;
  content: string;
  timestamp: number | null; // video timestamp in seconds
  createdAt: number;
  updatedAt: number;
}

// Transcript
export interface TranscriptSegment {
  text: string;
  start: number; // seconds
  duration: number; // seconds
}

export interface VideoTranscript {
  videoId: string;
  language: string;
  segments: TranscriptSegment[];
  extractedAt: number;
}

// AI Summary (Phase 3)
export interface AISummary {
  videoId: string;
  overview: string;
  keyConcepts: string[];
  takeaways: string[];
  actionItems: string[];
  chapters: { title: string; timestamp: number }[];
  generatedAt: number;
}

// Quiz (Phase 3)
export interface QuizQuestion {
  id: string;
  type: 'multiple-choice' | 'short-answer';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export interface QuizAttempt {
  id: string;
  videoId: string;
  questions: QuizQuestion[];
  answers: { questionId: string; answer: string; correct: boolean }[];
  score: number;
  totalQuestions: number;
  completedAt: number;
}

// User settings
export interface UserSettings {
  learnModeEnabled: boolean;
  autoActivate: boolean;
  distractions: {
    hideHomeFeed: boolean;
    hideShorts: boolean;
    hideComments: boolean;
    hideRelated: boolean;
    hideEndScreen: boolean;
    hideAutoplay: boolean;
    extraStrictEnabled: boolean;
  };
  timer: {
    autoStart: boolean;
    dailyGoalMinutes: number;
    showInBadge: boolean;
  };
  ai: {
    apiKey: string;
    provider: 'gemini';
    model: string;
  };
}

// Watch history entry
export interface VideoHistoryEntry {
  videoId: string;
  title: string;
  channelName: string;
  totalWatchTime: number;
  lastWatched: number;
  hasTranscript: boolean;
  hasNotes: boolean;
  hasSummary: boolean;
}

// Page types
export type YouTubePageType = 'home' | 'watch' | 'search' | 'shorts' | 'channel' | 'other';
