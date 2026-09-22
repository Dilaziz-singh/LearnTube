import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Clock,
  Copy,
  ExternalLink,
  HelpCircle,
  NotebookPen,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';

interface SavedNote {
  id: string;
  text: string;
  time: number | null;
  createdAt: number;
}

interface VideoMemory {
  videoId: string;
  url: string;
  title: string;
  notes: SavedNote[];
  lastLeft: number;
  updatedAt: number;
}

interface UserData {
  videos: VideoMemory[];
  activeVideoId: string | null;
  studySeconds: number;
  timerPosition: { x: number; y: number };
  timerGoalMinutes: number;
  showTimerBubble: boolean;
}

const sampleUrl = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';
const accountsKey = 'learntube:accounts';
const currentUserKey = 'learntube:currentUser';

function userDataKey(username: string): string {
  return `learntube:web:${username.toLowerCase()}`;
}

function readAccounts(): Record<string, { password: string; createdAt: number }> {
  try {
    return JSON.parse(localStorage.getItem(accountsKey) || '{}');
  } catch {
    return {};
  }
}

function readUserData(username: string): UserData {
  try {
    const saved = JSON.parse(localStorage.getItem(userDataKey(username)) || '{}') as Partial<UserData>;
    return {
      videos: saved.videos || [],
      activeVideoId: saved.activeVideoId || null,
      studySeconds: saved.studySeconds || 0,
      timerPosition: saved.timerPosition || { x: 22, y: 86 },
      timerGoalMinutes: saved.timerGoalMinutes || 60,
      showTimerBubble: saved.showTimerBubble ?? true,
    };
  } catch {
    return {
      videos: [],
      activeVideoId: null,
      studySeconds: 0,
      timerPosition: { x: 22, y: 86 },
      timerGoalMinutes: 60,
      showTimerBubble: true,
    };
  }
}

function extractVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.hostname.includes('youtu.be')) {
      return url.pathname.split('/').filter(Boolean)[0] || null;
    }
    if (url.pathname.startsWith('/shorts/')) {
      return url.pathname.split('/')[2] || null;
    }
    if (url.pathname.startsWith('/embed/')) {
      return url.pathname.split('/')[2] || null;
    }
    return url.searchParams.get('v');
  } catch {
    const directId = trimmed.match(/^[a-zA-Z0-9_-]{11}$/);
    return directId ? trimmed : null;
  }
}

