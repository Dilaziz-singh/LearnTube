import type { YouTubePageType, VideoInfo } from '../shared/types';

export function detectPageType(): YouTubePageType {
  const url = window.location.href;
  if (url.includes('/watch')) return 'watch';
  if (url.includes('/shorts')) return 'shorts';
  if (url.includes('/results')) return 'search';
  if (url.includes('/@') || url.includes('/channel/') || url.includes('/c/')) return 'channel';
  if (url === 'https://www.youtube.com/' || url === 'https://www.youtube.com') return 'home';
  return 'other';
}

export function getVideoId(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('v');
}

export function getVideoInfo(): VideoInfo | null {
  const videoId = getVideoId();
  if (!videoId) return null;

  const titleEl = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, h1.title yt-formatted-string');
  const channelEl = document.querySelector('#owner #channel-name a, ytd-video-owner-renderer #channel-name a');
  const thumbUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  // Try to get duration from video element
  const videoEl = document.querySelector('video');
  const duration = videoEl ? Math.floor(videoEl.duration || 0) : 0;

  return {
    videoId,
    title: titleEl?.textContent?.trim() || 'Untitled',
    channelName: channelEl?.textContent?.trim() || 'Unknown',
    channelId: channelEl?.getAttribute('href')?.replace('/@', '') || '',
    thumbnailUrl: thumbUrl,
    duration,
    lastWatched: Date.now(),
  };
}
