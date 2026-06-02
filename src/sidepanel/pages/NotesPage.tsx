import React, { useState, useEffect } from 'react';
import { PenLine, VideoOff } from 'lucide-react';
import { NoteEditor } from '../components/NoteEditor';

interface VideoInfo {
  id: string;
  title: string;
}

export const NotesPage: React.FC = () => {
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_CURRENT_VIDEO' }, (response) => {
      if (response?.videoId) {
        setVideoInfo({
          id: response.videoId,
          title: response.title ?? 'Untitled Video',
        });
      }
      setLoaded(true);
    });
  }, []);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center" style={{ height: '300px' }}>
        <div
          className="animate-pulse-soft"
          style={{ fontSize: '12px', color: '#3f3f46' }}
        >
          Loading...
        </div>
      </div>
    );
  }

  if (!videoInfo) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4" style={{ height: '400px' }}>
        <div
          className="flex items-center justify-center rounded-xl"
          style={{
            width: '56px',
            height: '56px',
            backgroundColor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <VideoOff size={24} color="#3f3f46" strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <p
            style={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#71717a',
              margin: '0 0 6px 0',
            }}
          >
            No video detected
          </p>
          <p
            style={{
              fontSize: '12px',
              color: '#3f3f46',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Open a YouTube video to take notes
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col px-4 pt-5 pb-4 gap-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <PenLine size={15} color="#52525b" strokeWidth={1.8} />
          <h1
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#fafafa',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Notes
          </h1>
        </div>
        <p
          style={{
            fontSize: '12px',
            color: '#52525b',
            margin: '4px 0 0 0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {videoInfo.title}
        </p>
      </div>

      {/* Note Editor */}
      <NoteEditor videoId={videoInfo.id} />
    </div>
  );
};
