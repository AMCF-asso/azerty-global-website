/**
 * Modal HelloAsso — ouverture au clic sur CTA ou via hash URL (#don, #adherer).
 * Iframe non chargee tant que le modal n'est pas ouvert (src injecte a la demande).
 */
(function () {
  'use strict';

  var triggers = document.querySelectorAll('[data-modal-target]');
  var modals = document.querySelectorAll('.modal');
  var lastFocus = null;

  var HASH_TO_MODAL = { 'don': 'modal-don', 'adherer': 'modal-adherer' };
  var FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'iframe',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  function getFocusableElements(modal) {
    return Array.prototype.slice.call(modal.querySelectorAll(FOCUSABLE_SELECTOR))
      .filter(function (el) {
        return el.offsetParent !== null || el === document.activeElement;
      });
  }

  function openModal(id) {
    var modal = document.getElementById(id);
    if (!modal || modal.classList.contains('is-open')) return;

    // Lazy-load iframe src
    var iframe = modal.querySelector('iframe[data-src]');
    if (iframe && !iframe.getAttribute('src')) {
      iframe.setAttribute('src', iframe.getAttribute('data-src'));
    }

    lastFocus = document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    var content = modal.querySelector('.modal__content');
    if (content && !content.hasAttribute('tabindex')) {
      content.setAttribute('tabindex', '-1');
    }

    var closeBtn = modal.querySelector('.modal__close');
    if (closeBtn) {
      closeBtn.focus();
    } else if (content) {
      content.focus();
    }
  }

  function closeModal(modal) {
    if (!modal || !modal.classList.contains('is-open')) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    // Retirer le hash pour eviter reouverture si on refresh
    if (window.location.hash) {
      var url = window.location.pathname + window.location.search;
      history.replaceState(null, '', url);
    }
  }

  // Click sur trigger
  triggers.forEach(function (trigger) {
    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      openModal(this.getAttribute('data-modal-target'));
    });
  });

  // Click overlay / close
  modals.forEach(function (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target.classList.contains('modal__overlay') ||
          e.target.classList.contains('modal__close') ||
          (e.target.closest && e.target.closest('.modal__close'))) {
        closeModal(modal);
      }
    });
  });

  // ESC + focus trap
  document.addEventListener('keydown', function (e) {
    var openEl = document.querySelector('.modal.is-open');
    if (!openEl) return;

    if (e.key === 'Escape') {
      closeModal(openEl);
      return;
    }

    if (e.key !== 'Tab') return;

    var focusable = getFocusableElements(openEl);
    var content = openEl.querySelector('.modal__content');
    if (!focusable.length) {
      e.preventDefault();
      if (content) content.focus();
      return;
    }

    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  // Auto-open depuis hash URL
  function openFromHash() {
    var hash = window.location.hash.substring(1);
    if (!hash) return;
    var id = HASH_TO_MODAL[hash];
    if (id) openModal(id);
  }
  openFromHash();
  window.addEventListener('hashchange', openFromHash);
})();