function formatTime(seconds: number | null): string {
  if (seconds === null) return '';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const WebApp: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(() =>
    localStorage.getItem(currentUserKey)
  );
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authName, setAuthName] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [urlInput, setUrlInput] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState('Paste a YouTube video to start');

  const [noteDraft, setNoteDraft] = useState('');
  const [notes, setNotes] = useState<SavedNote[]>([]);
  const [videos, setVideos] = useState<VideoMemory[]>([]);

  const [timerRunning, setTimerRunning] = useState(false);
  const [studySeconds, setStudySeconds] = useState(0);
  const [timerPosition, setTimerPosition] = useState({ x: 22, y: 86 });
  const [timerGoalMinutes] = useState(60);
  const [showTimerBubble] = useState(true);

  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);

  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Load user data on login
  useEffect(() => {
    if (!currentUser) return;
    const data = readUserData(currentUser);
    setVideos(data.videos);
    setStudySeconds(data.studySeconds);
    setTimerPosition(data.timerPosition);

    if (data.activeVideoId) {
      const active = data.videos.find((video) => video.videoId === data.activeVideoId);
      if (active) {
        setVideoId(active.videoId);
        setUrlInput(active.url);
        setVideoTitle(active.title);
        setNotes(active.notes);
        setStudySeconds(active.lastLeft);
      }
    }
  }, [currentUser]);

  // Persist user data
  useEffect(() => {
    if (!currentUser) return;
    const data: UserData = {
      videos,
      activeVideoId: videoId,
      studySeconds,
      timerPosition,
      timerGoalMinutes,
      showTimerBubble,
    };
    localStorage.setItem(userDataKey(currentUser), JSON.stringify(data));
  }, [
    currentUser,
    videoId,
    videos,
    studySeconds,
    timerPosition,
    timerGoalMinutes,
    showTimerBubble,
  ]);

  // Auto-sync active video state into videos array
  useEffect(() => {
    if (!currentUser || !videoId) return;

    setVideos((current) => {
      const nextVideo: VideoMemory = {
        videoId,
        url: urlInput,
        title: videoTitle,
        notes,
        lastLeft: studySeconds,
        updatedAt: Date.now(),
      };
      const existing = current.find((video) => video.videoId === videoId);
      if (!existing) return [nextVideo, ...current];

      return current.map((video) =>
        video.videoId === videoId ? { ...video, ...nextVideo } : video
      );
    });
  }, [currentUser, videoId, urlInput, videoTitle, notes, studySeconds]);

  // Study timer tick
  useEffect(() => {
    if (!timerRunning) return;
    const interval = window.setInterval(() => {
      setStudySeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timerRunning]);

  const loadVideo = useCallback((event?: React.FormEvent) => {
    event?.preventDefault();
    const nextId = extractVideoId(urlInput);
    if (!nextId) {
      setVideoTitle('That does not look like a YouTube URL');
      setVideoId(null);
      return;
    }

    const savedVideo = videos.find((video) => video.videoId === nextId);
    if (savedVideo) {
      setVideoId(savedVideo.videoId);
      setUrlInput(savedVideo.url);
      setVideoTitle(savedVideo.title);
      setNotes(savedVideo.notes);
      setStudySeconds(savedVideo.lastLeft);
      return;
    }

    setVideoId(nextId);
    setVideoTitle(`YouTube video ${nextId}`);
    setNotes([]);
  }, [urlInput, videos]);

  const addNote = useCallback(() => {
    if (!noteDraft.trim()) return;
    const nextNote: SavedNote = {
      id: `note_${Date.now()}`,
      text: noteDraft.trim(),
      time: studySeconds > 0 ? studySeconds : null,
      createdAt: Date.now(),
    };
    setNotes((current) => [nextNote, ...current]);
    setNoteDraft('');
  }, [noteDraft, studySeconds]);

  const removeNote = useCallback((id: string) => {
    setNotes((current) => current.filter((note) => note.id !== id));
  }, []);

  const copyNoteText = useCallback((note: SavedNote) => {
    const formatted = note.time !== null ? `[${formatTime(note.time)}] ${note.text}` : note.text;
    navigator.clipboard.writeText(formatted);
    setCopiedNoteId(note.id);
    setTimeout(() => setCopiedNoteId(null), 1500);
  }, []);

  const renameCurrentVideo = useCallback((newTitle: string) => {
    setVideoTitle(newTitle);
  }, []);

  const openSavedVideo = useCallback((video: VideoMemory) => {
    setUrlInput(video.url);
    setVideoId(video.videoId);
    setVideoTitle(video.title);
    setNotes(video.notes);
    setStudySeconds(video.lastLeft);
  }, []);

  const handleAuth = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    const username = authName.trim().toLowerCase();
    const password = authPassword;
    const accounts = readAccounts();

    if (username.length < 3 || password.length < 4) {
      setAuthError('Use at least 3 characters for name and 4 for password.');
      return;
    }

    if (authMode === 'signup') {
      if (accounts[username]) {
        setAuthError('That account already exists on this browser.');
        return;
      }
      accounts[username] = { password, createdAt: Date.now() };
      localStorage.setItem(accountsKey, JSON.stringify(accounts));
      localStorage.setItem(userDataKey(username), JSON.stringify({
        videos: [],
        activeVideoId: null,
        studySeconds: 0,
        timerPosition: { x: 22, y: 86 },
        timerGoalMinutes: 60,
        showTimerBubble: true,
      } satisfies UserData));
    } else if (!accounts[username] || accounts[username].password !== password) {
      setAuthError('No matching local account found.');
      return;
    }

    localStorage.setItem(currentUserKey, username);
    setCurrentUser(username);
    setAuthName('');
    setAuthPassword('');
    setAuthError('');
  }, [authMode, authName, authPassword]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem(currentUserKey);
    setCurrentUser(null);
    setTimerRunning(false);
    setVideos([]);
    setVideoId(null);
    setUrlInput('');
    setVideoTitle('Paste a YouTube video to start');
    setNotes([]);
    setStudySeconds(0);
  }, []);

  // Draggable timer logic
  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const bubble = bubbleRef.current;
    if (!bubble) return;

    isDraggingRef.current = true;
    dragOffsetRef.current = {
      x: event.clientX - bubble.offsetLeft,
      y: event.clientY - bubble.offsetTop,
    };
    bubble.setPointerCapture(event.pointerId);
  }, []);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const nextX = Math.max(8, Math.min(window.innerWidth - 120, event.clientX - dragOffsetRef.current.x));
    const nextY = Math.max(8, Math.min(window.innerHeight - 120, event.clientY - dragOffsetRef.current.y));
    setTimerPosition({ x: nextX, y: nextY });
  }, []);

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    bubbleRef.current?.releasePointerCapture(event.pointerId);
  }, []);

  const timerProgress = useMemo(() => {
    const targetSeconds = Math.max(300, timerGoalMinutes * 60);
    return Math.min(100, Math.round((studySeconds / targetSeconds) * 100));
  }, [studySeconds, timerGoalMinutes]);

  if (!currentUser) {
    return (
      <div className="learntube-web lt-auth-shell">
        <div className="lt-auth-card">
          <div className="lt-brand">
            <div className="lt-logo">
              <BookOpen size={18} />
            </div>
            <div>
              <p className="lt-title">LearnTube</p>
              <p className="lt-subtitle">Distraction-Free Video Learning & Note Taking</p>
            </div>
          </div>

          <form className="lt-auth-form" onSubmit={handleAuth}>
            <input
              className="lt-answer"
              value={authName}
              onChange={(event) => setAuthName(event.target.value)}
              placeholder="Username"
              autoFocus
            />
            <input
              className="lt-answer"
              type="password"
              value={authPassword}
              onChange={(event) => setAuthPassword(event.target.value)}
              placeholder="Password"
            />
            {authError && <p className="lt-auth-error">{authError}</p>}
            <button className="lt-button primary" type="submit">
              {authMode === 'login' ? 'Log in' : 'Create account'}
            </button>
          </form>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="lt-muted" style={{ fontSize: 12 }}>
              {authMode === 'login' ? 'Need an account?' : 'Already have an account?'}
            </span>
            <button
              className="lt-button"
              type="button"
              onClick={() => {
                setAuthMode((mode) => (mode === 'login' ? 'signup' : 'login'));
                setAuthError('');
              }}
            >
              {authMode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="learntube-web">
      {showTimerBubble && (
        <div
          className="lt-timer-bubble"
          ref={bubbleRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ left: timerPosition.x, top: timerPosition.y }}
        >
          <div
            className="lt-timer-ring"
            style={{
              background: `conic-gradient(#f4f4f5 ${timerProgress * 3.6}deg, rgba(255, 255, 255, 0.12) 0deg)`,
            }}
          >
            <div className="lt-timer-inner">
              <span>{formatTime(studySeconds)}</span>
              <small>{timerProgress}%</small>
            </div>
          </div>
          <div className="lt-timer-actions">
            <button
              type="button"
              onClick={() => setTimerRunning((running) => !running)}
              title={timerRunning ? 'Pause timer' : 'Start timer'}
            >
              {timerRunning ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <button
              type="button"
              onClick={() => {
                setTimerRunning(false);
                setStudySeconds(0);
              }}
              title="Reset timer"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </div>
      )}

      <div className="lt-shell">
        <header className="lt-header">
          <div className="lt-brand">
            <div className="lt-logo">
              <BookOpen size={17} />
            </div>
            <div>
              <p className="lt-title">LearnTube</p>
              <p className="lt-subtitle">{videoTitle}</p>
            </div>
          </div>

          <form className="lt-url-form" onSubmit={loadVideo}>
            <input
              className="lt-url-input"
              value={urlInput}
              onChange={(event) => setUrlInput(event.target.value)}
              placeholder="Paste a YouTube URL or Video ID"
            />
            <button className="lt-button primary" type="submit">
              <Play size={14} />
              <span>Load Video</span>
            </button>
          </form>

          <div className="lt-user-pill">
            <span>{currentUser}</span>
            <button type="button" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </header>

        <main className="lt-main">
          {/* Left Column: Video Player */}
          <section className="lt-left">
            <div className="lt-player">
              {videoId ? (
                <div className="lt-player-stack">
                  <iframe
                    title={videoTitle}
                    src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                  <div className="lt-player-fallback">
                    <span>If this video blocks embeds, open directly on YouTube.</span>
                    <a
                      className="lt-button"
                      href={`https://www.youtube.com/watch?v=${videoId}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink size={13} />
                      <span>Open on YouTube</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="lt-empty-player">
                  <div>
                    <HelpCircle size={36} style={{ margin: '0 auto 12px', opacity: 0.6 }} />
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: '#e4e4e7' }}>
                      Paste a YouTube link above to start
                    </p>
                    <p className="lt-muted" style={{ margin: '8px auto 0', maxWidth: 420, lineHeight: 1.6 }}>
                      Supports standard YouTube watch URLs, short links (youtu.be), or direct video IDs.
                    </p>
                    <button
                      className="lt-button"
                      style={{ marginTop: 16 }}
                      onClick={() => {
                        setUrlInput(sampleUrl);
                        const nextId = extractVideoId(sampleUrl);
                        if (nextId) {
                          setVideoId(nextId);
                          setVideoTitle('Sample Educational Video');
                        }
                      }}
                      type="button"
                    >
                      Load sample video
                    </button>
                  </div>
                </div>
              )}
            </div>

            {videoId && (
              <div className="lt-rename-row">
                <span>Title:</span>
                <input
                  className="lt-answer"
                  value={videoTitle}
                  onChange={(event) => renameCurrentVideo(event.target.value)}
                  placeholder="Rename this video title..."
                />
              </div>
            )}
          </section>

          {/* Right Column: Notes & History */}
          <aside className="lt-right">
            <div className="lt-notes-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <NotebookPen size={18} />
                <h2 className="lt-section-title" style={{ margin: 0, fontSize: 15 }}>
                  Notes {notes.length > 0 && <span className="lt-badge">({notes.length})</span>}
                </h2>
              </div>
              <button
                className="lt-button primary"
                onClick={addNote}
                disabled={!noteDraft.trim()}
                type="button"
              >
                <Plus size={14} />
                <span>Save Note</span>
              </button>
            </div>

            {videos.length > 1 && (
              <div className="lt-history-bar">
                <div className="lt-history-label">Previous:</div>
                <div className="lt-history-chips">
                  {videos.map((v) => (
                    <button
                      key={v.videoId}
                      type="button"
                      className={`lt-history-chip ${v.videoId === videoId ? 'active' : ''}`}
                      onClick={() => openSavedVideo(v)}
                    >
                      {v.title || v.videoId}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="lt-notes-body">
              <div className="lt-editor-wrapper">
                <textarea
                  className="lt-textarea lt-notes-input"
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                      event.preventDefault();
                      addNote();
                    }
                  }}
                  placeholder="Write your study notes here while watching... (Ctrl + Enter to save note)"
                />
              </div>

              <div className="lt-notes-feed">
                <div className="lt-feed-title">
                  <span>Saved Notes</span>
                  {studySeconds > 0 && (
                    <span className="lt-timer-tag">
                      <Clock size={12} /> {formatTime(studySeconds)}
                    </span>
                  )}
                </div>

                <div className="lt-note-list">
                  {notes.map((note) => (
                    <div className="lt-note-item" key={note.id}>
                      <div className="lt-note-content">
                        {note.time !== null && (
                          <span className="lt-note-time">
                            [{formatTime(note.time)}]
                          </span>
                        )}
                        <span className="lt-note-text">{note.text}</span>
                      </div>
                      <div className="lt-note-actions">
                        <button
                          className="lt-icon-btn"
                          title="Copy note"
                          onClick={() => copyNoteText(note)}
                          type="button"
                        >
                          <Copy size={13} />
                          {copiedNoteId === note.id && <span className="lt-copied-hint">Copied!</span>}
                        </button>
                        <button
                          className="lt-icon-btn danger"
                          title="Delete note"
                          onClick={() => removeNote(note.id)}
                          type="button"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {notes.length === 0 && (
                    <div className="lt-empty-notes">
                      <NotebookPen size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
                      <p style={{ margin: 0 }}>No notes taken for this video yet.</p>
                      <small className="lt-muted">Type above and click "Save Note" or press Ctrl+Enter.</small>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
};
