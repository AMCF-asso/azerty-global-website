// Generic toggle button system for FAQ sections (aide.html)
(function() {
  function setupToggleButtons(containerId, itemClass) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var items = document.querySelectorAll('.' + itemClass);
    items.forEach(function(item) { item.style.display = 'none'; });
    container.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-target]');
      if (!btn) return;
      var targetId = btn.dataset.target;
      items.forEach(function(item) { item.style.display = 'none'; });
      var target = document.getElementById(targetId);
      target.style.display = '';
      target.open = true;
      container.querySelectorAll('[data-target]').forEach(function(b) {
        b.classList.remove('btn--primary');
        b.classList.add('btn--secondary');
      });
      btn.classList.remove('btn--secondary');
      btn.classList.add('btn--primary');
    });
  }
  setupToggleButtons('accent-buttons', 'faq-accent');
  setupToggleButtons('typo-buttons', 'faq-typo');
  setupToggleButtons('symbole-buttons', 'faq-symbole');
  setupToggleButtons('lang-buttons', 'faq-lang');
})();
