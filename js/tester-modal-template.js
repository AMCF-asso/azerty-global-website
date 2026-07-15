import { T } from './tester-i18n.js?v=final-20260715-2';

function buildTesterModalTemplate() {
  return `
  <div id="tester-modal" class="tester-modal" aria-hidden="true">
    <div class="tester-modal__overlay"></div>
    <div class="tester-modal__content">
      <button class="tester-modal__close" aria-label="${T('Fermer', 'Close')}">&times;</button>

      <div class="tester-modal__notices" aria-live="polite"></div>

      <div class="tester-modal__keyboard-wrapper">
        <div class="modal-tabs d-flex gap-8px mb-3">
          <button id="tab-libre" class="modal-tab modal-tab--active font-semibold cursor-pointer flex-1 text-14px transition-all border-none rounded-8 px-10-16">
            ${T('⌨️ Libre', '⌨️ Free')}
          </button>
          <button id="tab-lessons" class="modal-tab font-semibold cursor-pointer flex-1 text-14px transition-all border rounded-8 px-10-16">
            ${T('🎓 Leçons', '🎓 Lessons')}
          </button>
        </div>

        <div id="mode-libre" class="modal-mode">
          <div class="modal-search-container w-full relative mb-3">
            <input
              type="text"
              id="modal-search-input"
              class="modal-search-input w-full bg-secondary text-primary text-16px outline-none box-border border rounded-8 p-12-15"
              placeholder="${T("🔍 Rechercher un caractère (é majuscule, e dans l'o,…)", '🔍 Find a character (capital é, oe ligature,…)')}"
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
              data-placeholder="${T('Tapez au clavier ou cliquez sur les touches...', 'Type on your keyboard or click the keys...')}"
            ></div>
            <div class="tester-stats tester-stats--free" id="free-stats" hidden></div>
          </div>

          <details class="tester-diagnostic" id="tester-os-diagnostic">
            <summary class="tester-diagnostic__summary">${T('Diagnostic OS', 'OS diagnostic')}</summary>
            <div class="tester-diagnostic__body">
              <p class="tester-diagnostic__help" id="tester-diagnostic-help">
                ${T('Zone native non simulée : tapez ici pour comparer ce que le navigateur reçoit de Windows, macOS ou Linux.', 'Native, unsimulated area: type here to compare what the browser receives from Windows, macOS or Linux.')}
              </p>
              <textarea
                id="tester-diagnostic-input"
                class="tester-diagnostic__input"
                rows="2"
                spellcheck="false"
                autocomplete="off"
                autocapitalize="off"
                aria-describedby="tester-diagnostic-help"
              ></textarea>
              <dl class="tester-diagnostic__grid" id="tester-diagnostic-readout">
                <div><dt>event.key</dt><dd id="tester-diagnostic-key">-</dd></div>
                <div><dt>event.code</dt><dd id="tester-diagnostic-code">-</dd></div>
                <div><dt>inputType</dt><dd id="tester-diagnostic-input-type">-</dd></div>
                <div><dt>data</dt><dd id="tester-diagnostic-data">-</dd></div>
                <div><dt>${T('Modificateurs', 'Modifiers')}</dt><dd id="tester-diagnostic-modifiers">-</dd></div>
                <div><dt>AltGraph</dt><dd id="tester-diagnostic-altgraph">-</dd></div>
                <div><dt>CapsLock</dt><dd id="tester-diagnostic-capslock">-</dd></div>
                <div><dt>${T('Valeur native', 'Native value')}</dt><dd id="tester-diagnostic-value">-</dd></div>
              </dl>
              <button class="tester-diagnostic__clear" id="tester-diagnostic-clear" type="button">${T('Effacer', 'Clear')}</button>
            </div>
          </details>
        </div>

        <div id="mode-lessons" class="modal-mode">
          <div class="mb-3" id="lesson-nav">
            <div class="items-center d-flex gap-8px mb-2">
              <select class="bg-secondary text-primary cursor-pointer flex-1 text-14px border rounded-8 px-10-12" id="lesson-module-select">
                <option value="">${T('Choisir un module...', 'Choose a module...')}</option>
              </select>
            </div>
            <div class="lesson-scroll" id="lesson-scroll" aria-label="${T('Leçons du module', 'Module lessons')}">
              <button class="lesson-scroll-btn lesson-scroll-btn--prev" id="lesson-scroll-prev" type="button" aria-label="${T('Voir les leçons précédentes', 'Show previous lessons')}" disabled>
                <span aria-hidden="true">&lsaquo;</span>
              </button>
              <div class="d-flex gap-6px" id="lesson-list" tabindex="0"></div>
              <button class="lesson-scroll-btn lesson-scroll-btn--next" id="lesson-scroll-next" type="button" aria-label="${T('Voir les leçons suivantes', 'Show next lessons')}" disabled>
                <span aria-hidden="true">&rsaquo;</span>
              </button>
            </div>
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
                data-placeholder="${T('Tapez ici...', 'Type here...')}"
              ></div>
            </div>

            <div class="d-flex gap-8px">
              <button class="bg-secondary text-primary cursor-pointer border rounded-6 px-8-16" id="lesson-prev">${T('← Précédent', '← Previous')}</button>
              <button class="bg-secondary text-primary cursor-pointer border rounded-6 px-8-16" id="lesson-restart">${T('🔄 Recommencer', '🔄 Restart')}</button>
              <button class="bg-secondary text-primary cursor-pointer border rounded-6 px-8-16" id="lesson-hint">${T('💡 Indice', '💡 Hint')}</button>
              <button class="font-semibold cursor-pointer flex-1 border-none rounded-6 text-primary-dark px-8-16 bg-accent" id="lesson-next">${T('Suivant →', 'Next →')}</button>
            </div>
          </div>

          <div class="text-center p-2" id="lesson-welcome">
            <h3 class="text-primary margin-0-0-8-0"><span aria-hidden="true">&#x1F393;</span> ${T('Apprenez AZERTY Global', 'Learn AZERTY Global')}</h3>
            <p class="text-secondary margin-0">${T('Choisissez un module ci-dessus pour commencer', 'Choose a module above to get started')}</p>
          </div>
        </div>

        <div id="modal-keyboard-container" class="keyboard-container mt-3"></div>
      </div>

      <div class="status-bar">
        <span class="status-item" id="modal-status-shift">${T('● Maj.', '● Shift')}</span>
        <span class="status-item" id="modal-status-caps">${T('● Verr. Maj.', '● Caps Lock')}</span>
        <span class="status-item" id="modal-status-altgr">● AltGr</span>
        <span class="status-item" id="modal-status-deadkey">${T('● Touche morte : ', '● Dead key: ')}<span id="modal-deadkey-name">-</span></span>
      </div>
    </div>
  </div>
`;
}

export function ensureTesterModal() {
  let modal = document.getElementById('tester-modal');
  if (modal) return modal;

  document.body.insertAdjacentHTML('beforeend', buildTesterModalTemplate().trim());
  modal = document.getElementById('tester-modal');

  // Initial visibility: hidden via DOM API (CSP-safe — style.X is not parsed style attr).
  // Required because tester-accessibility.js syncs `hidden` from `style.display === 'none'`.
  const modeLessons = modal.querySelector('#mode-lessons');
  const lessonExercise = modal.querySelector('#lesson-exercise');
  if (modeLessons) modeLessons.style.display = 'none';
  if (lessonExercise) lessonExercise.style.display = 'none';

  return modal;
}
