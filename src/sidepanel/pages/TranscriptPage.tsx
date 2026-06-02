import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FileText, Search, Play, HelpCircle, VideoOff, RefreshCw } from 'lucide-react';
import type { TranscriptSegment } from '../../shared/types';
import { TranscriptSearch } from '../components/TranscriptSearch';

const formatTimestamp = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const TranscriptPage: React.FC = () => {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptSegment[] | null>(null);
  const [localQuery, setLocalQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);

  const fetchTranscript = useCallback((vId: string) => {
    setLoading(true);
    setError(null);
    chrome.runtime.sendMessage({ type: 'GET_TRANSCRIPT', payload: { videoId: vId } }, (response) => {
      if (response?.success && response.data) {
        setTranscript(response.data);
      } else {
        setTranscript(null);
      }
      setLoading(false);
    });
  }, []);

  const init = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'GET_CURRENT_VIDEO' }, (response) => {
      if (response?.data?.videoId) {
        setVideoId(response.data.videoId);
        setVideoTitle(response.data.title || 'YouTube Video');
        fetchTranscript(response.data.videoId);
      } else {
        setVideoId(null);
        setTranscript(null);
        setLoading(false);
      }
    });
  }, [fetchTranscript]);

  useEffect(() => {
    init();
  }, [init]);

  const handleExtract = useCallback(() => {
    if (!videoId) return;
    setExtracting(true);
    setError(null);
    chrome.runtime.sendMessage(
      { type: 'EXTRACT_TRANSCRIPT', payload: { videoId } },
      (response) => {
        setExtracting(false);
        if (response?.success && response.data) {
          setTranscript(response.data);
        } else {
          setError(response?.error || 'Failed to extract transcript. Please make sure transcripts are enabled on YouTube for this video.');
        }
      }
    );
  }, [videoId]);

  const handleTimestampClick = useCallback((time: number) => {
    chrome.runtime.sendMessage({ type: 'SEEK_VIDEO', payload: { time } });
  }, []);

  const filteredTranscript = useMemo(() => {
    if (!transcript) return [];
    if (!localQuery.trim()) return transcript;
    const q = localQuery.toLowerCase();
    return transcript.filter((seg) => seg.text.toLowerCase().includes(q));
  }, [transcript, localQuery]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3" style={{ height: '350px' }}>
        <RefreshCw size={24} className="animate-spin text-zinc-600" />
        <span className="text-xs text-zinc-500 font-medium">Analyzing video...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col px-4 pt-5 pb-6 gap-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-zinc-400" />
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100">Transcript</h1>
        </div>
        <button
          onClick={() => setShowGlobalSearch((prev) => !prev)}
          className="text-xs font-medium border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 rounded-lg px-2.5 py-1.5 transition-all duration-150 cursor-pointer"
        >
          {showGlobalSearch ? 'View Current' : 'Search All Transcripts'}
        </button>
      </div>

      {showGlobalSearch ? (
        <TranscriptSearch onNavigateTimestamp={handleTimestampClick} />
      ) : !videoId ? (
        <div className="flex flex-col items-center justify-center gap-4 px-4 py-20 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-zinc-900 border border-zinc-800">
            <VideoOff size={24} className="text-zinc-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-400">No active video detected</p>
            <p className="text-xs text-zinc-500 max-w-xs mt-1">Open a YouTube video watch page to access the transcript.</p>
          </div>
        </div>
      ) : !transcript ? (
        <div className="flex flex-col items-center justify-center gap-5 px-4 py-16 text-center bg-zinc-900/20 border border-zinc-800/40 rounded-xl">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-900">
            <HelpCircle size={22} className="text-zinc-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-300">Transcript not loaded yet</p>
            <p className="text-xs text-zinc-500 max-w-xs mt-1.5 leading-relaxed">
              We extract and index the transcript locally so you can search it, generate summaries, and take timestamped notes.
            </p>
          </div>
          <button
            onClick={handleExtract}
            disabled={extracting}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-semibold text-zinc-950 bg-zinc-100 hover:bg-white active:scale-[0.98] transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            {extracting ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Extracting Transcript...</span>
              </>
            ) : (
              <span>Extract & Index Transcript</span>
            )}
          </button>
          {error && <p className="text-xs text-zinc-400 font-medium px-2">{error}</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Local Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-3.5 text-zinc-500" />
            <input
              type="text"
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              placeholder="Search current transcript..."
              className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-zinc-200 outline-none placeholder-zinc-500 focus:border-zinc-700 transition-colors"
            />
          </div>

          <p className="text-[10px] text-zinc-500 font-semibold tracking-wider uppercase">
            {localQuery ? `Found ${filteredTranscript.length} matches` : 'Transcript Segments'}
          </p>

          {/* Transcript content */}
          <div className="flex flex-col gap-1.5 max-h-[420px] overflow-y-auto pr-1">
            {filteredTranscript.map((seg, idx) => (
              <button
                key={idx}
                onClick={() => handleTimestampClick(seg.start)}
                className="w-full flex items-start gap-3 rounded-lg p-2.5 text-left bg-zinc-900/30 border border-zinc-900 hover:bg-zinc-800/40 hover:border-zinc-800/80 transition-all duration-150 group cursor-pointer"
              >
                <span className="flex items-center gap-1 shrink-0 text-[10px] font-semibold text-zinc-400 bg-zinc-800/60 group-hover:bg-zinc-100 group-hover:text-zinc-950 px-1.5 py-0.5 rounded transition-all">
                  <Play size={8} fill="currentColor" className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  {formatTimestamp(seg.start)}
                </span>
                <span className="text-xs text-zinc-300 leading-relaxed font-normal group-hover:text-white transition-colors">
                  {seg.text}
                </span>
              </button>
            ))}

            {filteredTranscript.length === 0 && (
              <p className="text-center text-xs text-zinc-500 py-10">No matching segments found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
