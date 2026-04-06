(function () {
  const downloadUrls = {
    windows: 'https://sourceforge.net/projects/azertyglobal/files/AZERTY_Global_Beta.zip/download',
    macos: 'https://sourceforge.net/projects/azertyglobal/files/AZERTY_Global_Beta_macOS.zip/download',
    linux: 'https://sourceforge.net/projects/azertyglobal/files/AZERTY_Global_Beta_Linux.zip/download'
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
  const form = document.getElementById('beta-email-form');
  const emailInput = document.getElementById('beta-email');
  const submitBtn = document.getElementById('beta-submit-btn');
  const successMsg = document.getElementById('beta-success');

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
        subject: 'Nouveau beta-testeur AZERTY Global',
        from_name: 'AZERTY Global Beta',
        form_type: 'beta-signup',
        source: 'merci-page',
        date: new Date().toISOString(),
        message: `Nouvel inscrit beta-testeur !\n\nEmail: ${email}\nDate: ${new Date().toISOString()}\nSource: Page Merci`
      });

      form.style.display = 'none';
      successMsg.style.display = 'block';
      successMsg.setAttribute('aria-hidden', 'false');
      successMsg.focus();
    } catch (error) {
      console.error('Merci beta signup error:', error);
      alert('Une erreur est survenue. Veuillez reessayer.');
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });
})();
