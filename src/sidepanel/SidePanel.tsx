import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  FileText,
  Lock,
  NotebookPen,
  PlaySquare,
  RefreshCw,
  Settings,
  Sparkles,
  Timer,
  VideoOff,
  type LucideIcon,
} from 'lucide-react';
import { NoteEditor } from './components/NoteEditor';
import { TimerPage } from './pages/TimerPage';
import { SettingsPage } from './pages/SettingsPage';
import { TranscriptPage } from './pages/TranscriptPage';
import { SummaryPage } from './pages/SummaryPage';
import { QuizPage } from './pages/QuizPage';

export type TabId = 'summary' | 'quiz' | 'transcript' | 'timer' | 'settings';

interface CurrentVideo {
  videoId: string;
  title: string;
}

interface StudyTab {
  id: TabId;
  label: string;
  icon: LucideIcon;
  component: React.FC;
}

const tabs: StudyTab[] = [
  { id: 'summary', label: 'Summary', icon: Sparkles, component: SummaryPage },
  { id: 'quiz', label: 'Quiz', icon: Award, component: QuizPage },
  { id: 'transcript', label: 'Transcript', icon: FileText, component: TranscriptPage },
  { id: 'timer', label: 'Timer', icon: Timer, component: TimerPage },
  { id: 'settings', label: 'Settings', icon: Settings, component: SettingsPage },
];

export const SidePanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('summary');
  const [currentVideo, setCurrentVideo] = useState<CurrentVideo | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(true);
  const [extraStrict, setExtraStrict] = useState(false);

  const ActivePage = useMemo(
    () => tabs.find((tab) => tab.id === activeTab)?.component ?? SummaryPage,
    [activeTab]
  );

  const refreshCurrentVideo = useCallback(() => {
    setLoadingVideo(true);
    chrome.runtime.sendMessage({ type: 'GET_CURRENT_VIDEO' }, (response) => {
      const data = response?.data;
      if (data?.videoId) {
        setCurrentVideo({
          videoId: data.videoId,
          title: data.title || 'Current YouTube video',
        });
      } else {
        setCurrentVideo(null);
      }
      setLoadingVideo(false);
    });
  }, []);

  const refreshSettings = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
      setExtraStrict(!!response?.data?.distractions?.extraStrictEnabled);
    });
  }, []);

  useEffect(() => {
    refreshCurrentVideo();
    refreshSettings();
  }, [refreshCurrentVideo, refreshSettings]);

  const handleExtraStrictChange = useCallback((enabled: boolean) => {
    setExtraStrict(enabled);
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
      const settings = response?.data;
      if (!settings) return;

      chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        payload: {
          ...settings,
          distractions: {
            ...settings.distractions,
            extraStrictEnabled: enabled,
          },
        },
      });
    });
  }, []);

  return (
    <div
      className="flex flex-col"
      style={{
        minHeight: '100vh',
        background: '#000',
        color: '#f4f4f5',
        fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <header
        className="flex items-center justify-between gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="flex items-center justify-center rounded-lg"
            style={{
              width: 30,
              height: 30,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <BookOpen size={15} />
          </div>
          <div className="min-w-0">
            <p className="m-0 text-sm font-semibold tracking-normal">LearnTube</p>
            <p className="m-0 truncate text-[11px] text-zinc-500">
              {currentVideo?.title || 'Open a YouTube lesson'}
            </p>
          </div>
        </div>

        <button
          onClick={() => handleExtraStrictChange(!extraStrict)}
          className="flex shrink-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors"
          style={{
            background: extraStrict ? '#f4f4f5' : 'rgba(255,255,255,0.04)',
            borderColor: extraStrict ? '#f4f4f5' : 'rgba(255,255,255,0.1)',
            color: extraStrict ? '#000' : '#d4d4d8',
          }}
        >
          <Lock size={12} />
          <span>Extra Strict</span>
        </button>
      </header>

      <main
        className="grid flex-1 gap-4 p-4"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
          alignItems: 'stretch',
        }}
      >
        <section className="flex min-w-0 flex-col gap-4">
          <div
            className="flex items-center justify-center overflow-hidden rounded-lg"
            style={{
              minWidth: 260,
              minHeight: 130,
              width: 'min(520px, 100%)',
              height: 170,
              maxWidth: '100%',
              background: '#050505',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {loadingVideo ? (
              <div className="flex h-full items-center justify-center gap-2 text-xs text-zinc-500">
                <RefreshCw size={14} className="animate-spin" />
                <span>Finding video...</span>
              </div>
            ) : currentVideo ? (
              <div className="flex flex-col items-center gap-3 px-5 text-center">
                <PlaySquare size={26} className="text-zinc-500" />
                <div>
                  <p className="m-0 text-sm font-semibold text-zinc-200">
                    Player is on the YouTube page
                  </p>
                  <p className="m-0 mt-1 max-w-sm text-xs leading-relaxed text-zinc-500">
                    Learn Mode hides YouTube itself and keeps the original video player alive, which avoids Error 153.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-5 text-center">
                <VideoOff size={24} className="text-zinc-600" />
                <p className="m-0 text-xs font-medium text-zinc-400">
                  Open a YouTube video and refresh this panel.
                </p>
              </div>
            )}
          </div>

          <div
            className="min-h-0 flex-1 overflow-hidden rounded-lg"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div
              className="flex items-center gap-1 overflow-x-auto p-2"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
            >
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex items-center gap-1.5 rounded-md border-none px-2.5 py-1.5 text-[11px] font-semibold transition-colors"
                    style={{
                      background: isActive ? '#f4f4f5' : 'transparent',
                      color: isActive ? '#000' : '#a1a1aa',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Icon size={12} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="h-full overflow-y-auto pb-12">
              <ActivePage />
            </div>
          </div>
        </section>

        <aside
          className="flex min-w-0 flex-col rounded-lg"
          style={{
            minHeight: 0,
            background: '#050505',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div
            className="flex items-center justify-between gap-3 px-4 py-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center gap-2">
              <NotebookPen size={15} className="text-zinc-400" />
              <h1 className="m-0 text-sm font-semibold tracking-normal">Notes</h1>
            </div>
            <button
              onClick={refreshCurrentVideo}
              className="rounded-md border-none bg-transparent p-1.5 text-zinc-500 transition-colors hover:text-zinc-100"
              title="Refresh current video"
            >
              <RefreshCw size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {currentVideo ? (
              <NoteEditor videoId={currentVideo.videoId} />
            ) : (
              <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-dashed border-zinc-800 px-6 text-center text-xs text-zinc-500">
                Notes will attach to the current YouTube video.
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
};
