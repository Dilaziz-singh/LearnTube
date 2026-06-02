import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clipboard,
  FileText,
  HelpCircle,
  KeyRound,
  Library,
  ListChecks,
  NotebookPen,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  Trash2,
} from 'lucide-react';

type TabId = 'summary' | 'quiz' | 'transcript' | 'library' | 'settings';

interface SavedNote {
  id: string;
  text: string;
  time: number | null;
  createdAt: number;
}

interface AIQuizQuestion {
  id: string;
  type: 'multiple-choice' | 'short-answer';
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

interface VideoMemory {
  videoId: string;
  url: string;
  title: string;
  notes: SavedNote[];
  transcript: string;
  aiSummary: string;
  aiQuiz: AIQuizQuestion[];
  lastLeft: number;
  updatedAt: number;
}

interface UserData {
  videos: VideoMemory[];
  activeVideoId: string | null;
  studySeconds: number;
  timerPosition: { x: number; y: number };
  transcriptApiKey: string;
  googleApiKey: string;
  aiModel: string;
  timerGoalMinutes: number;
  showTimerBubble: boolean;
  autoTranscriptOnLoad: boolean;
  autoGenerateLearning: boolean;
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
      transcriptApiKey: saved.transcriptApiKey || '',
      googleApiKey: saved.googleApiKey || '',
      aiModel: saved.aiModel || 'gemini-2.0-flash',
      timerGoalMinutes: saved.timerGoalMinutes || 60,
      showTimerBubble: saved.showTimerBubble ?? true,
      autoTranscriptOnLoad: saved.autoTranscriptOnLoad ?? false,
      autoGenerateLearning: saved.autoGenerateLearning ?? false,
    };
  } catch {
    return {
      videos: [],
      activeVideoId: null,
      studySeconds: 0,
      timerPosition: { x: 22, y: 86 },
      transcriptApiKey: '',
      googleApiKey: '',
      aiModel: 'gemini-2.0-flash',
      timerGoalMinutes: 60,
      showTimerBubble: true,
      autoTranscriptOnLoad: false,
      autoGenerateLearning: false,
    };
  }
}

type SupadataTranscriptResponse =
  | {
      content: string | { text: string; offset?: number; duration?: number; lang?: string }[];
      lang?: string;
      availableLangs?: string[];
    }
  | { jobId: string };

function transcriptResponseToText(response: SupadataTranscriptResponse): string {
  if ('jobId' in response) return '';
  if (typeof response.content === 'string') return response.content;
  return response.content.map((item) => item.text).join('\n');
}

async function fetchSupadataTranscript(url: string, apiKey: string): Promise<string> {
  const params = new URLSearchParams({
    url,
    lang: 'en',
    text: 'true',
    mode: 'auto',
  });

  const response = await fetch(`https://api.supadata.ai/v1/transcript?${params.toString()}`, {
    headers: { 'x-api-key': apiKey },
  });

  if (!response.ok) {
    throw new Error(`Transcript request failed (${response.status})`);
  }

  const data = (await response.json()) as SupadataTranscriptResponse;
  if (!('jobId' in data)) return transcriptResponseToText(data);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, 1800));
    const jobResponse = await fetch(`https://api.supadata.ai/v1/transcript/${data.jobId}`, {
      headers: { 'x-api-key': apiKey },
    });
    if (!jobResponse.ok) continue;
    const jobData = (await jobResponse.json()) as SupadataTranscriptResponse;
    const text = transcriptResponseToText(jobData);
    if (text) return text;
  }

  throw new Error('Transcript is still processing. Try again in a moment.');
}

type GeminiPart = { text?: string };
type GeminiResponse = {
  candidates?: { content?: { parts?: GeminiPart[] } }[];
  error?: { message?: string };
};

function parseJsonFromText<T>(text: string): T {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  return JSON.parse(cleaned) as T;
}

async function generateWithGemini(prompt: string, apiKey: string, model: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.35,
        },
      }),
    }
  );

  const data = (await response.json()) as GeminiResponse;
  if (!response.ok) {
    throw new Error(data.error?.message || `Google AI request failed (${response.status})`);
  }

  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
  if (!text) throw new Error('Google AI returned an empty response.');
  return text;
}

