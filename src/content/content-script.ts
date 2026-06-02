import { detectPageType, getVideoId, getVideoInfo } from './page-detector';
import { enableLearnMode, disableLearnMode, isLearnModeActive, refreshSettings } from './distraction-hider';
import { injectSidebarButton, updateButtonState } from './sidebar-injector';
import { extractTranscript } from './transcript-extractor';
import './styles/learn-mode.css';

let currentVideoId: string | null = null;
let videoObserver: MutationObserver | null = null;

function init(): void {
  injectSidebarButton();
  refreshSettings();
  setupVideoTracking();
  handlePageChange();
}

function handlePageChange(): void {
  const pageType = detectPageType();
  const newVideoId = getVideoId();

  // If we navigated to a new video
  if (pageType === 'watch' && newVideoId && newVideoId !== currentVideoId) {
    currentVideoId = newVideoId;

    // Save video info
    const info = getVideoInfo();
    if (info) {
      chrome.runtime.sendMessage({
        type: 'SAVE_VIDEO_INFO',
        payload: info,
      });
    }

    // Notify background of page change
    chrome.runtime.sendMessage({
      type: 'PAGE_CHANGED',
      payload: { pageType, videoId: newVideoId },
    });

    setupVideoTracking();
  } else if (pageType !== 'watch') {
    if (currentVideoId) {
      // Left a video page
      chrome.runtime.sendMessage({
        type: 'END_SESSION',
        payload: { videoId: currentVideoId },
      });
      currentVideoId = null;
    }
  }
}

function setupVideoTracking(): void {
  // Watch for video element to track play/pause
  const checkVideo = () => {
    const video = document.querySelector('video');
    if (!video) {
      setTimeout(checkVideo, 500);
      return;
    }

    video.addEventListener('play', () => {
      if (currentVideoId && isLearnModeActive()) {
        const info = getVideoInfo();
        chrome.runtime.sendMessage({
          type: 'START_SESSION',
          payload: {
            videoId: currentVideoId,
            videoTitle: info?.title || 'Untitled',
            channelName: info?.channelName || 'Unknown',
          },
        });
      }
    });

    video.addEventListener('pause', () => {
      if (currentVideoId) {
        chrome.runtime.sendMessage({
          type: 'PAUSE_SESSION',
          payload: { videoId: currentVideoId },
        });
      }
    });
  };

  checkVideo();
}

// Listen for YouTube SPA navigation
document.addEventListener('yt-navigate-finish', () => {
  handlePageChange();
  refreshSettings();
  // Re-inject button if needed (YouTube might remove it)
  injectSidebarButton();
});

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'TOGGLE_LEARN_MODE': {
      if (isLearnModeActive()) {
        disableLearnMode();
        updateButtonState(false);
      } else {
        enableLearnMode();
        updateButtonState(true);
      }
      sendResponse({ success: true, data: { enabled: isLearnModeActive() } });
      break;
    }
    case 'SET_LEARN_MODE': {
      const enabled = message.payload?.enabled ?? message.enabled ?? false;
      if (enabled) {
        enableLearnMode();
        updateButtonState(true);
      } else {
        disableLearnMode();
        updateButtonState(false);
      }
      sendResponse({ success: true });
      break;
    }
    case 'GET_VIDEO_CURRENT_TIME': {
      const video = document.querySelector('video');
      sendResponse({ currentTime: video ? video.currentTime : 0 });
      break;
    }
    case 'EXTRACT_TRANSCRIPT': {
      const videoId = message.payload?.videoId || getVideoId();
      if (!videoId) {
        sendResponse({ success: false, error: 'No video ID detected.' });
        break;
      }
      extractTranscript(videoId)
        .then(segments => {
          sendResponse({ success: true, data: segments });
        })
        .catch(err => {
          sendResponse({ success: false, error: String(err.message || err) });
        });
      return true; // Keep channel open for async response
    }
    case 'SEEK_VIDEO': {
      const video = document.querySelector('video');
      if (video) {
        video.currentTime = message.payload.time;
        video.play().catch(() => {});
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'Video element not found' });
      }
      break;
    }
  }
  return true; // Keep channel open for async
});

// Initialize
init();
