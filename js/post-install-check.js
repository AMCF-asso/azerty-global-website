(function () {
  'use strict';

  const section = document.getElementById('post-install-check');
  if (!section) return;

  const os = section.querySelector('[data-check-os]');
  const fields = [...section.querySelectorAll('[data-expected]')];
  const result = section.querySelector('[data-check-result]');
  const help = section.querySelector('[data-check-help]');

  function clearResult() {
    result.textContent = '';
    fields.forEach(field => field.removeAttribute('aria-invalid'));
  }

  function updateOs(value) {
    os.value = value;
    section.querySelectorAll('[data-check-for]').forEach(node => {
      node.hidden = !node.dataset.checkFor.split(' ').includes(value);
    });
    fields.forEach(field => { field.value = ''; });
    clearResult();
    help.open = false;
  }

  const selectedTab = document.querySelector('.os-tab[aria-selected="true"]');
  updateOs(selectedTab?.dataset.os || 'windows');
  os.addEventListener('change', () => updateOs(os.value));
  // Keep the help in sync with the existing download tabs, including arrow keys.
  const observer = new MutationObserver(() => {
    const selected = document.querySelector('.os-tab[aria-selected="true"]');
    if (selected && selected.dataset.os !== os.value) updateOs(selected.dataset.os);
  });
  document.querySelectorAll('.os-tab').forEach(tab => {
    observer.observe(tab, { attributes: true, attributeFilter: ['aria-selected'] });
  });

  fields.forEach(field => field.addEventListener('input', clearResult));
  section.querySelector('[data-check-submit]').addEventListener('click', () => {
    const incorrect = fields.filter(field => field.value !== field.dataset.expected);
    fields.forEach(field => field.setAttribute('aria-invalid', String(incorrect.includes(field))));
    if (incorrect.length) {
      result.textContent = 'Certains caractères sont absents ou différents. Vérifiez l’activation ci-dessous, puis réessayez les gestes.';
      help.open = true;
      incorrect[0].focus();
    } else {
      result.textContent = 'Les trois caractères attendus sont bien saisis. Si vous avez suivi les gestes indiqués, vous pouvez passer au guide pour la suite.';
      help.open = false;
    }
  });
  section.querySelector('[data-check-reset]').addEventListener('click', () => {
    fields.forEach(field => { field.value = ''; });
    clearResult();
    help.open = false;
    fields[0].focus();
  });
  section.querySelector('[data-check-actions]').hidden = false;
})();
