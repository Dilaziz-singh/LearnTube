import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, Clock, Plus, Download } from 'lucide-react';
import { exportAsMarkdown, exportAsText, exportAsPdf, downloadFile } from '@shared/utils/export';
import type { VideoNote } from '@shared/types';

interface Note {
  id: string;
  content: string;
  timestamp?: number; // seconds into the video
  createdAt: number;
}

interface NoteEditorProps {
  videoId: string;
}

const formatTimestamp = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const NoteEditor: React.FC<NoteEditorProps> = ({ videoId }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [content, setContent] = useState('');
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [videoTitle, setVideoTitle] = useState('YouTube Video');

  // Fetch existing notes & video title
  useEffect(() => {
    chrome.runtime.sendMessage(
      { type: 'GET_NOTES', videoId },
      (response) => {
        if (response?.data) {
          setNotes(response.data);
        } else if (response?.notes) {
          setNotes(response.notes);
        }
      }
    );

    chrome.runtime.sendMessage({ type: 'GET_CURRENT_VIDEO' }, (response) => {
      if (response?.data?.title) {
        setVideoTitle(response.data.title);
      }
    });
  }, [videoId]);

  const handleExport = useCallback((format: 'pdf' | 'md' | 'txt') => {
    const videoNotes: VideoNote[] = notes.map(n => ({
      id: n.id,
      videoId,
      content: n.content,
      timestamp: n.timestamp ?? null,
      createdAt: n.createdAt,
      updatedAt: n.createdAt
    })).reverse(); // Sort chronologically (since list is newest-first)

    const filename = `${videoTitle.replace(/[^a-zA-Z0-9]/g, '_')}_notes`;

    if (format === 'pdf') {
      exportAsPdf(videoTitle, videoNotes);
    } else if (format === 'md') {
      const mdContent = exportAsMarkdown(videoTitle, videoNotes);
      downloadFile(mdContent, `${filename}.md`, 'text/markdown');
    } else {
      const txtContent = exportAsText(videoTitle, videoNotes);
      downloadFile(txtContent, `${filename}.txt`, 'text/plain');
    }
  }, [notes, videoTitle, videoId]);

  // Get current video time
  const fetchCurrentTime = useCallback(() => {
    chrome.runtime.sendMessage(
      { type: 'GET_VIDEO_CURRENT_TIME' },
      (response) => {
        if (response?.currentTime !== undefined) {
          setCurrentTime(Math.floor(response.currentTime));
        }
      }
    );
  }, []);

  const handleAddTimestamp = useCallback(() => {
    fetchCurrentTime();
    chrome.runtime.sendMessage(
      { type: 'GET_VIDEO_CURRENT_TIME' },
      (response) => {
        if (response?.currentTime !== undefined) {
          const time = Math.floor(response.currentTime);
          const stamp = formatTimestamp(time);
          setContent((prev) => `${prev}[${stamp}] `);
          setCurrentTime(time);
        }
      }
    );
  }, [fetchCurrentTime]);

  const handleSaveNote = useCallback(() => {
    if (!content.trim()) return;

    const newNote: Note = {
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      content: content.trim(),
      timestamp: currentTime ?? undefined,
      createdAt: Date.now(),
    };

    chrome.runtime.sendMessage(
      { type: 'SAVE_NOTE', videoId, note: newNote },
      (response) => {
        if (response?.success) {
          setNotes((prev) => [newNote, ...prev]);
          setContent('');
          setCurrentTime(null);
        }
      }
    );
  }, [content, currentTime, videoId]);

  const handleDeleteNote = useCallback(
    (noteId: string) => {
      chrome.runtime.sendMessage(
        { type: 'DELETE_NOTE', videoId, noteId },
        (response) => {
          if (response?.success) {
            setNotes((prev) => prev.filter((n) => n.id !== noteId));
          }
        }
      );
    },
    [videoId]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        handleSaveNote();
      }
    },
    [handleSaveNote]
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Editor area */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a note..."
          rows={14}
          style={{
            width: '100%',
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#fafafa',
            fontSize: '13px',
            fontFamily: "'Inter', sans-serif",
            padding: '12px 14px',
            resize: 'vertical',
            minHeight: '320px',
            lineHeight: 1.6,
            boxSizing: 'border-box',
          }}
        />

        {/* Action bar */}
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{
            borderTop: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          <button
            onClick={handleAddTimestamp}
            className="flex items-center gap-1.5 border-none bg-transparent"
            style={{
              cursor: 'pointer',
              fontSize: '11px',
              color: '#52525b',
              padding: '4px 8px',
              borderRadius: '6px',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#fafafa';
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#52525b';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Clock size={12} />
            <span>Add timestamp</span>
          </button>

          <button
            onClick={handleSaveNote}
            disabled={!content.trim()}
            className="flex items-center gap-1.5 border-none"
            style={{
              cursor: content.trim() ? 'pointer' : 'default',
              fontSize: '11px',
              fontWeight: 500,
              color: content.trim() ? '#fafafa' : '#3f3f46',
              backgroundColor: content.trim()
                ? 'rgba(255,255,255,0.1)'
                : 'rgba(255,255,255,0.03)',
              padding: '5px 12px',
              borderRadius: '6px',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              if (content.trim()) {
                e.currentTarget.style.backgroundColor =
                  'rgba(255,255,255,0.15)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = content.trim()
                ? 'rgba(255,255,255,0.1)'
                : 'rgba(255,255,255,0.03)';
            }}
          >
            <Plus size={12} />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Header and Export buttons */}
      <div className="flex items-center justify-between mt-2.5 px-1 animate-fade-in">
        <span style={{ fontSize: '10px', color: '#71717a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Saved Notes ({notes.length})
        </span>
        {notes.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('pdf')}
              className="text-[10px] font-medium text-zinc-400 hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer"
            >
              PDF
            </button>
            <span style={{ fontSize: '9px', color: '#27272a' }}>•</span>
            <button
              onClick={() => handleExport('md')}
              className="text-[10px] font-medium text-zinc-400 hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer"
            >
              Markdown
            </button>
            <span style={{ fontSize: '9px', color: '#27272a' }}>•</span>
            <button
              onClick={() => handleExport('txt')}
              className="text-[10px] font-medium text-zinc-400 hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer"
            >
              Text
            </button>
          </div>
        )}
      </div>

      {/* Notes list */}
      <div className="flex flex-col gap-2">
        {notes.map((note, index) => (
          <div
            key={note.id}
            className="animate-fade-in rounded-lg px-3.5 py-3 group"
            style={{
              backgroundColor: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              animationDelay: `${index * 50}ms`,
              transition: 'background-color 150ms ease',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor =
                'rgba(255,255,255,0.04)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor =
                'rgba(255,255,255,0.02)')
            }
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                {note.timestamp !== undefined && (
                  <span
                    className="inline-block mr-2 rounded px-1.5 py-0.5"
                    style={{
                      fontSize: '10px',
                      fontFamily:
                        "'JetBrains Mono', ui-monospace, monospace",
                      color: '#71717a',
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      verticalAlign: 'middle',
                    }}
                  >
                    {formatTimestamp(note.timestamp)}
                  </span>
                )}
                <span
                  style={{
                    fontSize: '12px',
                    color: '#d4d4d8',
                    lineHeight: 1.5,
                  }}
                >
                  {note.content}
                </span>
              </div>

              <button
                onClick={() => handleDeleteNote(note.id)}
                className="border-none bg-transparent flex-shrink-0"
                style={{
                  cursor: 'pointer',
                  color: '#3f3f46',
                  padding: '2px',
                  borderRadius: '4px',
                  transition: 'all 150ms ease',
                  opacity: 0.5,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#fafafa';
                  e.currentTarget.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#3f3f46';
                  e.currentTarget.style.opacity = '0.5';
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}

        {notes.length === 0 && (
          <p
            className="text-center py-6"
            style={{ fontSize: '12px', color: '#3f3f46' }}
          >
            No notes yet. Start writing above.
          </p>
        )}
      </div>
    </div>
  );
};
