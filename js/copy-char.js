// Copy character button (landing pages)
// Usage: <button class="copy-trap" data-copy-char="É">
const POST_COPY_CTA_NAMES = ['try_online', 'download_click'];

document.addEventListener('click', (e) => {
  const cta = e.target.closest('[data-track-conversion]');
  if (!cta) return;
  const ctaName = cta.dataset.trackConversion;
  if (!POST_COPY_CTA_NAMES.includes(ctaName)) return;

  let copied = null;
  try { copied = sessionStorage.getItem('azerty_copy_clicked'); } catch (e2) {}
  if (copied !== '1') return;

  if (window.AzertyTrack && window.AzertyTrack.conversion) {
    window.AzertyTrack.conversion('click_cta_post_copy', {
      cta_name: ctaName,
      cta_placement: cta.dataset.trackDetailPlacement || 'unknown'
    });
  }
  try { sessionStorage.removeItem('azerty_copy_clicked'); } catch (e2) {}
}, true);

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
