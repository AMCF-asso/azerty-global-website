(function () {
  'use strict';

  var root = document.querySelector('[data-typography-guide]');
  if (!root) return;

  var lang = root.dataset.guideLang || 'fr';
  var status = root.querySelector('.typography-copy-status');
  var statusTimer;
  var openedForPrint = [];
  var mobileCurrent = root.querySelector('[data-typography-current]');
  var mobileToc = root.querySelector('#typography-mobile-toc-panel');

  function text(fr, en) {
    return lang === 'en' ? en : fr;
  }

  function track(name, details) {
    if (window.AzertyTrack && typeof window.AzertyTrack.event === 'function') {
      window.AzertyTrack.event(name, Object.assign({ language: lang }, details || {}));
    }
  }

  function showStatus(message) {
    if (!status) return;
    clearTimeout(statusTimer);
    status.textContent = message;
    status.classList.add('is-visible');
    statusTimer = setTimeout(function () {
      status.classList.remove('is-visible');
    }, 2200);
  }

  async function copyText(value) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(value);
      return;
    }

    var fallback = document.createElement('textarea');
    fallback.value = value;
    fallback.setAttribute('readonly', '');
    fallback.style.position = 'fixed';
    fallback.style.opacity = '0';
    document.body.appendChild(fallback);
    fallback.select();
    var copied = document.execCommand('copy');
    fallback.remove();
    if (!copied) throw new Error('Clipboard unavailable');
  }

  root.querySelectorAll('[data-typography-copy]').forEach(function (button) {
    button.addEventListener('click', async function () {
      try {
        await copyText(button.dataset.copyValue || '');
        root.querySelectorAll('[data-typography-copy].is-copied').forEach(function (item) {
          item.classList.remove('is-copied');
        });
        button.classList.add('is-copied');
        showStatus(text('Caractère copié.', 'Character copied.'));
        track('typography_copy', {
          item_id: button.dataset.itemId,
          item_type: button.dataset.itemType
        });
      } catch (error) {
        showStatus(text('La copie a échoué. Sélectionnez le caractère manuellement.', 'Copy failed. Select the character manually.'));
      }
    });
  });

  root.querySelectorAll('[data-typography-toc]').forEach(function (link) {
    link.addEventListener('click', function () {
      var hash = link.getAttribute('href');
      if (hash && hash.charAt(0) === '#' && window.location.hash !== hash) {
        window.history.pushState(null, '', hash);
      }
      track('typography_toc_click', { section_id: link.dataset.sectionId });
    });
  });

  var sectionLinks = new Map();
  root.querySelectorAll('.typography-toc a[data-section-id]').forEach(function (link) {
    sectionLinks.set(link.dataset.sectionId, link);
  });

  var viewedSections = new Set();
  var sections = Array.from(root.querySelectorAll('[data-typography-section]'));
  if ('IntersectionObserver' in window && sections.length) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        sectionLinks.forEach(function (link) {
          link.removeAttribute('aria-current');
        });
        if (sectionLinks.has(id)) sectionLinks.get(id).setAttribute('aria-current', 'location');
        if (mobileCurrent && sectionLinks.has(id)) {
          mobileCurrent.textContent = sectionLinks.get(id).textContent.trim();
        }
        if (!viewedSections.has(id)) {
          viewedSections.add(id);
          track('typography_section_view', { section_id: id });
        }
      });
    }, { rootMargin: '-20% 0px -68% 0px', threshold: 0 });
    sections.forEach(function (section) { sectionObserver.observe(section); });
  }

  function preparePrint() {
    openedForPrint = [];
    root.querySelectorAll('.typography-advanced:not([open]), .typography-faq__item:not([open])').forEach(function (details) {
      openedForPrint.push(details);
      details.open = true;
    });
    track('typography_print', { trigger: 'print' });
  }

  function restoreAfterPrint() {
    openedForPrint.forEach(function (details) { details.open = false; });
    openedForPrint = [];
  }

  root.querySelectorAll('[data-typography-print]').forEach(function (button) {
    button.addEventListener('click', function () {
      window.print();
    });
  });

  var mobileTocButton = root.querySelector('[data-typography-mobile-toc]');
  if (mobileTocButton && mobileToc) {
    mobileTocButton.addEventListener('click', function () {
      mobileToc.open = true;
      mobileToc.scrollIntoView({ behavior: 'smooth', block: 'start' });
      var summary = mobileToc.querySelector('summary');
      if (summary) summary.focus({ preventScroll: true });
      track('typography_toc_click', { section_id: 'mobile-contents' });
    });
  }

  window.addEventListener('beforeprint', preparePrint);
  window.addEventListener('afterprint', restoreAfterPrint);
})();
