// Copy character button (landing pages)
// Usage: <button class="copy-trap" data-copy-char="É">
document.addEventListener('DOMContentLoaded', () => {
  const toast = document.getElementById('copy-toast');
  if (toast) {
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.setAttribute('aria-atomic', 'true');
  }

  document.querySelectorAll('[data-copy-char]').forEach(btn => {
    const label = btn.querySelector('.text-xs');
    const originalLabel = label ? label.textContent : null;
    let resetTimer = null;
    let toastHideTimer = null;
    let toastShowTimer = null;

    btn.addEventListener('click', () => {
      const char = btn.dataset.copyChar;
      navigator.clipboard.writeText(char).then(() => {
        if (window.AzertyTrack && window.AzertyTrack.conversion) {
          window.AzertyTrack.conversion('copy_character', { char: char });
        }
        try { sessionStorage.setItem('azerty_copy_clicked', '1'); } catch (e) {}

        clearTimeout(resetTimer);
        clearTimeout(toastShowTimer);
        clearTimeout(toastHideTimer);

        btn.classList.add('is-copied');
        if (label) label.textContent = '✓ Copié';

        if (toast) {
          toastShowTimer = setTimeout(() => toast.classList.add('show'), 150);
          toastHideTimer = setTimeout(() => toast.classList.remove('show'), 3000);
        }

        resetTimer = setTimeout(() => {
          btn.classList.remove('is-copied');
          if (label && originalLabel !== null) label.textContent = originalLabel;
        }, 1500);
      });
    });
  });
});
