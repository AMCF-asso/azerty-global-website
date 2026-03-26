// Feedback form logic
// Show/hide Windows version field based on OS selection
document.getElementById('os')?.addEventListener('change', function () {
  const isWindows = this.value.startsWith('win');
  const isOldWindows = this.value === 'win-other';
  const installMethod = document.getElementById('install-method');

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

// Form submission - using Web3Forms directly
document.getElementById('feedback-form').addEventListener('submit', async (e) => {
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span>⏳</span> Envoi en cours...';
});

// Check for success parameter from Web3Forms redirect
window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('success') === '1') {
    const form = document.getElementById('feedback-form');
    if (form) {
      form.innerHTML = `
        <div style="text-align: center; padding: var(--space-8) 0;">
          <div style="font-size: 3rem; margin-bottom: var(--space-4);">✅</div>
          <h2 style="color: var(--color-success); margin-bottom: var(--space-3);">Merci beaucoup !</h2>
          <p style="color: var(--text-secondary); font-size: var(--text-lg); max-width: 500px; margin: 0 auto;">
            Votre retour a bien été envoyé. Il m'aidera grandement à améliorer AZERTY Global.
          </p>
          <a href="/" class="btn btn--primary" style="margin-top: var(--space-6);">Retour à l'accueil</a>
        </div>
      `;
      window.scrollTo({ top: form.offsetTop - 100, behavior: 'smooth' });
    }
    window.history.replaceState({}, document.title, window.location.pathname);
  }
});

// Donation amount selector
let selectedAmount = 10;

document.querySelectorAll('.donation-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    selectedAmount = parseInt(this.dataset.amount);

    document.querySelectorAll('.donation-btn').forEach(b => {
      b.classList.remove('btn--primary');
      b.classList.add('btn--secondary');
    });
    this.classList.remove('btn--secondary');
    this.classList.add('btn--primary');

    document.getElementById('custom-amount').value = '';
  });
});

// Custom amount input
document.getElementById('custom-amount')?.addEventListener('input', function () {
  if (this.value) {
    selectedAmount = parseInt(this.value);
    document.querySelectorAll('.donation-btn').forEach(b => {
      b.classList.remove('btn--primary');
      b.classList.add('btn--secondary');
    });
  }
});

// Donate button
document.getElementById('donate-btn')?.addEventListener('click', function () {
  if (selectedAmount && selectedAmount > 0) {
    window.open(`https://www.paypal.com/paypalme/azertyglobal/${selectedAmount}EUR`, '_blank');
  } else {
    window.open('https://www.paypal.com/paypalme/azertyglobal', '_blank');
  }
});
