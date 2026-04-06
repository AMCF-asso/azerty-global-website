const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_DURATION = 30;

function renderBugSuccess(form) {
  form.innerHTML = `
    <div class="form-success" role="status" aria-live="polite" aria-atomic="true" tabindex="-1">
      <div class="form-success__icon">✅</div>
      <h2 class="form-success__title">Merci pour votre rapport !</h2>
      <p class="form-success__text">
        Votre rapport de bug a bien été envoyé. Il sera traité dans les meilleurs délais.
      </p>
      <a href="/" class="btn btn--primary form-success__action">Retour à l'accueil</a>
    </div>
  `;

  form.querySelector('[role="status"]')?.focus();
  window.scrollTo({ top: form.offsetTop - 100, behavior: 'smooth' });
}

window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const form = document.getElementById('bug-form');

  if (params.get('success') === '1') {
    if (form) {
      renderBugSuccess(form);
    }
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }

  const version = params.get('v');
  const os = params.get('os');
  const src = params.get('src');

  if (version) {
    const element = document.getElementById('app-version');
    element.value = version;
    element.readOnly = true;
    element.style.opacity = '0.7';
  }

  if (os) {
    const element = document.getElementById('os');
    element.value = os;
    element.readOnly = true;
    element.style.opacity = '0.7';
  }

  if (src === 'app') {
    document.getElementById('source').value = 'app';
    document.getElementById('install-method').value = 'microsoft-store';
  }

  if (version || os || src) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
});

function hideAttachmentError() {
  const errorEl = document.getElementById('attachment-error');
  if (!errorEl) return;

  errorEl.style.display = 'none';
  errorEl.setAttribute('aria-hidden', 'true');
}

function showAttachmentError(message) {
  const errorEl = document.getElementById('attachment-error');
  if (!errorEl) return;

  errorEl.textContent = message;
  errorEl.style.display = 'block';
  errorEl.setAttribute('aria-hidden', 'false');
}

function validateFiles(files) {
  hideAttachmentError();

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      showAttachmentError(`Le fichier "${file.name}" fait ${sizeMB} Mo. La taille maximale est de 5 Mo.`);
      return false;
    }
  }

  return true;
}

function checkVideoDuration(file) {
  return new Promise(resolve => {
    if (!file.type.startsWith('video/')) {
      resolve(true);
      return;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);

      if (video.duration > MAX_VIDEO_DURATION) {
        showAttachmentError(`La video "${file.name}" dure ${Math.round(video.duration)}s. La duree maximale est de 30 secondes.`);
        resolve(false);
        return;
      }

      resolve(true);
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve(true);
    };

    video.src = URL.createObjectURL(file);
  });
}

document.getElementById('attachment')?.addEventListener('change', async function () {
  hideAttachmentError();

  if (!validateFiles(this.files)) {
    this.value = '';
    return;
  }

  for (const file of this.files) {
    if (!await checkVideoDuration(file)) {
      this.value = '';
      return;
    }
  }
});

document.getElementById('bug-form')?.addEventListener('submit', async event => {
  event.preventDefault();

  const form = event.currentTarget;
  const fileInput = document.getElementById('attachment');
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalHtml = submitBtn.innerHTML;

  if (fileInput.files.length > 0) {
    if (!validateFiles(fileInput.files)) return;

    for (const file of fileInput.files) {
      if (!await checkVideoDuration(file)) return;
    }
  }

  if (!window.AzertyWeb3Forms) return;

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span>⏳</span> Envoi en cours...';

  try {
    await window.AzertyWeb3Forms.submitForm(form, {
      subject: 'Bug report AZERTY Global',
      from_name: 'AZERTY Global Bug Report',
      form_type: 'bug-report',
      date: new Date().toISOString()
    });

    renderBugSuccess(form);
  } catch (error) {
    console.error('Bug form submission error:', error);
    alert('Une erreur est survenue pendant l\'envoi du rapport. Veuillez réessayer.');
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalHtml;
  }
});
