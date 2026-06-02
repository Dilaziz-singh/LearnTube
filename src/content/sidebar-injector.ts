import { isLearnModeActive, enableLearnMode, disableLearnMode } from './distraction-hider';

const BUTTON_ID = 'learntube-fab';

export function injectSidebarButton(): void {
  if (document.getElementById(BUTTON_ID)) return;

  const btn = document.createElement('button');
  btn.id = BUTTON_ID;
  btn.innerHTML = `
    <svg class="lt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
    <span class="lt-label">Learn Mode</span>
    <span class="lt-pulse"></span>
  `;

  btn.addEventListener('click', async () => {
    const isActive = isLearnModeActive();
    if (isActive) {
      disableLearnMode();
      btn.classList.remove('active');
    } else {
      enableLearnMode();
      btn.classList.add('active');
    }

    // Notify background
    chrome.runtime.sendMessage({
      type: 'SET_LEARN_MODE',
      payload: { enabled: !isActive },
    });

    // Try to open side panel
    if (!isActive) {
      chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
    }
  });

  document.body.appendChild(btn);

  // Restore state from storage
  chrome.runtime.sendMessage({ type: 'GET_LEARN_MODE' }, (response) => {
    if (response?.data?.enabled) {
      enableLearnMode();
      btn.classList.add('active');
    }
  });
}

export function updateButtonState(active: boolean): void {
  const btn = document.getElementById(BUTTON_ID);
  if (btn) {
    btn.classList.toggle('active', active);
  }
}
