// Pilot report form logic
(function () {
  'use strict';

  function renderSuccessState(form) {
    form.innerHTML = `
      <div class="form-success" role="status" aria-live="polite" aria-atomic="true" tabindex="-1">
        <div class="form-success__icon">✓</div>
        <h2 class="form-success__title">Bilan envoyé</h2>
        <p class="form-success__text">
          Merci pour ce retour. Il aide à comprendre les conditions réelles d'adoption d'AZERTY Global.
        </p>
        <a href="/pilote" class="btn btn--primary form-success__action">Retour au pilote gratuit</a>
      </div>
    `;

    form.querySelector('[role="status"]')?.focus();
    window.scrollTo({ top: form.offsetTop - 100, behavior: 'smooth' });
  }

  function selectedValue(form, selector) {
    const field = form.querySelector(selector);
    return field ? field.value : '';
  }

  document.getElementById('pilot-report-form')?.addEventListener('submit', async event => {
    event.preventDefault();

    const form = event.currentTarget;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalHtml = submitBtn.innerHTML;

    if (!window.AzertyWeb3Forms) {
      alert("Le formulaire est indisponible pour le moment. Vous pouvez écrire à contact@azerty.global.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Envoi en cours...';

    try {
      await window.AzertyWeb3Forms.submitForm(form, {
        subject: 'Bilan pilote AZERTY Global',
        from_name: 'AZERTY Global Pilotes',
        form_type: 'pilote-bilan',
        source: 'pilote-bilan-page',
        date: new Date().toISOString()
      });

      window.AzertyTrack?.conversion('pilot_report_submitted', {
        report_role: selectedValue(form, '#report-role'),
        report_moment: selectedValue(form, '#report-moment'),
        report_score: selectedValue(form, '#report-score'),
        continue_intent: selectedValue(form, '#report-continue')
      });

      renderSuccessState(form);
    } catch (error) {
      console.error('Pilot report submission error:', error);
      alert("Une erreur est survenue lors de l'envoi. Vous pouvez aussi écrire à contact@azerty.global.");
      submitBtn.innerHTML = originalHtml;
      submitBtn.disabled = false;
    }
  });
})();
