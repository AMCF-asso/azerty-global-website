/**
 * Lazy-loader for tester modal, keyboard hotspots, and layout data.
 * Replaces direct <script> tags to reduce initial page weight.
 *
 * Usage in HTML:
 *   <script defer src="js/lazy-tester.js"></script>
 *   <script defer src="js/lazy-tester.js" data-mode="lessons" data-module="1" data-lesson="3"></script>
 *   Add data-layout="true" on pages that need layout-data.js (index, ecoles, entreprises).
 */
(function () {
  'use strict';

  function getCurrentScriptTag() {
    if (document.currentScript instanceof HTMLScriptElement) {
      return document.currentScript;
    }

    var scripts = document.querySelectorAll('script[src]');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].getAttribute('src') || '';
      if (/lazy-tester(?:\.min)?\.js(?:[?#].*)?$/i.test(src)) {
        return scripts[i];
      }
    }

    return null;
  }

  var scriptTag = getCurrentScriptTag();

  // ─── Keyboard Preview (touch tap-to-expand) ───
  // Lightweight — runs eagerly since it affects the visible hero.
  var keyboard = document.querySelector('.hero__keyboard');
  if (keyboard) {
    keyboard.addEventListener('click', function (e) {
      if (window.matchMedia('(hover: none)').matches) {
        e.stopPropagation();
        this.classList.add('is-full');
      }
    });
    document.addEventListener('click', function (e) {
      if (window.matchMedia('(hover: none)').matches) {
        if (!keyboard.contains(e.target)) {
          keyboard.classList.remove('is-full');
        }
      }
    });
  }

  // ─── Tester Modal Lazy Loading ───
  var testerLoaded = false;
  var testerLoading = false;
  var testerLoadPromise = null;
  var openBtn = document.getElementById('open-tester-btn');
  var shouldAutoLoadLessons = !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) &&
    new URLSearchParams(window.location.search).get('mode') === 'lessons';

  function removeTesterLoadNotice() {
    var existingNotice = document.getElementById('tester-load-notice');
    if (existingNotice) {
      existingNotice.remove();
    }
  }

  function showTesterLoadNotice(message, retryHandler) {
    var root = document.querySelector('.hero__actions') || openBtn?.parentElement;
    if (!root) return;

    removeTesterLoadNotice();

    var notice = document.createElement('div');
    notice.id = 'tester-load-notice';
    notice.className = 'tester-notice tester-notice--error';

    var text = document.createElement('span');
    text.className = 'tester-notice__text';
    text.textContent = message;
    notice.appendChild(text);

    if (retryHandler) {
      var retryButton = document.createElement('button');
      retryButton.type = 'button';
      retryButton.className = 'tester-notice__action';
      retryButton.textContent = 'Réessayer';
      retryButton.addEventListener('click', retryHandler);
      notice.appendChild(retryButton);
    }

    root.insertBefore(notice, root.firstChild);
  }

  function ensureKeyboardStylesheet() {
    var existingLink = document.querySelector('link[href*="tester/keyboard.css"]');

    if (existingLink) {
      if (existingLink.dataset.loaded === 'true' || existingLink.sheet) {
        existingLink.dataset.loaded = 'true';
        return Promise.resolve(existingLink);
      }

      return new Promise(function (resolve, reject) {
        function onLoad() {
          existingLink.dataset.loaded = 'true';
          cleanup();
          resolve(existingLink);
        }

        function onError() {
          cleanup();
          reject(new Error('Failed to load tester/keyboard.css'));
        }

        function cleanup() {
          existingLink.removeEventListener('load', onLoad);
          existingLink.removeEventListener('error', onError);
        }

        existingLink.addEventListener('load', onLoad, { once: true });
        existingLink.addEventListener('error', onError, { once: true });
      });
    }

    return new Promise(function (resolve, reject) {
      var cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = 'tester/keyboard.css';

      cssLink.addEventListener('load', function () {
        cssLink.dataset.loaded = 'true';
        resolve(cssLink);
      }, { once: true });

      cssLink.addEventListener('error', function () {
        reject(new Error('Failed to load tester/keyboard.css'));
      }, { once: true });

      document.head.appendChild(cssLink);
    });
  }

  function buildInitUrl() {
    var initUrl = new URL('js/init-tester.js', window.location.href);
    if (scriptTag) {
      var mode = scriptTag.getAttribute('data-mode');
      var mod = scriptTag.getAttribute('data-module');
      var lesson = scriptTag.getAttribute('data-lesson');
      if (mode) initUrl.searchParams.set('mode', mode);
      if (mod) initUrl.searchParams.set('module', mod);
      if (lesson) initUrl.searchParams.set('lesson', lesson);
    }
    return initUrl;
  }

  function loadTesterOnce() {
    if (testerLoaded) {
      return Promise.resolve();
    }

    if (testerLoadPromise) {
      return testerLoadPromise;
    }

    testerLoading = true;
    if (openBtn) openBtn.classList.add('is-loading');

    testerLoadPromise = ensureKeyboardStylesheet()
      .then(function () {
        return import(buildInitUrl().href);
      })
      .then(function () {
        testerLoaded = true;
        removeTesterLoadNotice();
      })
      .catch(function (err) {
        console.error('Failed to load tester:', err);
        showTesterLoadNotice(
          'Le testeur n’a pas pu être chargé. Vérifiez votre connexion puis réessayez.',
          function () {
            removeTesterLoadNotice();
            loadTesterOnce().then(function () {
              if (openBtn) openBtn.click();
            }).catch(function () { });
          }
        );
        throw err;
      })
      .finally(function () {
        testerLoading = false;
        testerLoadPromise = null;
        if (openBtn) openBtn.classList.remove('is-loading');
      });

    return testerLoadPromise;
  }

  if (openBtn) {
    openBtn.addEventListener('click', function handler() {
      if (testerLoaded || testerLoading) return;
      loadTesterOnce().then(function () {
        openBtn.click();
      }).catch(function () { });
    });
  }

  if (shouldAutoLoadLessons && openBtn) {
    loadTesterOnce().catch(function () { });
  }

  // ─── Keyboard Hotspots Lazy Loading ───
  var hotspotsContainer = document.getElementById('keyboard-hotspots-container');

  if (hotspotsContainer) {
    var hotspotsLoaded = false;

    function loadHotspots() {
      if (hotspotsLoaded) return;
      hotspotsLoaded = true;

      var script = document.createElement('script');
      script.src = 'js/keyboard-hotspots.js';
      document.body.appendChild(script);

      // Also load layout-data.js if the page needs it
      if (scriptTag && scriptTag.getAttribute('data-layout') === 'true') {
        var layoutScript = document.createElement('script');
        layoutScript.src = 'js/layout-data.js';
        document.body.appendChild(layoutScript);
      }
    }

    // Use IntersectionObserver to load when keyboard section is near viewport
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          loadHotspots();
          observer.disconnect();
        }
      }, { rootMargin: '200px' });
      observer.observe(hotspotsContainer);
    } else {
      // Fallback: load immediately
      loadHotspots();
    }
  }
})();
