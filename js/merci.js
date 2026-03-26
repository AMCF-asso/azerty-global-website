// Set up manual download link based on OS parameter
(function () {
  const DOWNLOAD_URLS = {
    windows: 'https://sourceforge.net/projects/azertyglobal/files/AZERTY_Global_Beta.zip/download',
    macos: 'https://sourceforge.net/projects/azertyglobal/files/AZERTY_Global_Beta_macOS.zip/download',
    linux: 'https://sourceforge.net/projects/azertyglobal/files/AZERTY_Global_Beta_Linux.zip/download'
  };

  const urlParams = new URLSearchParams(window.location.search);
  const os = urlParams.get('os') || 'windows';
  const downloadUrl = DOWNLOAD_URLS[os] || DOWNLOAD_URLS.windows;

  const manualLink = document.getElementById('manual-download-link');
  if (manualLink && downloadUrl) {
    manualLink.href = downloadUrl;
    manualLink.target = '_blank';
  }

  document.querySelectorAll('[data-os-only]').forEach(el => {
    if (el.dataset.osOnly === os) {
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  });
})();

// Beta email form submission
(function () {
  const form = document.getElementById('beta-email-form');
  const emailInput = document.getElementById('beta-email');
  const submitBtn = document.getElementById('beta-submit-btn');
  const successMsg = document.getElementById('beta-success');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = emailInput.value.trim();
      if (!email) return;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Envoi...';

      try {
        const response = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            access_key: 'a4d82407-9cc8-4242-b491-ebd1e736a4fc',
            subject: '🧪 Nouveau bêta-testeur AZERTY Global',
            from_name: 'AZERTY Global Beta',
            email: email,
            message: `Nouvel inscrit bêta-testeur !\n\nEmail: ${email}\nDate: ${new Date().toISOString()}\nSource: Page Merci`,
            source: 'merci-page',
            date: new Date().toISOString()
          })
        });

        if (response.ok) {
          form.style.display = 'none';
          successMsg.style.display = 'block';
        } else {
          throw new Error('Erreur');
        }
      } catch (error) {
        alert('Une erreur est survenue. Veuillez réessayer.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Devenir bêta-testeur 🚀';
      }
    });
  }
})();
