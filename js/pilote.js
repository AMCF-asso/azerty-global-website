// Pilot request form logic.
(function () {
  'use strict';

  const form = document.getElementById('pilot-request-form');

  if (!form) return;

  const profileSelect = form.querySelector('#pilot-profile');
  const panels = Array.from(form.querySelectorAll('[data-profile-panel]'));

  function setPanelState(panel, isActive) {
    panel.hidden = !isActive;

    panel.querySelectorAll('input, select, textarea').forEach(field => {
      field.disabled = !isActive;

      if (!isActive) {
        field.value = '';
      }
    });
  }

  function updateProfilePanels() {
    const activeProfile = profileSelect.value;

    panels.forEach(panel => {
      setPanelState(panel, panel.dataset.profilePanel === activeProfile);
    });
  }

  function selectedValue(selector) {
    const field = form.querySelector(selector);
    return field ? field.value : '';
  }

  function renderSuccessState() {
    form.innerHTML = `
      <div class="form-success" role="status" aria-live="polite" aria-atomic="true" tabindex="-1">
        <h2 class="form-success__title">Demande envoyée</h2>
        <p class="form-success__text">
          Merci. Nous revenons vers vous rapidement pour cadrer le pilote gratuit AZERTY Global.
        </p>
        <div class="flex-wrap justify-center gap-3 d-flex mt-4">
          <a href="/download" class="btn btn--primary form-success__action">Télécharger AZERTY Global</a>
          <a href="/guide" class="btn btn--secondary form-success__action">Lire le guide rapide</a>
        </div>
      </div>
    `;

    form.querySelector('[role="status"]')?.focus();
    window.scrollTo({ top: form.offsetTop - 100, behavior: 'smooth' });
  }

  profileSelect?.addEventListener('change', updateProfilePanels);
  updateProfilePanels();

  form.addEventListener('submit', async event => {
    event.preventDefault();

    if (!form.reportValidity()) {
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalHtml = submitBtn.innerHTML;

    if (!window.AzertyWeb3Forms) {
      alert("Le formulaire est indisponible pour le moment. Vous pouvez écrire à pilote@azerty.global.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Envoi en cours...';

    try {
      await window.AzertyWeb3Forms.submitForm(form, {
        subject: 'Demande pilote gratuit AZERTY Global',
        from_name: 'AZERTY Global Pilotes',
        form_type: 'pilote-demande',
        source_page: 'pilote',
        date: new Date().toISOString()
      });

      window.AzertyTrack?.conversion('pilot_request_submitted', {
        profile: selectedValue('#pilot-profile'),
        seats: selectedValue('#pilot-seats'),
        period: selectedValue('#pilot-period'),
        source: selectedValue('#pilot-source')
      });

      renderSuccessState();
    } catch (error) {
      console.error('Pilot request submission error:', error);
      alert("Une erreur est survenue lors de l'envoi. Vous pouvez aussi écrire à pilote@azerty.global.");
      submitBtn.innerHTML = originalHtml;
      submitBtn.disabled = false;
    }
  });
})();
