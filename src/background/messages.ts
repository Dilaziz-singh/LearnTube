import type { Message, MessageResponse } from '../shared/types/messages';
import { storageService } from './storage-service';
import { GeminiProvider } from './ai/gemini';
import { getToday } from '../shared/utils/time';
import { storage } from '../shared/utils/storage';
import { STORAGE_KEYS } from '../shared/utils/constants';
import type { VideoInfo, QuizAttempt } from '../shared/types';

const aiProvider = new GeminiProvider();
let currentVideo: { videoId: string; title: string } | null = null;

export async function handleMessage(
  message: Message,
  sender: chrome.runtime.MessageSender
): Promise<any> {
  try {
    const payload = message.payload ?? message;

    switch (message.type) {
      case 'GET_SETTINGS': {
        const settings = await storageService.getSettings();
        return { success: true, data: settings };
      }
      case 'UPDATE_SETTINGS': {
        const settings = await storageService.updateSettings(payload.settings ?? payload);
        return { success: true, data: settings };
      }
      case 'GET_LEARN_MODE': {
        const settings = await storageService.getSettings();
        return {
          success: true,
          enabled: settings.learnModeEnabled,
          data: { enabled: settings.learnModeEnabled },
        };
      }
      case 'SET_LEARN_MODE': {
        const enabled = payload.enabled ?? payload ?? false;
        await storageService.updateSettings({ learnModeEnabled: enabled });

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id && tab.url?.includes('youtube.com')) {
          try {
            await chrome.tabs.sendMessage(tab.id, {
              type: 'SET_LEARN_MODE',
              payload: { enabled },
            });
          } catch {
            // The content script may not be ready on non-watch YouTube pages yet.
          }
        }

        return { success: true };
      }
      case 'START_SESSION': {
        const session = await storageService.startSession(
          payload.videoId,
          payload.videoTitle,
          payload.channelName
        );
        return { success: true, data: session };
      }
      case 'PAUSE_SESSION': {
        await storageService.pauseSession(payload.videoId);
        return { success: true };
      }
      case 'END_SESSION': {
        await storageService.endSession(payload.videoId);
        return { success: true };
      }
      case 'GET_ACTIVE_SESSION': {
        const session = await storageService.getActiveSession();
        return { success: true, data: session };
      }
      case 'GET_DAILY_STATS': {
        const stats = await storageService.getDailyStats(payload.date);
        return { success: true, data: stats };
      }
      case 'GET_WEEKLY_STATS': {
        const stats = await storageService.getWeeklyStats();
        return { success: true, data: stats };
      }
      case 'GET_STREAK': {
        const streak = await storageService.getStreak();
        return { success: true, data: streak };
      }
      case 'GET_TODAY_STATS': {
        const today = getToday();
        const daily = await storageService.getDailyStats(today);
        const streak = await storageService.getStreak();
        const stats = {
          videosWatched: daily.videosWatched,
          studyTimeMinutes: Math.floor(daily.totalStudyTime / 60),
          currentStreak: streak.currentStreak,
        };
        return {
          success: true,
          ...stats,
          data: stats,
        };
      }
      case 'GET_DASHBOARD_DATA': {
        const today = getToday();
        const daily = await storageService.getDailyStats(today);
        const streak = await storageService.getStreak();
        const weekly = await storageService.getWeeklyStats();
        const settings = await storageService.getSettings();
        const history = await storageService.getHistory();

        const weeklyData = weekly.dailyBreakdown.map((d) => ({
          date: d.date,
          studyTime: Math.floor(d.studyTime / 60),
        }));

        const recentVideos = history.map((h) => ({
          id: h.videoId,
          title: h.title,
          watchedAt: h.lastWatched,
          duration: h.totalWatchTime,
        }));

        const dashboard = {
          videosWatched: daily.videosWatched,
          studyTimeMinutes: Math.floor(daily.totalStudyTime / 60),
          sessions: daily.sessionsCompleted,
          dailyGoalMinutes: settings.timer.dailyGoalMinutes,
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          weeklyData,
          recentVideos,
        };

        return {
          success: true,
          ...dashboard,
          data: dashboard,
        };
      }
      case 'PAGE_CHANGED': {
        const { videoId } = payload;
        currentVideo = {
          videoId,
          title: 'Loading...',
        };
        return { success: true };
      }
      case 'GET_CURRENT_VIDEO': {
        if (!currentVideo) {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab?.id && tab.url?.includes('youtube.com')) {
            const url = new URL(tab.url);
            const videoId = url.searchParams.get('v');
            if (videoId) {
              const info = await storage.get<VideoInfo>(STORAGE_KEYS.videoInfo(videoId));
              return {
                success: true,
                videoId,
                title: info?.title || tab.title?.replace(' - YouTube', '') || 'Untitled Video',
                data: {
                  videoId,
                  title: info?.title || tab.title?.replace(' - YouTube', '') || 'Untitled Video',
                },
              };
            }
          }
        }
        return {
          success: true,
          videoId: currentVideo?.videoId,
          title: currentVideo?.title,
          data: currentVideo,
        };
      }
      case 'SAVE_NOTE': {
        await storageService.saveNote(payload.videoId, payload.note);
        return { success: true };
      }
      case 'GET_NOTES': {
        const notes = await storageService.getNotes(payload.videoId);
        return { success: true, notes, data: notes };
      }
      case 'DELETE_NOTE': {
        await storageService.deleteNote(payload.videoId, payload.noteId);
        return { success: true };
      }
      case 'SAVE_VIDEO_INFO': {
        await storageService.saveVideoInfo(payload);
        currentVideo = {
          videoId: payload.videoId,
          title: payload.title,
        };
        return { success: true };
      }
      case 'GET_HISTORY': {
        const history = await storageService.getHistory();
        return { success: true, data: history };
      }
      case 'OPEN_SIDE_PANEL': {
        let tabId = sender.tab?.id;
        if (!tabId) {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          tabId = tab?.id;
        }

        if (tabId) {
          await chrome.sidePanel.open({ tabId });
        }
        return { success: true };
      }
      case 'GET_VIDEO_CURRENT_TIME': {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id && tab.url?.includes('youtube.com')) {
          try {
            const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_VIDEO_CURRENT_TIME' });
            return response || { currentTime: 0 };
          } catch (e) {
            return { currentTime: 0 };
          }
        }
        return { currentTime: 0 };
      }
      case 'SEEK_VIDEO': {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id && tab.url?.includes('youtube.com')) {
          try {
            const response = await chrome.tabs.sendMessage(tab.id, {
              type: 'SEEK_VIDEO',
              payload: { time: payload.time },
            });
            return response;
          } catch (e) {
            return { success: false, error: 'Could not communicate with tab' };
          }
        }
        return { success: false };
      }
      case 'EXTRACT_TRANSCRIPT': {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id && tab.url?.includes('youtube.com')) {
          try {
            const response = await chrome.tabs.sendMessage(tab.id, {
              type: 'EXTRACT_TRANSCRIPT',
              payload: { videoId: payload.videoId },
            });
            if (response?.success && response.data) {
              await storageService.saveTranscript(payload.videoId, response.data);
            }
            return response;
          } catch (e) {
            return { success: false, error: 'Could not communicate with YouTube tab to extract transcript.' };
          }
        }
        return { success: false, error: 'No active YouTube tab found.' };
      }
      case 'GET_TRANSCRIPT': {
        const segments = await storageService.getTranscript(payload.videoId);
        return { success: true, data: segments };
      }
      case 'SAVE_TRANSCRIPT': {
        await storageService.saveTranscript(payload.videoId, payload.segments);
        return { success: true };
      }
      case 'SEARCH_TRANSCRIPTS': {
        const results = await storageService.searchTranscripts(payload.query);
        return { success: true, data: results };
      }
      case 'GENERATE_SUMMARY': {
        const segments = await storageService.getTranscript(payload.videoId);
        if (!segments || segments.length === 0) {
          return { success: false, error: 'No transcript available. Try reloading the transcript tab first.' };
        }
        const text = segments.map(s => s.text).join(' ');
        const summary = await aiProvider.summarize(text, payload.videoId);
        await storageService.saveSummary(payload.videoId, summary);
        return { success: true, data: summary };
      }
      case 'GENERATE_NOTES': {
        const segments = await storageService.getTranscript(payload.videoId);
        if (!segments || segments.length === 0) {
          return { success: false, error: 'No transcript available. Try reloading the transcript tab first.' };
        }
        const text = segments.map(s => s.text).join(' ');
        const notesText = await aiProvider.generateNotes(text, payload.videoId);
        return { success: true, data: notesText };
      }
      case 'GENERATE_QUIZ': {
        const segments = await storageService.getTranscript(payload.videoId);
        if (!segments || segments.length === 0) {
          return { success: false, error: 'No transcript available. Try reloading the transcript tab first.' };
        }
        const text = segments.map(s => s.text).join(' ');
        const quiz = await aiProvider.generateQuiz(text, payload.videoId);
        return { success: true, data: quiz };
      }
      case 'SAVE_QUIZ': {
        await storageService.saveQuizAttempt(payload.videoId, payload.attempt);
        return { success: true };
      }
      case 'GET_QUIZ_ATTEMPTS': {
        const attempts = await storageService.getQuizAttempts(payload.videoId);
        return { success: true, data: attempts };
      }
      case 'GET_SUMMARY': {
        const summary = await storageService.getSummary(payload.videoId);
        return { success: true, data: summary };
      }
      default:
        return { success: false, error: `Unknown message type: ${message.type}` };
    }
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
