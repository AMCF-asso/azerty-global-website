// OS Tabs functionality
document.querySelectorAll('.os-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.os-tab').forEach(t => t.classList.remove('os-tab--active'));
    document.querySelectorAll('.os-content').forEach(c => c.style.display = 'none');
    tab.classList.add('os-tab--active');
    document.getElementById('os-' + tab.dataset.os).style.display = 'block';
  });
});

// Beta Modal functionality
(function () {
  const DOWNLOAD_URL = 'https://sourceforge.net/projects/azertyglobal/files/AZERTY_Global_Beta.zip/download';
  const BETA_END_DATE = new Date('2026-04-01');

  const modal = document.getElementById('beta-modal');
  const overlay = modal.querySelector('.beta-modal__overlay');
  const closeBtn = modal.querySelector('.beta-modal__close');
  const skipBtn = document.getElementById('beta-skip-btn');
  const emailForm = document.getElementById('beta-email-form');
  const emailInput = document.getElementById('beta-email');
  const submitBtn = document.getElementById('beta-submit-btn');
  const formContainer = document.getElementById('beta-form-container');
  const successContainer = document.getElementById('beta-success');
  const downloadBtn = document.getElementById('btn-download-exe');

  function isBetaActive() {
    return new Date() < BETA_END_DATE;
  }

  const MAX_MODAL_VIEWS = 2;

  function getModalViewCount() {
    return parseInt(sessionStorage.getItem('azerty-beta-modal-count') || '0', 10);
  }

  function hasAlreadyParticipated() {
    return getModalViewCount() >= MAX_MODAL_VIEWS;
  }

  function incrementModalViewCount() {
    const count = getModalViewCount() + 1;
    sessionStorage.setItem('azerty-beta-modal-count', count.toString());
  }

  function markAsParticipated() {
    sessionStorage.setItem('azerty-beta-modal-count', MAX_MODAL_VIEWS.toString());
  }

  function openModal() {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    emailInput.focus();
    incrementModalViewCount();
  }

  function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  function closeModalAndDownload() {
    closeModal();
    window.open(DOWNLOAD_URL, '_blank');
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', (e) => {
      setTimeout(() => {
        window.location.href = 'merci.html?os=windows';
      }, 100);
    });
  }

  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);

  skipBtn.addEventListener('click', () => {
    markAsParticipated();
    closeModalAndDownload();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'flex') {
      closeModal();
    }
  });

  const smartscreenLink = document.getElementById('smartscreen-more-info');
  if (smartscreenLink) {
    smartscreenLink.addEventListener('click', (e) => {
      e.preventDefault();
      closeModal();
      const detailsSection = document.getElementById('smartscreen-details');
      if (detailsSection) {
        detailsSection.open = true;
        detailsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  emailForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    if (!email) return;

    submitBtn.classList.add('beta-modal__submit-loading');
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
          message: `Nouvel inscrit bêta-testeur !\n\nEmail: ${email}\nDate: ${new Date().toISOString()}\nSource: Modale téléchargement`,
          source: 'beta-modal',
          date: new Date().toISOString()
        })
      });

      if (response.ok) {
        formContainer.style.display = 'none';
        successContainer.style.display = 'block';
        skipBtn.textContent = 'Télécharger maintenant';
        markAsParticipated();

        setTimeout(closeModalAndDownload, 2000);
      } else {
        throw new Error('Submission failed');
      }
    } catch (error) {
      console.error('Beta form error:', error);
      alert('Désolé, une erreur s\'est produite. Le téléchargement va quand même démarrer.');
      markAsParticipated();
      closeModalAndDownload();
    }
  });
})();

// Handle Beta CTA form submission (AJAX, no redirect)
(function() {
  function setupBetaForm(form, formContainer, successContainer) {
    const emailInput = form.querySelector('input[type="email"]');
    const submitBtn = form.querySelector('button[type="submit"]');

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
            subject: '📧 Nouvelle inscription Beta (page Download)',
            from_name: 'AZERTY Global Beta Signup',
            email: email,
            message: `Nouvel inscrit bêta !\n\nEmail: ${email}\nDate: ${new Date().toLocaleString('fr-FR')}\nSource: Page Téléchargement`
          })
        });

        if (response.ok) {
          formContainer.style.display = 'none';
          successContainer.style.display = 'block';
        } else {
          throw new Error('Erreur serveur');
        }
      } catch (error) {
        console.error('Beta signup error:', error);
        alert('Désolé, une erreur s\'est produite. Veuillez réessayer.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Je participe 🚀';
      }
    });
  }

  const winForm = document.getElementById('download-beta-signup');
  const winFormContainer = document.getElementById('beta-cta-form');
  const winSuccessContainer = document.getElementById('beta-cta-success');
  if (winForm && winFormContainer && winSuccessContainer) {
    setupBetaForm(winForm, winFormContainer, winSuccessContainer);
  }

  document.querySelectorAll('.beta-signup-form').forEach(form => {
    const card = form.closest('.beta-cta-card');
    if (card) {
      const formContainer = card.querySelector('.beta-cta-form-container');
      const successContainer = card.querySelector('.beta-cta-success-container');
      if (formContainer && successContainer) {
        setupBetaForm(form, formContainer, successContainer);
      }
    }
  });
})();
