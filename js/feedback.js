// Feedback form logic
(function () {
  'use strict';

  // Langue pilotée par la page (base-en.njk pose <html lang="en">), pattern t(fr, en).
  var isEnglish = /^en/i.test(document.documentElement.lang || 'fr');
  function t(fr, en) { return isEnglish ? en : fr; }

  function renderSuccessState(form) {
    form.innerHTML = `
      <div class="form-success" role="status" aria-live="polite" aria-atomic="true" tabindex="-1">
        <div class="form-success__icon">✅</div>
        <h2 class="form-success__title">${t('Merci beaucoup !', 'Thank you so much!')}</h2>
        <p class="form-success__text">
          ${t('Votre retour a bien été envoyé. Il nous aidera grandement à améliorer AZERTY Global.', 'Your feedback has been sent. It will greatly help us improve AZERTY Global.')}
        </p>
        <a href="${t('/', '/en/')}" class="btn btn--primary form-success__action">${t("Retour à l'accueil", 'Back to home')}</a>
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
    submitBtn.innerHTML = t('<span>⏳</span> Envoi en cours...', '<span>⏳</span> Sending...');

    try {
      await window.AzertyWeb3Forms.submitForm(form, {
        subject: 'Nouveau retour utilisateur AZERTY Global',
        from_name: 'AZERTY Global Feedback',
        form_type: 'feedback',
        source: 'feedback-page',
        date: new Date().toISOString()
      });

      renderSuccessState(form);
    } catch (error) {
      console.error('Feedback submission error:', error);
      alert(t('Une erreur est survenue lors de l\'envoi de votre feedback. Veuillez réessayer.', 'Something went wrong while sending your feedback. Please try again.'));
      submitBtn.innerHTML = originalHtml;
      submitBtn.disabled = false;
    }
  });

})();
