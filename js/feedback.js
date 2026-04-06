// Feedback form logic
(function () {
  'use strict';

  function renderSuccessState(form) {
    form.innerHTML = `
      <div class="form-success" role="status" aria-live="polite" aria-atomic="true" tabindex="-1">
        <div class="form-success__icon">✅</div>
        <h2 class="form-success__title">Merci beaucoup !</h2>
        <p class="form-success__text">
          Votre retour a bien été envoyé. Il m'aidera grandement à améliorer AZERTY Global.
        </p>
        <a href="/" class="btn btn--primary form-success__action">Retour à l'accueil</a>
      </div>
    `;

    form.querySelector('[role="status"]')?.focus();
    window.scrollTo({ top: form.offsetTop - 100, behavior: 'smooth' });
  }

  document.getElementById('os')?.addEventListener('change', function () {
    const isWindows = this.value.startsWith('win');
    const isOldWindows = this.value === 'win-other';
    const installMethod = document.getElementById('install-method');

    if (!installMethod) return;

    if (isOldWindows) {
      document.getElementById('windows-version').style.display = 'none';
      installMethod.value = 'installeur';
      installMethod.required = false;
    } else if (isWindows) {
      document.getElementById('windows-version').style.display = 'block';
      installMethod.required = true;
    } else {
      document.getElementById('windows-version').style.display = 'none';
      installMethod.value = '';
      installMethod.required = false;
    }
  });

  window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === '1') {
      const form = document.getElementById('feedback-form');
      if (form) {
        renderSuccessState(form);
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  });

  document.getElementById('feedback-form')?.addEventListener('submit', async event => {
    event.preventDefault();

    const form = event.currentTarget;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalHtml = submitBtn.innerHTML;

    if (!window.AzertyWeb3Forms) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>⏳</span> Envoi en cours...';

    try {
      await window.AzertyWeb3Forms.submitForm(form, {
        subject: 'Nouveau feedback AZERTY Global',
        from_name: 'AZERTY Global Feedback',
        form_type: 'feedback',
        source: 'feedback-page',
        date: new Date().toISOString()
      });

      renderSuccessState(form);
    } catch (error) {
      console.error('Feedback submission error:', error);
      alert('Une erreur est survenue lors de l\'envoi de votre feedback. Veuillez réessayer.');
      submitBtn.innerHTML = originalHtml;
      submitBtn.disabled = false;
    }
  });

})();
