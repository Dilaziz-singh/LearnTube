import type { UserSettings } from '../shared/types';

const LEARNTUBE_CLASS = 'learntube-active';
const EXTRA_STRICT_CLASS = 'learntube-extra-strict';

let observer: MutationObserver | null = null;
let extraStrictEnabled = false;
let strictHistoryArmed = false;

export function enableLearnMode(): void {
  document.documentElement.classList.add(LEARNTUBE_CLASS);
  refreshSettings();
  startObserver();
}

export function disableLearnMode(): void {
  document.documentElement.classList.remove(LEARNTUBE_CLASS);
  document.documentElement.classList.remove(EXTRA_STRICT_CLASS);
  stopObserver();
}

export function isLearnModeActive(): boolean {
  return document.documentElement.classList.contains(LEARNTUBE_CLASS);
}

export function refreshSettings(): void {
  chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
    const settings = response?.data as UserSettings | undefined;
    extraStrictEnabled = !!settings?.distractions.extraStrictEnabled;
    document.documentElement.classList.toggle(
      EXTRA_STRICT_CLASS,
      isLearnModeActive() && extraStrictEnabled
    );
    armStrictHistoryGuard();
  });
}

function armStrictHistoryGuard(): void {
  if (strictHistoryArmed || !extraStrictEnabled || !isLearnModeActive()) return;

  strictHistoryArmed = true;
  history.pushState({ learntubeStrict: true }, '', location.href);
}

function showFocusReminder(): void {
  const existing = document.getElementById('learntube-strict-reminder');
  if (existing) existing.remove();

  const reminder = document.createElement('div');
  reminder.id = 'learntube-strict-reminder';
  reminder.textContent = 'Extra Strict is on. Stay with the lesson.';
  document.body.appendChild(reminder);

  window.setTimeout(() => {
    reminder.remove();
  }, 2400);
}

window.addEventListener('popstate', () => {
  if (!extraStrictEnabled || !isLearnModeActive()) return;

  history.pushState({ learntubeStrict: true }, '', location.href);
  showFocusReminder();
});

function startObserver(): void {
  if (observer) return;

  observer = new MutationObserver(() => {
    // Re-apply class in case YouTube removes it during SPA navigation
    if (!document.documentElement.classList.contains(LEARNTUBE_CLASS)) {
      document.documentElement.classList.add(LEARNTUBE_CLASS);
    }
    document.documentElement.classList.toggle(
      EXTRA_STRICT_CLASS,
      extraStrictEnabled
    );
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function stopObserver(): void {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}
