import { handleMessage } from './messages';
import type { Message } from '../shared/types/messages';

// Message listener
chrome.runtime.onMessage.addListener(
  (message: Message, sender, sendResponse) => {
    handleMessage(message, sender).then(sendResponse);
    return true; // Keep channel open for async response
  }
);

// Enable side panel behavior
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch(console.error);

// Contextual side panel - YouTube only
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!tab.url) return;
  try {
    const isYouTube = tab.url.includes('youtube.com');
    await chrome.sidePanel.setOptions({
      tabId,
      path: 'src/sidepanel/index.html',
      enabled: isYouTube,
    });
  } catch (e) {
    // Tab might have been closed
  }
});

// Periodic stats sync alarm
chrome.alarms.create('stats-sync', { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'stats-sync') {
    // Future: sync to backend
    console.log('[LearnTube] Stats sync tick');
  }
});

console.log('[LearnTube] Background service worker initialized');