async function generateAISummary(transcript: string, apiKey: string, model: string): Promise<string> {
  return generateWithGemini(
    `Create polished study notes from this YouTube transcript.

Rules:
- Write in Markdown.
- Do not copy the transcript.
- Start with a short overview, then key concepts, examples, formulas, and final takeaways.
- If math/formulas are needed, write them in LaTeX using inline $...$ or display $$...$$.
- Keep it accurate to the transcript and useful for revision.
- Do not say "here is" or mention the transcript.

Transcript:
${transcript}`,
    apiKey,
    model
  );
}

async function generateAIQuiz(
  transcript: string,
  apiKey: string,
  model: string
): Promise<AIQuizQuestion[]> {
  const text = await generateWithGemini(
    `Create a quiz from this YouTube transcript.

Return ONLY valid JSON. No Markdown fences.
Schema:
[
  {
    "id": "q1",
    "type": "multiple-choice",
    "question": "Question text",
    "options": ["A", "B", "C", "D"],
    "answer": "Correct answer exactly",
    "explanation": "Why this answer is correct"
  }
]

Rules:
- Make 6 questions.
- Use multiple-choice for at least 4 questions.
- Use short-answer for the rest.
- Do not copy transcript lines directly.
- If math appears, use LaTeX in question/explanation strings with $...$.

Transcript:
${transcript}`,
    apiKey,
    model
  );

  const parsed = parseJsonFromText<Partial<AIQuizQuestion>[]>(text);
  return parsed.map((question, index) => ({
    id: question.id || `ai_q_${index + 1}`,
    type: question.type === 'short-answer' ? 'short-answer' : 'multiple-choice',
    question: question.question || `Question ${index + 1}`,
    options: Array.isArray(question.options) ? question.options : [],
    answer: question.answer || '',
    explanation: question.explanation || '',
  }));
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

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 24);
}

function createSummary(transcript: string): string[] {
  const sentences = splitSentences(transcript);
  if (sentences.length === 0) return [];

  return sentences
    .sort((a, b) => b.length - a.length)
    .slice(0, 5)
    .map((sentence) => sentence.replace(/^[-–•\s]+/, ''));
}

function createQuiz(transcript: string): AIQuizQuestion[] {
  const sentences = splitSentences(transcript).slice(0, 8);
  return sentences.map((sentence, index) => {
    const words = sentence.match(/[A-Za-z][A-Za-z-]{5,}/g) || [];
    const answer = words.sort((a, b) => b.length - a.length)[0] || 'concept';
    return {
      id: `q_${index}_${answer}`,
      type: 'short-answer',
      question: sentence.replace(new RegExp(`\\b${answer}\\b`, 'i'), '_____'),
      options: [],
      answer,
      explanation: '',
    };
  });
}

function cleanTranscriptText(text: string): string {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^\d{1,2}:\d{2}(?::\d{2})?$/.test(line))
    .join('\n');
}

function renderTextWithMath(text: string): React.ReactNode[] {
  return text.split(/(\$[^$\n]+\$)/g).map((part, index) => {
    if (part.startsWith('$') && part.endsWith('$')) {
      return (
        <span className="lt-math-inline" key={`${part}_${index}`}>
          {part.slice(1, -1)}
        </span>
      );
    }
    return <React.Fragment key={`${part}_${index}`}>{part}</React.Fragment>;
  });
}

