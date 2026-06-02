import { storage } from '../shared/utils/storage';
import { STORAGE_KEYS, DEFAULT_SETTINGS, MIN_STUDY_TIME_FOR_STREAK } from '../shared/utils/constants';
import { getToday, getWeekId, generateId, getLast7Days } from '../shared/utils/time';
import type {
  StudySession, DailyStats, WeeklyStats, LearningStreak,
  UserSettings, VideoNote, VideoInfo, VideoHistoryEntry,
  TranscriptSegment, AISummary, QuizAttempt
} from '../shared/types';

export const storageService = {
  // ============ SETTINGS ============
  async getSettings(): Promise<UserSettings> {
    const settings = await storage.get<UserSettings>(STORAGE_KEYS.SETTINGS);
    return settings || { ...DEFAULT_SETTINGS };
  },

  async updateSettings(updates: Partial<UserSettings>): Promise<UserSettings> {
    const current = await this.getSettings();
    const merged = {
      ...current,
      ...updates,
      distractions: { ...current.distractions, ...updates.distractions },
      timer: { ...current.timer, ...updates.timer },
      ai: { ...current.ai, ...updates.ai },
    };
    await storage.set(STORAGE_KEYS.SETTINGS, merged);
    return merged;
  },

  // ============ SESSIONS ============
  async startSession(videoId: string, videoTitle: string, channelName: string): Promise<StudySession> {
    const today = getToday();
    const sessions = await storage.get<StudySession[]>(STORAGE_KEYS.sessionPrefix(today)) || [];

    // Check if there's already an active session for this video
    const existing = sessions.find(s => s.videoId === videoId && s.isActive);
    if (existing) return existing;

    const session: StudySession = {
      id: generateId(),
      videoId,
      videoTitle,
      channelName,
      startTime: Date.now(),
      endTime: null,
      duration: 0,
      isActive: true,
    };

    sessions.push(session);
    await storage.set(STORAGE_KEYS.sessionPrefix(today), sessions);
    return session;
  },

  async pauseSession(videoId: string): Promise<void> {
    const today = getToday();
    const sessions = await storage.get<StudySession[]>(STORAGE_KEYS.sessionPrefix(today)) || [];
    const session = sessions.find(s => s.videoId === videoId && s.isActive);
    if (session) {
      session.duration += Math.floor((Date.now() - session.startTime) / 1000);
      session.isActive = false;
      session.endTime = Date.now();
      await storage.set(STORAGE_KEYS.sessionPrefix(today), sessions);
      await this.updateDailyStats(session);
    }
  },

  async endSession(videoId: string): Promise<void> {
    await this.pauseSession(videoId);
  },

  async getActiveSession(): Promise<StudySession | null> {
    const today = getToday();
    const sessions = await storage.get<StudySession[]>(STORAGE_KEYS.sessionPrefix(today)) || [];
    return sessions.find(s => s.isActive) || null;
  },

  // ============ DAILY STATS ============
  async updateDailyStats(session: StudySession): Promise<void> {
    const today = getToday();
    const stats = await storage.get<DailyStats>(STORAGE_KEYS.dailyStats(today)) || {
      date: today,
      totalStudyTime: 0,
      videosWatched: 0,
      sessionsCompleted: 0,
      videoIds: [],
    };

    stats.totalStudyTime += session.duration;
    stats.sessionsCompleted += 1;
    if (!stats.videoIds.includes(session.videoId)) {
      stats.videoIds.push(session.videoId);
      stats.videosWatched = stats.videoIds.length;
    }

    await storage.set(STORAGE_KEYS.dailyStats(today), stats);
    await this.updateStreak(stats);
  },

  async getDailyStats(date?: string): Promise<DailyStats> {
    const d = date || getToday();
    return await storage.get<DailyStats>(STORAGE_KEYS.dailyStats(d)) || {
      date: d,
      totalStudyTime: 0,
      videosWatched: 0,
      sessionsCompleted: 0,
      videoIds: [],
    };
  },

  // ============ WEEKLY STATS ============
  async getWeeklyStats(): Promise<WeeklyStats> {
    const days = getLast7Days();
    const dailyBreakdown: { date: string; studyTime: number }[] = [];
    let totalStudyTime = 0;
    let videosWatched = 0;
    const allVideoIds = new Set<string>();

    for (const day of days) {
      const stats = await this.getDailyStats(day);
      dailyBreakdown.push({ date: day, studyTime: stats.totalStudyTime });
      totalStudyTime += stats.totalStudyTime;
      stats.videoIds.forEach(id => allVideoIds.add(id));
    }

    return {
      weekId: getWeekId(),
      totalStudyTime,
      videosWatched: allVideoIds.size,
      dailyBreakdown,
    };
  },

  // ============ STREAKS ============
  async getStreak(): Promise<LearningStreak> {
    return await storage.get<LearningStreak>(STORAGE_KEYS.STREAK) || {
      currentStreak: 0,
      longestStreak: 0,
      lastStudyDate: '',
      streakStartDate: '',
    };
  },

  async updateStreak(dailyStats: DailyStats): Promise<void> {
    if (dailyStats.totalStudyTime < MIN_STUDY_TIME_FOR_STREAK) return;

    const streak = await this.getStreak();
    const today = getToday();

    if (streak.lastStudyDate === today) return; // Already counted today

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (streak.lastStudyDate === yesterdayStr) {
      // Continue streak
      streak.currentStreak += 1;
    } else if (streak.lastStudyDate !== today) {
      // Start new streak
      streak.currentStreak = 1;
      streak.streakStartDate = today;
    }

    streak.lastStudyDate = today;
    streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
    await storage.set(STORAGE_KEYS.STREAK, streak);
  },

  // ============ NOTES ============
  async saveNote(videoId: string, note: VideoNote): Promise<void> {
    const notes = await storage.get<VideoNote[]>(STORAGE_KEYS.videoNotes(videoId)) || [];
    const idx = notes.findIndex(n => n.id === note.id);
    if (idx >= 0) {
      notes[idx] = { ...note, updatedAt: Date.now() };
    } else {
      notes.push(note);
    }
    await storage.set(STORAGE_KEYS.videoNotes(videoId), notes);
  },

  async getNotes(videoId: string): Promise<VideoNote[]> {
    return await storage.get<VideoNote[]>(STORAGE_KEYS.videoNotes(videoId)) || [];
  },

  async deleteNote(videoId: string, noteId: string): Promise<void> {
    const notes = await storage.get<VideoNote[]>(STORAGE_KEYS.videoNotes(videoId)) || [];
    const filtered = notes.filter(n => n.id !== noteId);
    await storage.set(STORAGE_KEYS.videoNotes(videoId), filtered);
  },

  // ============ VIDEO INFO & HISTORY ============
  async saveVideoInfo(info: VideoInfo): Promise<void> {
    await storage.set(STORAGE_KEYS.videoInfo(info.videoId), info);
    await this.addToHistory(info);
  },

  async addToHistory(info: VideoInfo): Promise<void> {
    const history = await storage.get<VideoHistoryEntry[]>(STORAGE_KEYS.HISTORY) || [];
    const idx = history.findIndex(h => h.videoId === info.videoId);
    const entry: VideoHistoryEntry = {
      videoId: info.videoId,
      title: info.title,
      channelName: info.channelName,
      totalWatchTime: 0,
      lastWatched: Date.now(),
      hasTranscript: false,
      hasNotes: false,
      hasSummary: false,
    };

    if (idx >= 0) {
      history[idx] = { ...history[idx], ...entry, totalWatchTime: history[idx].totalWatchTime };
    } else {
      history.unshift(entry);
    }

    // Keep last 200 entries
    const trimmed = history.slice(0, 200);
    await storage.set(STORAGE_KEYS.HISTORY, trimmed);
  },

  async getHistory(): Promise<VideoHistoryEntry[]> {
    return await storage.get<VideoHistoryEntry[]>(STORAGE_KEYS.HISTORY) || [];
  },

  // ============ TRANSCRIPTS ============
  async saveTranscript(videoId: string, segments: TranscriptSegment[]): Promise<void> {
    await storage.set(STORAGE_KEYS.videoTranscript(videoId), segments);
    
    // Update history entry to indicate it has transcript
    const history = await this.getHistory();
    const idx = history.findIndex(h => h.videoId === videoId);
    if (idx >= 0) {
      history[idx].hasTranscript = true;
      await storage.set(STORAGE_KEYS.HISTORY, history);
    }
  },

  async getTranscript(videoId: string): Promise<TranscriptSegment[] | null> {
    return await storage.get<TranscriptSegment[]>(STORAGE_KEYS.videoTranscript(videoId));
  },

  async searchTranscripts(query: string): Promise<{ videoId: string; videoTitle: string; segment: TranscriptSegment }[]> {
    const history = await this.getHistory();
    const results: { videoId: string; videoTitle: string; segment: TranscriptSegment }[] = [];
    const cleanQuery = query.toLowerCase();

    for (const entry of history) {
      const transcript = await this.getTranscript(entry.videoId);
      if (transcript) {
        for (const segment of transcript) {
          if (segment.text.toLowerCase().includes(cleanQuery)) {
            results.push({
              videoId: entry.videoId,
              videoTitle: entry.title,
              segment
            });
            if (results.length >= 50) break;
          }
        }
      }
      if (results.length >= 50) break;
    }
    return results;
  },

  // ============ AI SUMMARIES ============
  async saveSummary(videoId: string, summary: AISummary): Promise<void> {
    await storage.set(STORAGE_KEYS.videoSummary(videoId), summary);
    const history = await this.getHistory();
    const idx = history.findIndex(h => h.videoId === videoId);
    if (idx >= 0) {
      history[idx].hasSummary = true;
      await storage.set(STORAGE_KEYS.HISTORY, history);
    }
  },

  async getSummary(videoId: string): Promise<AISummary | null> {
    return await storage.get<AISummary>(STORAGE_KEYS.videoSummary(videoId));
  },

  // ============ QUIZZES ============
  async saveQuizAttempt(videoId: string, attempt: QuizAttempt): Promise<void> {
    const attempts = await storage.get<QuizAttempt[]>(STORAGE_KEYS.videoQuizzes(videoId)) || [];
    attempts.push(attempt);
    await storage.set(STORAGE_KEYS.videoQuizzes(videoId), attempts);
  },

  async getQuizAttempts(videoId: string): Promise<QuizAttempt[]> {
    return await storage.get<QuizAttempt[]>(STORAGE_KEYS.videoQuizzes(videoId)) || [];
  }
};
