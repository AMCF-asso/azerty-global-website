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

    var closeBtn = modal.querySelector('.modal__close');
    if (closeBtn) closeBtn.focus();
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

  // ESC
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var openEl = document.querySelector('.modal.is-open');
      if (openEl) closeModal(openEl);
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
