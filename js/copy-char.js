// Copy character button (landing pages)
// Usage: <button class="copy-trap" data-copy-char="É">
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-copy-char]').forEach(btn => {
    btn.addEventListener('click', () => {
      const char = btn.dataset.copyChar;
      navigator.clipboard.writeText(char).then(() => {
        const toast = document.getElementById('copy-toast');
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
      });
    });
  });
});
