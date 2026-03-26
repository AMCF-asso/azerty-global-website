// Pre-fill from URL params (sent by the app)
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);

  // Success redirect
  if (params.get('success') === '1') {
    const form = document.getElementById('bug-form');
    if (form) {
      form.innerHTML = `
        <div style="text-align: center; padding: var(--space-8) 0;">
          <div style="font-size: 3rem; margin-bottom: var(--space-4);">✅</div>
          <h2 style="color: var(--color-success); margin-bottom: var(--space-3);">Merci pour votre rapport !</h2>
          <p style="color: var(--text-secondary); font-size: var(--text-lg); max-width: 500px; margin: 0 auto;">
            Votre rapport de bug a bien été envoyé. Il sera traité dans les meilleurs délais.
          </p>
          <a href="/" class="btn btn--primary" style="margin-top: var(--space-6);">Retour à l'accueil</a>
        </div>
      `;
      window.scrollTo({ top: form.offsetTop - 100, behavior: 'smooth' });
    }
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }

  // Pre-fill fields from app
  const version = params.get('v');
  const os = params.get('os');
  const src = params.get('src');

  if (version) {
    const el = document.getElementById('app-version');
    el.value = version;
    el.readOnly = true;
    el.style.opacity = '0.7';
  }

  if (os) {
    const el = document.getElementById('os');
    el.value = os;
    el.readOnly = true;
    el.style.opacity = '0.7';
  }

  if (src === 'app') {
    document.getElementById('source').value = 'app';
    // Pre-select Microsoft Store
    document.getElementById('install-method').value = 'microsoft-store';
  }

  // Clean URL
  if (version || os || src) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
});

// Attachment validation
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo
const MAX_VIDEO_DURATION = 30; // secondes

function validateFiles(files) {
  const errorEl = document.getElementById('attachment-error');
  errorEl.style.display = 'none';

  for (const file of files) {
    // Size check
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      errorEl.textContent = `Le fichier « ${file.name} » fait ${sizeMB} Mo. La taille maximale est de 5 Mo.`;
      errorEl.style.display = 'block';
      return false;
    }
  }
  return true;
}

function checkVideoDuration(file) {
  return new Promise((resolve) => {
    if (!file.type.startsWith('video/')) { resolve(true); return; }
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      if (video.duration > MAX_VIDEO_DURATION) {
        const errorEl = document.getElementById('attachment-error');
        errorEl.textContent = `La vidéo « ${file.name} » dure ${Math.round(video.duration)}s. La durée maximale est de 30 secondes.`;
        errorEl.style.display = 'block';
        resolve(false);
      } else {
        resolve(true);
      }
    };
    video.onerror = () => { URL.revokeObjectURL(video.src); resolve(true); };
    video.src = URL.createObjectURL(file);
  });
}

document.getElementById('attachment')?.addEventListener('change', async function () {
  const errorEl = document.getElementById('attachment-error');
  errorEl.style.display = 'none';
  if (!validateFiles(this.files)) { this.value = ''; return; }
  for (const file of this.files) {
    if (!await checkVideoDuration(file)) { this.value = ''; return; }
  }
});

// Form submission
document.getElementById('bug-form').addEventListener('submit', async (e) => {
  const fileInput = document.getElementById('attachment');
  if (fileInput.files.length > 0) {
    if (!validateFiles(fileInput.files)) { e.preventDefault(); return; }
    for (const file of fileInput.files) {
      if (!await checkVideoDuration(file)) { e.preventDefault(); return; }
    }
  }
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span>⏳</span> Envoi en cours...';
});
