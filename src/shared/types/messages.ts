import type { StudySession, DailyStats, WeeklyStats, LearningStreak, UserSettings, VideoNote, VideoInfo, AISummary, QuizQuestion, TranscriptSegment } from './index';

// Message types
export type MessageType =
  | 'TOGGLE_LEARN_MODE'
  | 'GET_LEARN_MODE'
  | 'SET_LEARN_MODE'
  | 'START_SESSION'
  | 'PAUSE_SESSION'
  | 'END_SESSION'
  | 'GET_ACTIVE_SESSION'
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS'
  | 'GET_DAILY_STATS'
  | 'GET_WEEKLY_STATS'
  | 'GET_STREAK'
  | 'SAVE_NOTE'
  | 'GET_NOTES'
  | 'DELETE_NOTE'
  | 'SAVE_VIDEO_INFO'
  | 'GET_HISTORY'
  | 'EXTRACT_TRANSCRIPT'
  | 'GET_TRANSCRIPT'
  | 'SAVE_TRANSCRIPT'
  | 'SEARCH_TRANSCRIPTS'
  | 'GENERATE_SUMMARY'
  | 'GENERATE_NOTES'
  | 'GENERATE_QUIZ'
  | 'OPEN_SIDE_PANEL'
  | 'VIDEO_STATE_CHANGED'
  | 'PAGE_CHANGED'
  | 'GET_TODAY_STATS'
  | 'GET_DASHBOARD_DATA'
  | 'GET_CURRENT_VIDEO'
  | 'GET_VIDEO_CURRENT_TIME'
  | 'SEEK_VIDEO'
  | 'SAVE_QUIZ'
  | 'GET_QUIZ_ATTEMPTS'
  | 'GET_SUMMARY';

export interface Message {
  type: MessageType;
  payload?: any;
}

export interface MessageResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
