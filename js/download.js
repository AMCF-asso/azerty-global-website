document.querySelectorAll('.os-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.os-tab').forEach(item => {
      item.classList.remove('os-tab--active');
    });

    document.querySelectorAll('.os-content').forEach(content => {
      content.classList.add('d-none');
    });

    tab.classList.add('os-tab--active');
    document.getElementById('os-' + tab.dataset.os).classList.remove('d-none');
  });
});

(function () {
  const downloadBtn = document.getElementById('btn-download-exe');
  if (!downloadBtn) return;

  downloadBtn.addEventListener('click', () => {
    window.setTimeout(() => {
      window.location.href = '/merci?os=windows';
    }, 100);
  });
})();

(function () {
  function showSuccessState(formContainer, successContainer) {
    if (!formContainer || !successContainer) return;

    formContainer.style.display = 'none';
    successContainer.style.display = 'block';
    successContainer.classList.remove('d-none');
    successContainer.setAttribute('aria-hidden', 'false');
    successContainer.focus();
  }

  function setupBetaForm(form, formContainer, successContainer) {
    const emailInput = form.querySelector('input[type="email"]');
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!emailInput || !submitBtn || !window.AzertyWeb3Forms) return;

    form.addEventListener('submit', async event => {
      event.preventDefault();

      const email = emailInput.value.trim();
      const originalLabel = submitBtn.textContent;
      if (!email) return;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Envoi...';

      try {
        await window.AzertyWeb3Forms.submitForm(form, {
          subject: 'Nouvelle inscription Beta (page Download)',
          from_name: 'AZERTY Global Beta Signup',
          form_type: 'beta-signup',
          source: 'download-page',
          date: new Date().toISOString(),
          message: `Nouvel inscrit beta !\n\nEmail: ${email}\nDate: ${new Date().toLocaleString('fr-FR')}\nSource: Page Telechargement`
        });

        showSuccessState(formContainer, successContainer);
      } catch (error) {
        console.error('Beta signup error:', error);
        alert('Désolé, une erreur s\'est produite. Veuillez réessayer.');
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      }
    });
  }

  const windowsForm = document.getElementById('download-beta-signup');
  const windowsFormContainer = document.getElementById('beta-cta-form');
  const windowsSuccessContainer = document.getElementById('beta-cta-success');

  if (windowsForm && windowsFormContainer && windowsSuccessContainer) {
    setupBetaForm(windowsForm, windowsFormContainer, windowsSuccessContainer);
  }

  document.querySelectorAll('.beta-signup-form').forEach(form => {
    const card = form.closest('.beta-cta-card');
    if (!card) return;

    const formContainer = card.querySelector('.beta-cta-form-container');
    const successContainer = card.querySelector('.beta-cta-success-container');

    if (formContainer && successContainer) {
      setupBetaForm(form, formContainer, successContainer);
    }
  });
})();