const MarkdownMath: React.FC<{ content: string }> = ({ content }) => {
  const elements: React.ReactNode[] = [];
  const lines = content.split('\n');
  let displayMath = '';

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('$$')) {
      displayMath = trimmed.replace(/^\$\$/, '');
      if (trimmed.endsWith('$$') && trimmed.length > 2) {
        elements.push(
          <div className="lt-math-block" key={`math_${index}`}>
            {displayMath.replace(/\$\$$/, '')}
          </div>
        );
        displayMath = '';
      }
      return;
    }
    if (displayMath) {
      if (trimmed.endsWith('$$')) {
        elements.push(
          <div className="lt-math-block" key={`math_${index}`}>
            {`${displayMath}\n${trimmed.replace(/\$\$$/, '')}`.trim()}
          </div>
        );
        displayMath = '';
      } else {
        displayMath = `${displayMath}\n${trimmed}`;
      }
      return;
    }
    if (!trimmed) {
      elements.push(<div className="lt-md-space" key={`space_${index}`} />);
      return;
    }
    if (trimmed.startsWith('### ')) {
      elements.push(<h4 key={index}>{renderTextWithMath(trimmed.slice(4))}</h4>);
      return;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(<h3 key={index}>{renderTextWithMath(trimmed.slice(3))}</h3>);
      return;
    }
    if (trimmed.startsWith('# ')) {
      elements.push(<h2 key={index}>{renderTextWithMath(trimmed.slice(2))}</h2>);
      return;
    }
    if (/^[-*]\s+/.test(trimmed)) {
      elements.push(<li key={index}>{renderTextWithMath(trimmed.replace(/^[-*]\s+/, ''))}</li>);
      return;
    }
    if (/^\d+\.\s+/.test(trimmed)) {
      elements.push(<p key={index}>{renderTextWithMath(trimmed)}</p>);
      return;
    }
    elements.push(<p key={index}>{renderTextWithMath(trimmed)}</p>);
  });

  return <div className="lt-markdown">{elements}</div>;
};

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
  const [activeTab, setActiveTab] = useState<TabId>('summary');
  const [noteDraft, setNoteDraft] = useState('');
  const [notes, setNotes] = useState<SavedNote[]>([]);
  const [videos, setVideos] = useState<VideoMemory[]>([]);
  const [transcript, setTranscript] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [aiQuiz, setAiQuiz] = useState<AIQuizQuestion[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timerRunning, setTimerRunning] = useState(false);
  const [studySeconds, setStudySeconds] = useState(0);
  const [timerPosition, setTimerPosition] = useState({ x: 22, y: 86 });
  const [transcriptApiKey, setTranscriptApiKey] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [aiModel, setAiModel] = useState('gemini-2.0-flash');
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptError, setTranscriptError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [timerGoalMinutes, setTimerGoalMinutes] = useState(60);
  const [showTimerBubble, setShowTimerBubble] = useState(true);
  const [autoTranscriptOnLoad, setAutoTranscriptOnLoad] = useState(false);
  const [autoGenerateLearning, setAutoGenerateLearning] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!currentUser) return;

    const data = readUserData(currentUser);
    const activeVideo = data.videos.find((video) => video.videoId === data.activeVideoId);
    setVideos(data.videos);
    setStudySeconds(data.studySeconds);
    setTimerPosition(data.timerPosition);
    setTranscriptApiKey(data.transcriptApiKey);
    setGoogleApiKey(data.googleApiKey);
    setAiModel(data.aiModel);
    setTimerGoalMinutes(data.timerGoalMinutes);
    setShowTimerBubble(data.showTimerBubble);
    setAutoTranscriptOnLoad(data.autoTranscriptOnLoad);
    setAutoGenerateLearning(data.autoGenerateLearning);

    if (activeVideo) {
      setUrlInput(activeVideo.url);
      setVideoId(activeVideo.videoId);
      setVideoTitle(activeVideo.title);
      setNotes(activeVideo.notes);
      setTranscript(activeVideo.transcript);
      setAiSummary(activeVideo.aiSummary || '');
      setAiQuiz(activeVideo.aiQuiz || []);
      setStudySeconds(activeVideo.lastLeft || data.studySeconds);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    localStorage.setItem(
      userDataKey(currentUser),
      JSON.stringify({
        videos,
        activeVideoId: videoId,
        studySeconds,
        timerPosition,
        transcriptApiKey,
        googleApiKey,
        aiModel,
        timerGoalMinutes,
        showTimerBubble,
        autoTranscriptOnLoad,
        autoGenerateLearning,
      } satisfies UserData)
    );
  }, [
    currentUser,
    videoId,
    videos,
    studySeconds,
    timerPosition,
    transcriptApiKey,
    googleApiKey,
    aiModel,
    timerGoalMinutes,
    showTimerBubble,
    autoTranscriptOnLoad,
    autoGenerateLearning,
  ]);

  useEffect(() => {
    if (!currentUser || !videoId) return;

    setVideos((current) => {
      const nextVideo: VideoMemory = {
        videoId,
        url: urlInput,
        title: videoTitle,
        notes,
        transcript,
        aiSummary,
        aiQuiz,
        lastLeft: studySeconds,
        updatedAt: Date.now(),
      };
      const existing = current.find((video) => video.videoId === videoId);
      if (!existing) return [nextVideo, ...current];

      return current.map((video) =>
        video.videoId === videoId ? { ...video, ...nextVideo } : video
      );
    });
  }, [currentUser, videoId, urlInput, videoTitle, notes, transcript, aiSummary, aiQuiz, studySeconds]);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = window.setInterval(() => {
      setStudySeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timerRunning]);

  const transcriptLines = useMemo(
    () => transcript.split('\n').map((line) => line.trim()).filter(Boolean),
    [transcript]
  );
  const filteredTranscript = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return transcriptLines;
    return transcriptLines.filter((line) => line.toLowerCase().includes(query));
  }, [searchQuery, transcriptLines]);

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
      setTranscript(savedVideo.transcript);
      setAiSummary(savedVideo.aiSummary || '');
      setAiQuiz(savedVideo.aiQuiz || []);
      setStudySeconds(savedVideo.lastLeft);
      return;
    }

    setVideoId(nextId);
    setVideoTitle(`YouTube video ${nextId}`);
    setNotes([]);
    setTranscript('');
    setAiSummary('');
    setAiQuiz([]);
    setAnswers({});
  }, [urlInput, videos]);

  const addNote = useCallback(() => {
    if (!noteDraft.trim()) return;
    const nextNote: SavedNote = {
      id: `note_${Date.now()}`,
      text: noteDraft.trim(),
      time: studySeconds,
      createdAt: Date.now(),
    };
    setNotes((current) => [nextNote, ...current]);
    setNoteDraft('');
  }, [noteDraft, studySeconds]);

  const removeNote = useCallback((id: string) => {
    setNotes((current) => current.filter((note) => note.id !== id));
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
        transcriptApiKey: '',
        googleApiKey: '',
        aiModel: 'gemini-2.0-flash',
        timerGoalMinutes: 60,
        showTimerBubble: true,
        autoTranscriptOnLoad: false,
        autoGenerateLearning: false,
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
    setTranscript('');
    setAiSummary('');
    setAiQuiz([]);
    setStudySeconds(0);
  }, []);

  const openSavedVideo = useCallback((video: VideoMemory) => {
    setUrlInput(video.url);
    setVideoId(video.videoId);
    setVideoTitle(video.title);
    setNotes(video.notes);
    setTranscript(video.transcript);
    setAiSummary(video.aiSummary || '');
    setAiQuiz(video.aiQuiz || []);
    setStudySeconds(video.lastLeft);
    setAnswers({});
  }, []);

  const pasteTranscriptFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setTranscript(cleanTranscriptText(text));
      setAiSummary('');
      setAiQuiz([]);
    } catch {
      setTranscript((current) => current);
    }
  }, []);

  const generateLearningContent = useCallback(async () => {
    if (!transcript.trim()) {
      setAiError('Fetch or paste a transcript first.');
      return;
    }
    if (!googleApiKey.trim()) {
      setAiError('Add your Google AI Studio key first.');
      setActiveTab('settings');
      return;
    }

    setAiLoading(true);
    setAiError('');
    try {
      const [nextSummary, nextQuiz] = await Promise.all([
        generateAISummary(transcript, googleApiKey.trim(), aiModel.trim() || 'gemini-2.0-flash'),
        generateAIQuiz(transcript, googleApiKey.trim(), aiModel.trim() || 'gemini-2.0-flash'),
      ]);
      setAiSummary(nextSummary);
      setAiQuiz(nextQuiz);
      setActiveTab('summary');
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Could not generate learning content.');
    } finally {
      setAiLoading(false);
    }
  }, [aiModel, googleApiKey, transcript]);

  const fetchTranscriptAutomatically = useCallback(async () => {
    if (!urlInput.trim() || !extractVideoId(urlInput)) {
      setTranscriptError('Load a valid YouTube URL first.');
      return;
    }
    if (!transcriptApiKey.trim()) {
      setTranscriptError('Add your Supadata API key first.');
      return;
    }

    setTranscriptLoading(true);
    setTranscriptError('');
    try {
      const text = await fetchSupadataTranscript(urlInput, transcriptApiKey.trim());
      setTranscript(cleanTranscriptText(text));
      setAiSummary('');
      setAiQuiz([]);
      setActiveTab('summary');
    } catch (error) {
      setTranscriptError(error instanceof Error ? error.message : 'Could not fetch transcript.');
    } finally {
      setTranscriptLoading(false);
    }
  }, [transcriptApiKey, urlInput]);

  useEffect(() => {
    if (!autoGenerateLearning || !transcript || aiSummary || aiLoading || !googleApiKey) return;
    generateLearningContent();
  }, [
    aiLoading,
    aiSummary,
    autoGenerateLearning,
    generateLearningContent,
    googleApiKey,
    transcript,
  ]);

  useEffect(() => {
    if (!autoTranscriptOnLoad || !videoId || transcript || !transcriptApiKey || transcriptLoading) return;
    fetchTranscriptAutomatically();
  }, [
    autoTranscriptOnLoad,
    fetchTranscriptAutomatically,
    transcript,
    transcriptApiKey,
    transcriptLoading,
    videoId,
  ]);

  const renameCurrentVideo = useCallback((title: string) => {
    setVideoTitle(title || 'Untitled video');
  }, []);

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'summary', label: 'Summary', icon: Sparkles },
    { id: 'quiz', label: 'Quiz', icon: ListChecks },
    { id: 'transcript', label: 'Transcript', icon: FileText },
    { id: 'library', label: 'Library', icon: Library },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const timerGoalSeconds = Math.max(5, timerGoalMinutes) * 60;
  const timerProgress = Math.min(1, studySeconds / timerGoalSeconds);
  const timerRingStyle = {
    background: `conic-gradient(#f4f4f5 ${Math.round(timerProgress * 360)}deg, rgba(255,255,255,0.12) 0deg)`,
  };

  const handleTimerPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (target.closest('button')) return;

      event.currentTarget.setPointerCapture(event.pointerId);
      dragOffset.current = {
        x: event.clientX - timerPosition.x,
        y: event.clientY - timerPosition.y,
      };
    },
    [timerPosition]
  );

  const handleTimerPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const nextX = Math.max(8, Math.min(window.innerWidth - 126, event.clientX - dragOffset.current.x));
    const nextY = Math.max(8, Math.min(window.innerHeight - 126, event.clientY - dragOffset.current.y));
    setTimerPosition({ x: nextX, y: nextY });
  }, []);

  if (!currentUser) {
    return (
      <div className="learntube-web">
        <main className="lt-auth-shell">
          <section className="lt-auth-card">
            <div className="lt-logo">
              <BookOpen size={18} />
            </div>
            <div>
              <h1 className="lt-auth-title">LearnTube</h1>
              <p className="lt-muted" style={{ lineHeight: 1.6 }}>
                Sign in locally to keep your videos, transcripts, notes, and last-left timestamps separated on this browser.
              </p>
            </div>

            <form className="lt-auth-form" onSubmit={handleAuth}>
              <input
                className="lt-url-input"
                value={authName}
                onChange={(event) => setAuthName(event.target.value)}
                placeholder="Username"
              />
              <input
                className="lt-url-input"
                type="password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                placeholder="Password"
              />
              {authError && <p className="lt-auth-error">{authError}</p>}
              <button className="lt-button primary" type="submit">
                {authMode === 'login' ? 'Log in' : 'Sign up'}
              </button>
            </form>

            <button
              className="lt-button"
              type="button"
              onClick={() => {
                setAuthMode((mode) => (mode === 'login' ? 'signup' : 'login'));
                setAuthError('');
              }}
            >
              {authMode === 'login' ? 'Create local account' : 'Use existing account'}
            </button>

            <p className="lt-auth-note">
              Local-only MVP: this gates the app and persists data on this device. Real cloud login later requires a backend/auth provider.
            </p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="learntube-web">
      {showTimerBubble && (
        <div
          className="lt-timer-bubble"
          style={{ left: timerPosition.x, top: timerPosition.y }}
          onPointerDown={handleTimerPointerDown}
          onPointerMove={handleTimerPointerMove}
        >
        <div className="lt-timer-ring" style={timerRingStyle}>
          <div className="lt-timer-inner">
            <span>{formatTime(studySeconds)}</span>
            <small>{Math.round(timerProgress * 100)}%</small>
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
              placeholder="Paste a YouTube URL"
            />
            <button className="lt-button primary" type="submit">
              <Play size={14} />
              <span>Load</span>
            </button>
            <button
              className="lt-button"
              type="button"
              onClick={fetchTranscriptAutomatically}
              disabled={!videoId || transcriptLoading}
            >
              {transcriptLoading ? <RefreshCw size={14} className="lt-spin" /> : <FileText size={14} />}
              <span>Auto transcript</span>
            </button>
            <button
              className="lt-button"
              type="button"
              onClick={generateLearningContent}
              disabled={!transcript || aiLoading}
            >
              {aiLoading ? <RefreshCw size={14} className="lt-spin" /> : <Sparkles size={14} />}
              <span>Generate</span>
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
                    <span>If this video blocks embeds, open it on YouTube.</span>
                    <a
                      className="lt-button"
                      href={`https://www.youtube.com/watch?v=${videoId}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open video
                    </a>
                  </div>
                </div>
              ) : (
                <div className="lt-empty-player">
                  <div>
                    <HelpCircle size={30} style={{ margin: '0 auto 12px' }} />
                    <p style={{ margin: 0, fontWeight: 750, color: '#d4d4d8' }}>
                      Paste a YouTube link above
                    </p>
                    <p className="lt-muted" style={{ margin: '8px auto 0', maxWidth: 420, lineHeight: 1.6 }}>
                      Try a normal watch URL, a youtu.be short link, an embed URL, or an 11-character video ID.
                    </p>
                    <button
                      className="lt-button"
                      style={{ marginTop: 16 }}
                      onClick={() => setUrlInput(sampleUrl)}
                      type="button"
                    >
                      Use sample format
                    </button>
                  </div>
                </div>
              )}
            </div>

            {videoId && (
              <div className="lt-rename-row">
                <span>Title</span>
                <input
                  className="lt-answer"
                  value={videoTitle}
                  onChange={(event) => renameCurrentVideo(event.target.value)}
                  placeholder="Rename this video"
                />
              </div>
            )}

            <div className="lt-tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    className={`lt-tab ${activeTab === tab.id ? 'active' : ''}`}
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    type="button"
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="lt-panel">
              {activeTab === 'summary' && (
                <div>
                  <h2 className="lt-section-title">
                    <Sparkles size={17} />
                    Summary
                  </h2>
                  {aiError && <p className="lt-auth-error">{aiError}</p>}
                  {aiSummary ? (
                    <div className="lt-result lt-summary-result">
                      <MarkdownMath content={aiSummary} />
                    </div>
                  ) : (
                    <div className="lt-result">
                      <p style={{ margin: 0, fontWeight: 750 }}>
                        {transcript ? 'Generate AI summary' : 'Transcript needed'}
                      </p>
                      <p className="lt-muted" style={{ margin: '8px 0 0', lineHeight: 1.6 }}>
                        {transcript
                          ? 'Use your Google AI Studio key to create real study notes from the transcript.'
                          : 'Fetch the transcript with Supadata first, then generate the summary with Google AI.'}
                      </p>
                      <button
                        className="lt-button primary"
                        style={{ marginTop: 12 }}
                        type="button"
                        onClick={generateLearningContent}
                        disabled={!transcript || aiLoading}
                      >
                        {aiLoading ? <RefreshCw size={14} className="lt-spin" /> : <Sparkles size={14} />}
                        Generate summary and quiz
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'quiz' && (
                <div>
                  <h2 className="lt-section-title">
                    <ListChecks size={17} />
                    Quiz
                  </h2>
                  {aiError && <p className="lt-auth-error">{aiError}</p>}
                  {aiQuiz.length > 0 ? (
                    <div className="lt-grid">
                      {aiQuiz.map((question, index) => {
                        const userAnswer = answers[question.id] || '';
                        const isCorrect =
                          userAnswer.trim().toLowerCase() === question.answer.trim().toLowerCase();
                        return (
                          <div className="lt-question" key={question.id}>
                            <p style={{ margin: 0, lineHeight: 1.55, fontWeight: 750 }}>
                              {index + 1}. {renderTextWithMath(question.question)}
                            </p>
                            {question.options.length > 0 ? (
                              <div className="lt-options">
                                {question.options.map((option) => (
                                  <button
                                    className={`lt-option ${userAnswer === option ? 'selected' : ''}`}
                                    key={option}
                                    onClick={() =>
                                      setAnswers((current) => ({ ...current, [question.id]: option }))
                                    }
                                    type="button"
                                  >
                                    {renderTextWithMath(option)}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <input
                                className="lt-answer"
                                style={{ marginTop: 10 }}
                                value={userAnswer}
                                onChange={(event) =>
                                  setAnswers((current) => ({
                                    ...current,
                                    [question.id]: event.target.value,
                                  }))
                                }
                                placeholder="Answer"
                              />
                            )}
                            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                              {userAnswer && (
                                <span
                                  className="lt-button"
                                  style={{
                                    color: isCorrect ? '#86efac' : '#fca5a5',
                                    minWidth: 96,
                                  }}
                                >
                                  <CheckCircle2 size={13} />
                                  {isCorrect ? 'Correct' : question.answer}
                                </span>
                              )}
                              {userAnswer && question.explanation && (
                                <div className="lt-explanation">
                                  {renderTextWithMath(question.explanation)}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="lt-result">
                      <p style={{ margin: 0, fontWeight: 750 }}>No quiz yet</p>
                      <p className="lt-muted" style={{ margin: '8px 0 0', lineHeight: 1.6 }}>
                        {transcript
                          ? 'Generate a quiz with Google AI Studio instead of reusing transcript text.'
                          : 'Fetch the transcript first, then generate the quiz.'}
                      </p>
                      <button
                        className="lt-button primary"
                        style={{ marginTop: 12 }}
                        type="button"
                        onClick={generateLearningContent}
                        disabled={!transcript || aiLoading}
                      >
                        {aiLoading ? <RefreshCw size={14} className="lt-spin" /> : <ListChecks size={14} />}
                        Generate quiz
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'transcript' && (
                <div>
                  <h2 className="lt-section-title">
                    <FileText size={17} />
                    Transcript
                  </h2>
                  <div className="lt-api-row">
                    <KeyRound size={15} />
                    <input
                      className="lt-answer"
                      type="password"
                      value={transcriptApiKey}
                      onChange={(event) => setTranscriptApiKey(event.target.value)}
                      placeholder="Supadata API key for automatic transcripts"
                    />
                    <button
                      className="lt-button primary"
                      type="button"
                      onClick={fetchTranscriptAutomatically}
                      disabled={transcriptLoading || !videoId}
                    >
                      {transcriptLoading ? <RefreshCw size={14} className="lt-spin" /> : <FileText size={14} />}
                      Fetch
                    </button>
                  </div>
                  {transcriptError && <p className="lt-auth-error">{transcriptError}</p>}
                  <textarea
                    className="lt-textarea"
                    value={transcript}
                    onChange={(event) => {
                      setTranscript(event.target.value);
                      setAiSummary('');
                      setAiQuiz([]);
                    }}
                    placeholder="Paste the YouTube transcript here. You can copy it from YouTube's Show transcript panel."
                  />
                  <div className="lt-transcript-help">
                    <strong>Easier transcript flow:</strong>
                    <span>Open YouTube video - description - Show transcript - copy text - paste here.</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <Search
                        size={14}
                        style={{
                          position: 'absolute',
                          left: 10,
                          top: 11,
                          color: '#71717a',
                        }}
                      />
                      <input
                        className="lt-answer"
                        style={{ paddingLeft: 30 }}
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search transcript"
                      />
                    </div>
                    <button
                      className="lt-button"
                      type="button"
                      onClick={pasteTranscriptFromClipboard}
                    >
                      <Clipboard size={14} />
                      Paste clipboard
                    </button>
                    <button
                      className="lt-button"
                      type="button"
                      onClick={() => {
                        setTranscript((current) => cleanTranscriptText(current));
                        setAiSummary('');
                        setAiQuiz([]);
                      }}
                      disabled={!transcript}
                    >
                      Clean
                    </button>
                    <button
                      className="lt-button"
                      type="button"
                      onClick={() => navigator.clipboard.writeText(transcript)}
                      disabled={!transcript}
                    >
                      <Clipboard size={14} />
                      Copy
                    </button>
                  </div>
                  {filteredTranscript.length > 0 && (
                    <div className="lt-grid" style={{ marginTop: 12 }}>
                      {filteredTranscript.slice(0, 12).map((line, index) => (
                        <div className="lt-result" key={`${line}_${index}`}>
                          {line}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'library' && (
                <div>
                  <h2 className="lt-section-title">
                    <Library size={17} />
                    Saved Videos
                  </h2>
                  <p className="lt-muted" style={{ marginTop: -4 }}>
                    Stored locally for {currentUser}. There is no fixed app limit; browser storage is the
                    practical limit.
                  </p>
                  <div className="lt-library-grid">
                    {videos.length === 0 ? (
                      <div className="lt-result">Loaded videos will be remembered here.</div>
                    ) : (
                      videos
                        .slice()
                        .sort((a, b) => b.updatedAt - a.updatedAt)
                        .map((video) => (
                          <button
                            className={`lt-library-card ${video.videoId === videoId ? 'active' : ''}`}
                            key={video.videoId}
                            onClick={() => openSavedVideo(video)}
                            type="button"
                          >
                            <strong>{video.title}</strong>
                            <span>{video.url}</span>
                            <small>
                              left at {formatTime(video.lastLeft)} | {video.notes.length} notes |{' '}
                              {video.aiSummary ? 'AI saved' : video.transcript ? 'transcript saved' : 'no transcript'}
                            </small>
                          </button>
                        ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div>
                  <h2 className="lt-section-title">
                    <Settings size={17} />
                    Settings
                  </h2>
                  <div className="lt-settings-list">
                    <label className="lt-setting-row">
                      <div>
                        <strong>Show floating timer</strong>
                        <span>Keep the draggable study timer visible above the workspace.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={showTimerBubble}
                        onChange={(event) => setShowTimerBubble(event.target.checked)}
                      />
                    </label>
                    <label className="lt-setting-row">
                      <div>
                        <strong>Timer goal</strong>
                        <span>Choose the progress-ring target in minutes.</span>
                      </div>
                      <input
                        className="lt-small-input"
                        type="number"
                        min={5}
                        max={600}
                        value={timerGoalMinutes}
                        onChange={(event) =>
                          setTimerGoalMinutes(Math.max(5, Number(event.target.value) || 5))
                        }
                      />
                    </label>
                    <label className="lt-setting-row">
                      <div>
                        <strong>Auto-fetch transcript on load</strong>
                        <span>Use your transcript API key when a new video is loaded.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={autoTranscriptOnLoad}
                        onChange={(event) => setAutoTranscriptOnLoad(event.target.checked)}
                      />
                    </label>
                    <label className="lt-setting-row">
                      <div>
                        <strong>Auto-generate summary and quiz</strong>
                        <span>After a transcript is available, use Google AI to create learning content.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={autoGenerateLearning}
                        onChange={(event) => setAutoGenerateLearning(event.target.checked)}
                      />
                    </label>
                    <label className="lt-setting-row">
                      <div>
                        <strong>Transcript API key</strong>
                        <span>Supadata key. Stored locally for this account on this browser.</span>
                      </div>
                      <input
                        className="lt-settings-key"
                        type="password"
                        value={transcriptApiKey}
                        onChange={(event) => setTranscriptApiKey(event.target.value)}
                        placeholder="Supadata API key"
                      />
                    </label>
                    <label className="lt-setting-row">
                      <div>
                        <strong>Google AI Studio key</strong>
                        <span>Used for Gemini summaries and quizzes. Stored locally on this browser.</span>
                      </div>
                      <input
                        className="lt-settings-key"
                        type="password"
                        value={googleApiKey}
                        onChange={(event) => setGoogleApiKey(event.target.value)}
                        placeholder="Google AI Studio API key"
                      />
                    </label>
                    <label className="lt-setting-row">
                      <div>
                        <strong>Gemini model</strong>
                        <span>Default is gemini-2.0-flash.</span>
                      </div>
                      <input
                        className="lt-settings-key"
                        value={aiModel}
                        onChange={(event) => setAiModel(event.target.value)}
                        placeholder="gemini-2.0-flash"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </section>

          <aside className="lt-right">
            <div className="lt-notes-head">
              <h2 className="lt-section-title" style={{ margin: 0 }}>
                <NotebookPen size={17} />
                Notes
              </h2>
              <button className="lt-button" onClick={addNote} disabled={!noteDraft.trim()} type="button">
                <Plus size={14} />
                Save
              </button>
            </div>

            <div className="lt-library">
              <div className="lt-library-head">
                <strong>Saved videos</strong>
                <span>{videos.length}</span>
              </div>
              <div className="lt-library-list">
                {videos.length === 0 ? (
                  <p className="lt-muted">Loaded videos will be remembered here.</p>
                ) : (
                  videos
                    .slice()
                    .sort((a, b) => b.updatedAt - a.updatedAt)
                    .map((video) => (
                      <button
                        className={`lt-library-item ${video.videoId === videoId ? 'active' : ''}`}
                        key={video.videoId}
                        onClick={() => openSavedVideo(video)}
                        type="button"
                      >
                        <span>{video.title}</span>
                        <small>
                          left at {formatTime(video.lastLeft)} · {video.notes.length} notes
                        </small>
                      </button>
                    ))
                )}
              </div>
            </div>

            <div className="lt-notes-body">
              <textarea
                className="lt-textarea lt-notes-input"
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                placeholder="Write notes while watching..."
              />

              <div className="lt-note-list">
                {notes.map((note) => (
                  <div className="lt-note-item" key={note.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <p style={{ margin: 0, lineHeight: 1.55 }}>
                        {note.time !== null && (
                          <span className="lt-note-time">[{formatTime(note.time)}]</span>
                        )}
                        {note.text}
                      </p>
                      <button
                        className="lt-button"
                        style={{ minHeight: 28, padding: '0 8px' }}
                        onClick={() => removeNote(note.id)}
                        type="button"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
                {notes.length === 0 && (
                  <div className="lt-note-item lt-muted" style={{ textAlign: 'center' }}>
                    Saved notes will appear here.
                  </div>
                )}
              </div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
};
