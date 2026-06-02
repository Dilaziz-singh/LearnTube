import React, { useState, useEffect, useCallback } from 'react';
import { Search, Play, ArrowRight, BookOpen, RefreshCw } from 'lucide-react';
import type { TranscriptSegment } from '../../shared/types';

interface SearchResult {
  videoId: string;
  videoTitle: string;
  segment: TranscriptSegment;
}

interface TranscriptSearchProps {
  onNavigateTimestamp: (time: number) => void;
}

const formatTimestamp = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const TranscriptSearch: React.FC<TranscriptSearchProps> = ({ onNavigateTimestamp }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);
    const delay = setTimeout(() => {
      chrome.runtime.sendMessage(
        { type: 'SEARCH_TRANSCRIPTS', payload: { query } },
        (response) => {
          setSearching(false);
          if (response?.success && response.data) {
            setResults(response.data);
          }
        }
      );
    }, 300);

    return () => clearTimeout(delay);
  }, [query]);

  const handleResultClick = useCallback(
    (videoId: string, start: number) => {
      // 1. Seek the video
      onNavigateTimestamp(start);
      // 2. If the user is on a different video page, navigate YouTube to this video
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab?.id && tab.url) {
          const currentUrl = new URL(tab.url);
          const currentVideoId = currentUrl.searchParams.get('v');
          if (currentVideoId !== videoId) {
            chrome.tabs.update(tab.id, { url: `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(start)}s` });
          }
        }
      });
    },
    [onNavigateTimestamp]
  );

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Search Input */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-3.5 text-zinc-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search all indexed transcripts..."
          className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-zinc-200 outline-none placeholder-zinc-500 focus:border-zinc-700 transition-colors"
          autoFocus
        />
        {searching && (
          <RefreshCw size={12} className="absolute right-3.5 top-3.5 animate-spin text-zinc-500" />
        )}
      </div>

      <p className="text-[10px] text-zinc-500 font-semibold tracking-wider uppercase">
        {query.trim().length >= 2
          ? `Found ${results.length} matches`
          : 'Type at least 2 characters to search'}
      </p>

      {/* Results List */}
      <div className="flex flex-col gap-2.5 max-h-[400px] overflow-y-auto pr-1">
        {results.map((res, idx) => (
          <div
            key={idx}
            onClick={() => handleResultClick(res.videoId, res.segment.start)}
            className="flex flex-col gap-1.5 rounded-xl p-3 bg-zinc-900/40 border border-zinc-900 hover:border-zinc-800/80 hover:bg-zinc-800/20 transition-all duration-150 group cursor-pointer"
          >
            {/* Video metadata */}
            <div className="flex items-center justify-between gap-2 border-b border-zinc-900 pb-2 mb-0.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <BookOpen size={11} className="text-zinc-500 shrink-0" />
                <span className="text-[10px] font-medium text-zinc-400 truncate max-w-[200px]">
                  {res.videoTitle}
                </span>
              </div>
              <span className="flex items-center gap-1 text-[9px] font-semibold text-zinc-400 bg-zinc-900/80 group-hover:bg-zinc-100 group-hover:text-zinc-950 px-1.5 py-0.5 rounded transition-all">
                <Play size={6} fill="currentColor" />
                {formatTimestamp(res.segment.start)}
              </span>
            </div>

            {/* Matching text */}
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs text-zinc-300 leading-relaxed font-normal group-hover:text-zinc-200">
                {res.segment.text}
              </span>
              <ArrowRight
                size={12}
                className="text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5"
              />
            </div>
          </div>
        ))}

        {query.trim().length >= 2 && results.length === 0 && !searching && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="text-xs text-zinc-500">No transcripts found matching your search.</span>
            <span className="text-[10px] text-zinc-600 mt-1 max-w-[200px] leading-relaxed">
              Make sure you have extracted and indexed transcripts for videos you watched.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
