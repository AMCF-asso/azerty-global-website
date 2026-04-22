/**
 * Stats de frappe pour le testeur : WPM et (en mode leçon) précision.
 * Affichage discret. Reset manuel au changement d'exercice ou auto après 10s d'inactivité en mode libre.
 */

const WPM_MIN_CHARS = 10;
const FREE_MODE_IDLE_MS = 10000;

const state = {
  mode: 'libre',           // 'libre' | 'lesson' | null (défaut libre : le testeur ouvre en mode libre)
  startTime: 0,            // performance.now() au 1er keystroke
  charsTyped: 0,           // frappes productives (pas les backspaces)
  charsCorrect: 0,         // frappes qui ont matché l'expectedChar au moment de la frappe
  idleTimer: null,
};

function clearIdleTimer() {
  if (state.idleTimer) {
    clearTimeout(state.idleTimer);
    state.idleTimer = null;
  }
}

function armIdleTimer() {
  if (state.mode !== 'libre') return;
  clearIdleTimer();
  state.idleTimer = setTimeout(() => {
    resetSession();
    hideStatsUI();
  }, FREE_MODE_IDLE_MS);
}

function hideStatsUI() {
  const lessonEl = document.getElementById('lesson-stats');
  if (lessonEl) lessonEl.hidden = true;
  const freeEl = document.getElementById('free-stats');
  if (freeEl) freeEl.hidden = true;
}

function renderStats() {
  if (state.charsTyped < WPM_MIN_CHARS || !state.startTime) {
    hideStatsUI();
    return;
  }
  const elapsedMin = (performance.now() - state.startTime) / 60000;
  if (elapsedMin <= 0) return;
  const wpm = Math.round((state.charsTyped / 5) / elapsedMin);

  if (state.mode === 'lesson') {
    const freeEl = document.getElementById('free-stats');
    if (freeEl) freeEl.hidden = true;
    const el = document.getElementById('lesson-stats');
    if (!el) return;
    const accuracy = Math.round(100 * state.charsCorrect / state.charsTyped);
    el.textContent = `${wpm} WPM · ${accuracy} % précision`;
    el.hidden = false;
  } else if (state.mode === 'libre') {
    const lessonEl = document.getElementById('lesson-stats');
    if (lessonEl) lessonEl.hidden = true;
    const el = document.getElementById('free-stats');
    if (!el) return;
    el.textContent = `${wpm} WPM`;
    el.hidden = false;
  }
}

export function startSession(mode) {
  clearIdleTimer();
  state.mode = mode;
  state.startTime = 0;
  state.charsTyped = 0;
  state.charsCorrect = 0;
  hideStatsUI();
}

export function resetSession() {
  const mode = state.mode;
  startSession(mode);
}

export function recordKeystroke(char, expectedChar = null) {
  if (!state.mode) return;
  if (!state.startTime) state.startTime = performance.now();
  state.charsTyped++;
  if (expectedChar !== null && expectedChar !== undefined && char === expectedChar) {
    state.charsCorrect++;
  }
  armIdleTimer();
  renderStats();
}

export function getStatsSnapshot() {
  if (state.charsTyped < WPM_MIN_CHARS || !state.startTime) return null;
  const elapsedMin = (performance.now() - state.startTime) / 60000;
  if (elapsedMin <= 0) return null;
  const wpm = Math.round((state.charsTyped / 5) / elapsedMin);
  const accuracy = state.mode === 'lesson' && state.charsTyped > 0
    ? Math.round(100 * state.charsCorrect / state.charsTyped)
    : null;
  return { wpm, accuracy, mode: state.mode };
}
