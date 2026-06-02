import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, ArrowRight, VideoOff, RefreshCw, Key, BookOpen, Clipboard, Check } from 'lucide-react';
import type { AISummary } from '../../shared/types';

const formatTimestamp = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const SummaryPage: React.FC = () => {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [hasTranscript, setHasTranscript] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchSummary = useCallback((vId: string) => {
    setLoading(true);
    setError(null);
    chrome.runtime.sendMessage({ type: 'GET_SUMMARY', payload: { videoId: vId } }, (response) => {
      if (response?.success && response.data) {
        setSummary(response.data);
      } else {
        setSummary(null);
      }
      // Check if transcript exists to enable generation
      chrome.runtime.sendMessage({ type: 'GET_TRANSCRIPT', payload: { videoId: vId } }, (res) => {
        setHasTranscript(!!res?.data && res.data.length > 0);
        setLoading(false);
      });
    });
  }, []);

  const init = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'GET_CURRENT_VIDEO' }, (response) => {
      if (response?.data?.videoId) {
        setVideoId(response.data.videoId);
        fetchSummary(response.data.videoId);
      } else {
        setVideoId(null);
        setSummary(null);
        setLoading(false);
      }
    });
  }, [fetchSummary]);

  useEffect(() => {
    init();
  }, [init]);

  const handleGenerate = useCallback(() => {
    if (!videoId) return;
    setGenerating(true);
    setError(null);
    chrome.runtime.sendMessage(
      { type: 'GENERATE_SUMMARY', payload: { videoId } },
      (response) => {
        setGenerating(false);
        if (response?.success && response.data) {
          setSummary(response.data);
        } else {
          setError(response?.error || 'Failed to generate summary. Please check your Gemini API key in settings.');
        }
      }
    );
  }, [videoId]);

  const handleTimestampClick = useCallback((time: number) => {
    chrome.runtime.sendMessage({ type: 'SEEK_VIDEO', payload: { time } });
  }, []);

  const handleCopy = useCallback(() => {
    if (!summary) return;
    const text = `
OVERVIEW:
${summary.overview}

KEY CONCEPTS:
${summary.keyConcepts.map(c => `- ${c}`).join('\n')}

TAKEAWAYS:
${summary.takeaways.map(t => `- ${t}`).join('\n')}

ACTION ITEMS:
${summary.actionItems.map(a => `- ${a}`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [summary]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3" style={{ height: '350px' }}>
        <RefreshCw size={24} className="animate-spin text-zinc-600" />
        <span className="text-xs text-zinc-500 font-medium">Loading summary...</span>
      </div>
    );
  }

  if (!videoId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-20 text-center">
        <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-zinc-900 border border-zinc-800">
          <VideoOff size={24} className="text-zinc-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-400">No active video detected</p>
          <p className="text-xs text-zinc-500 max-w-xs mt-1">Open a YouTube video watch page to generate summaries.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col px-4 pt-5 pb-6 gap-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-zinc-400" />
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100 font-sans">AI Summary</h1>
        </div>
        {summary && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs font-medium border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 rounded-lg px-2.5 py-1.5 transition-all duration-150 cursor-pointer"
          >
            {copied ? <Check size={12} /> : <Clipboard size={12} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        )}
      </div>

      {!summary ? (
        <div className="flex flex-col items-center justify-center gap-5 px-4 py-16 text-center bg-zinc-900/20 border border-zinc-800/40 rounded-xl">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-900">
            <Sparkles size={22} className="text-zinc-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-300">Generate AI Summary</p>
            <p className="text-xs text-zinc-500 max-w-xs mt-2 leading-relaxed">
              {!hasTranscript
                ? 'To generate an AI summary, please load the transcript first in the Transcript tab.'
                : 'Click below to analyze the transcript and generate a structured summary of this video.'}
            </p>
          </div>
          
          <button
            onClick={handleGenerate}
            disabled={generating || !hasTranscript}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-semibold text-zinc-950 bg-zinc-100 hover:bg-white active:scale-[0.98] transition-all duration-150 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            {generating ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Generating Summary...</span>
              </>
            ) : (
              <span>Generate Summary</span>
            )}
          </button>
          {error && <p className="text-xs text-zinc-400 font-medium px-2">{error}</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Overview */}
          <div className="flex flex-col gap-2 rounded-xl p-4 bg-zinc-900/40 border border-zinc-900">
            <h2 className="text-[10px] text-zinc-500 font-semibold tracking-wider uppercase">Overview</h2>
            <p className="text-xs text-zinc-300 leading-relaxed font-normal">{summary.overview}</p>
          </div>

          {/* Key Concepts */}
          <div className="flex flex-col gap-2 rounded-xl p-4 bg-zinc-900/40 border border-zinc-900">
            <h2 className="text-[10px] text-zinc-500 font-semibold tracking-wider uppercase">Key Concepts</h2>
            <div className="flex flex-col gap-2">
              {summary.keyConcepts.map((concept, idx) => (
                <div key={idx} className="flex gap-2.5 items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 mt-1.5 shrink-0" />
                  <span className="text-xs text-zinc-300 leading-relaxed font-normal">{concept}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Takeaways & Action Items */}
          <div className="grid grid-cols-1 gap-4">
            {summary.takeaways && summary.takeaways.length > 0 && (
              <div className="flex flex-col gap-2 rounded-xl p-4 bg-zinc-900/40 border border-zinc-900">
                <h2 className="text-[10px] text-zinc-500 font-semibold tracking-wider uppercase">Key Takeaways</h2>
                <div className="flex flex-col gap-2">
                  {summary.takeaways.map((takeaway, idx) => (
                    <div key={idx} className="flex gap-2.5 items-start">
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 mt-1.5 shrink-0" />
                      <span className="text-xs text-zinc-300 leading-relaxed font-normal">{takeaway}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summary.actionItems && summary.actionItems.length > 0 && (
              <div className="flex flex-col gap-2 rounded-xl p-4 bg-zinc-900/40 border border-zinc-900">
                <h2 className="text-[10px] text-zinc-500 font-semibold tracking-wider uppercase">Action Items</h2>
                <div className="flex flex-col gap-2">
                  {summary.actionItems.map((action, idx) => (
                    <div key={idx} className="flex gap-2.5 items-start">
                      <ArrowRight size={12} className="text-zinc-500 shrink-0 mt-0.5" />
                      <span className="text-xs text-zinc-300 leading-relaxed font-normal">{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Timeline Chapters */}
          {summary.chapters && summary.chapters.length > 0 && (
            <div className="flex flex-col gap-3 rounded-xl p-4 bg-zinc-900/40 border border-zinc-900">
              <h2 className="text-[10px] text-zinc-500 font-semibold tracking-wider uppercase">Logical Chapters</h2>
              <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1">
                {summary.chapters.map((chapter, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleTimestampClick(chapter.timestamp)}
                    className="w-full flex items-center justify-between gap-3 rounded-lg p-2 text-left bg-zinc-950/40 border border-zinc-950 hover:bg-zinc-900 hover:border-zinc-800 transition-all duration-150 group cursor-pointer"
                  >
                    <span className="text-xs font-medium text-zinc-300 group-hover:text-white truncate">
                      {chapter.title}
                    </span>
                    <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-900 group-hover:bg-zinc-100 group-hover:text-zinc-950 px-1.5 py-0.5 rounded transition-all shrink-0">
                      {formatTimestamp(chapter.timestamp)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
