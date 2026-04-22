const TESTER_MODAL_TEMPLATE = `
  <div id="tester-modal" class="tester-modal" aria-hidden="true">
    <div class="tester-modal__overlay"></div>
    <div class="tester-modal__content">
      <button class="tester-modal__close" aria-label="Fermer">&times;</button>

      <div class="tester-modal__keyboard-wrapper">
        <div class="modal-tabs d-flex gap-8px mb-3">
          <button id="tab-libre" class="modal-tab modal-tab--active font-semibold cursor-pointer flex-1 text-14px transition-all border-none rounded-8 px-10-16">
            ⌨️ Libre
          </button>
          <button id="tab-lessons" class="modal-tab font-semibold cursor-pointer flex-1 text-14px transition-all border rounded-8 px-10-16">
            🎓 Leçons
          </button>
        </div>

        <div id="mode-libre" class="modal-mode">
          <div class="modal-search-container w-full relative mb-3">
            <input
              type="text"
              id="modal-search-input"
              class="modal-search-input w-full bg-secondary text-primary text-16px outline-none box-border border rounded-8 p-12-15"
              placeholder="🔍 Rechercher un caractère (é majuscule, e dans l'o,…)"
              autocomplete="off"
            >
            <div
              class="modal-search-results absolute overflow-y-auto mt-1 max-h-200 z-100 border rounded-8 bg-card shadow-dropdown top-full left-0 right-0"
              id="modal-search-results"
              hidden
            ></div>
          </div>

          <div class="tester-modal__output">
            <div
              id="modal-output"
              class="output-text"
              contenteditable="true"
              data-placeholder="Tapez au clavier ou cliquez sur les touches..."
            ></div>
            <div class="tester-stats tester-stats--free" id="free-stats" hidden></div>
          </div>
        </div>

        <div id="mode-lessons" class="modal-mode">
          <div class="mb-3" id="lesson-nav">
            <div class="items-center d-flex gap-8px mb-2">
              <select class="bg-secondary text-primary cursor-pointer flex-1 text-14px border rounded-8 px-10-12" id="lesson-module-select">
                <option value="">Choisir un module...</option>
              </select>
            </div>
            <div class="flex-wrap d-flex gap-6px" id="lesson-list"></div>
          </div>

          <div id="lesson-exercise">
            <div class="bg-secondary p-3 mb-3 border rounded-8">
              <div class="items-center d-flex mb-2 justify-between">
                <span class="text-primary font-semibold" id="lesson-title"></span>
                <span class="text-secondary text-12px" id="lesson-progress"></span>
              </div>
              <div class="items-center d-flex margin-b-12 justify-between gap-8px">
                <p class="text-secondary text-13px margin-0" id="lesson-instruction"></p>
                <div class="tester-stats tester-stats--lesson" id="lesson-stats" hidden></div>
              </div>

              <div class="leading-relaxed text-18px p-3 font-mono pre-wrap mb-2 border rounded-6 bg-card" id="lesson-target"></div>

              <div
                id="lesson-input"
                class="output-text text-18px p-3 font-mono outline-none min-h-1-5em border-accent rounded-6 bg-card"
                contenteditable="true"
                data-placeholder="Tapez ici..."
              ></div>
            </div>

            <div class="d-flex gap-8px">
              <button class="bg-secondary text-primary cursor-pointer border rounded-6 px-8-16" id="lesson-prev">← Précédent</button>
              <button class="bg-secondary text-primary cursor-pointer border rounded-6 px-8-16" id="lesson-restart">🔄 Recommencer</button>
              <button class="bg-secondary text-primary cursor-pointer border rounded-6 px-8-16" id="lesson-hint">💡 Indice</button>
              <button class="font-semibold cursor-pointer flex-1 border-none rounded-6 text-primary-dark px-8-16 bg-accent" id="lesson-next">Suivant →</button>
            </div>
          </div>

          <div class="text-center p-2" id="lesson-welcome">
            <div class="text-32px mb-1">🎓</div>
            <h3 class="text-primary margin-0-0-8-0">Apprenez AZERTY Global</h3>
            <p class="text-secondary margin-0">Choisissez un module ci-dessus pour commencer</p>
          </div>
        </div>

        <div id="modal-keyboard-container" class="keyboard-container mt-3"></div>
      </div>

      <div class="status-bar">
        <span class="status-item" id="modal-status-shift">● Maj.</span>
        <span class="status-item" id="modal-status-caps">● Verr. Maj.</span>
        <span class="status-item" id="modal-status-altgr">● AltGr</span>
        <span class="status-item" id="modal-status-deadkey">● Touche morte : <span id="modal-deadkey-name">-</span></span>
      </div>
    </div>
  </div>
`;

export function ensureTesterModal() {
  let modal = document.getElementById('tester-modal');
  if (modal) return modal;

  document.body.insertAdjacentHTML('beforeend', TESTER_MODAL_TEMPLATE.trim());
  modal = document.getElementById('tester-modal');

  // Initial visibility: hidden via DOM API (CSP-safe — style.X is not parsed style attr).
  // Required because tester-accessibility.js syncs `hidden` from `style.display === 'none'`.
  const modeLessons = modal.querySelector('#mode-lessons');
  const lessonExercise = modal.querySelector('#lesson-exercise');
  if (modeLessons) modeLessons.style.display = 'none';
  if (lessonExercise) lessonExercise.style.display = 'none';

  return modal;
}
