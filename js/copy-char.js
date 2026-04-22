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
    btn.addEventListener('click', () => {
      const char = btn.dataset.copyChar;
      navigator.clipboard.writeText(char).then(() => {
        if (window.AzertyTrack && window.AzertyTrack.conversion) {
          window.AzertyTrack.conversion('copy_character', { char: char });
        }
        if (!toast) return;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
      });
    });
  });
});
