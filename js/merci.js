(function () {
  const downloadUrls = {
    windows: 'https://sourceforge.net/projects/azertyglobal/files/AZERTY_Global_Windows.zip/download',
    macos: 'https://sourceforge.net/projects/azertyglobal/files/AZERTY_Global_macOS.zip/download',
    linux: 'https://sourceforge.net/projects/azertyglobal/files/AZERTY_Global_Linux.zip/download'
  };

  const urlParams = new URLSearchParams(window.location.search);
  const os = urlParams.get('os') || 'windows';
  const downloadUrl = downloadUrls[os] || downloadUrls.windows;
  const manualLink = document.getElementById('manual-download-link');

  if (manualLink && downloadUrl) {
    manualLink.href = downloadUrl;
    manualLink.target = '_blank';
  }

  document.querySelectorAll('[data-os-only]').forEach(element => {
    element.style.display = element.dataset.osOnly === os ? '' : 'none';
  });
})();

(function () {
  const form = document.getElementById('feedback-reminder-form');
  const emailInput = document.getElementById('feedback-reminder-email');
  const submitBtn = document.getElementById('feedback-reminder-submit-btn');
  const successMsg = document.getElementById('feedback-reminder-success');

  if (!form || !emailInput || !submitBtn || !successMsg || !window.AzertyWeb3Forms) return;

  form.addEventListener('submit', async event => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const originalLabel = submitBtn.textContent;
    if (!email) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Envoi...';

    try {
      await window.AzertyWeb3Forms.submitForm(form, {
        subject: 'Rappel feedback AZERTY Global',
        from_name: 'AZERTY Global',
        form_type: 'feedback-reminder',
        source: 'thank-you-page',
        date: new Date().toISOString(),
        message: `Demande de rappel feedback\n\nEmail: ${email}\nDate: ${new Date().toISOString()}\nSource: Page Merci`
      });

      form.style.display = 'none';
      successMsg.style.display = 'block';
      successMsg.setAttribute('aria-hidden', 'false');
      successMsg.focus();
    } catch (error) {
      console.error('Merci feedback reminder error:', error);
      alert('Une erreur est survenue. Veuillez reessayer.');
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });
})();
