/**
 * Lazy-loader for tester modal, keyboard hotspots, and layout data.
 * Replaces direct <script> tags to reduce initial page weight.
 *
 * Usage in HTML:
 *   <script defer src="js/lazy-tester.js"></script>
 *   <script defer src="js/lazy-tester.js" data-mode="lessons" data-module="1" data-lesson="3"></script>
 *   <script defer src="js/lazy-tester.js" data-tutorial="start"></script>
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

  function shouldUseTesterFallback() {
    var isMobileUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    var hasNoHover = window.matchMedia && window.matchMedia('(hover: none)').matches;
    var hasCoarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    return isMobileUA || hasNoHover || hasCoarsePointer;
  }

  function isTouchLike() {
    return !!(window.matchMedia && (window.matchMedia('(hover: none)').matches ||
      window.matchMedia('(max-width: 1024px)').matches));
  }

  // Keyboard hotspots loader — shared by the inline desktop map and the mobile
  // fullscreen overlay. Declared here so the keyboard-preview block below can
  // relocate the hotspots into the overlay and render them eagerly on mobile.
  var hotspotsContainer = document.getElementById('keyboard-hotspots-container');
  var hotspotsLoaded = false;
  var mobileHotspotsHandled = false;

  function loadHotspots() {
    if (hotspotsLoaded || !hotspotsContainer) return;
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

  // ─── Keyboard Preview (touch tap-to-expand) ───
  // Lightweight — runs eagerly since it affects the visible hero.
  var keyboard = document.querySelector('.hero__keyboard');
  if (keyboard) {
    var simpleKeyboardImage = keyboard.querySelector('.hero__keyboard-img--simple');
    var fullKeyboardImage = keyboard.querySelector('.hero__keyboard-img--full');
    var keyboardFullscreen = null;
    var keyboardFullscreenStage = null;
    var fullscreenMode = 'simple';

    keyboard.addEventListener('click', function () {
      if (!shouldUseKeyboardFullscreen()) return;
      openKeyboardFullscreen();
    });

    keyboard.addEventListener('keydown', function (event) {
      if (!shouldUseKeyboardFullscreen()) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openKeyboardFullscreen();
      }
    });

    keyboard.setAttribute('tabindex', '0');
    keyboard.setAttribute('role', 'button');
    keyboard.setAttribute('aria-label', 'Afficher la carte simplifiée en plein écran');

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeKeyboardFullscreen();
    });

    function shouldUseKeyboardFullscreen() {
      return isTouchLike();
    }

    function openKeyboardFullscreen() {
      if (!simpleKeyboardImage) return;
      if (!keyboardFullscreen) {
        keyboardFullscreen = createKeyboardFullscreen();
      }

      // Always reopen on the simplified map.
      setFullscreenMap('simple');

      keyboardFullscreen.hidden = false;
      document.body.classList.add('keyboard-fullscreen-open');
      keyboardFullscreen.querySelector('.keyboard-fullscreen__close').focus();
    }

    // Swap the fullscreen image between the simplified and complete maps.
    // Reads from the live <img> elements so platform variants (macOS) are respected.
    function setFullscreenMap(mode) {
      if (!keyboardFullscreen) return;

      var wantsFull = mode === 'full' && fullKeyboardImage;
      var sourceImage = wantsFull ? fullKeyboardImage : simpleKeyboardImage;
      if (!sourceImage) return;

      fullscreenMode = wantsFull ? 'full' : 'simple';

      var fullscreenImage = keyboardFullscreen.querySelector('.keyboard-fullscreen__image');
      fullscreenImage.src = sourceImage.currentSrc || sourceImage.src;
      fullscreenImage.alt = sourceImage.alt;

      // Drive hotspot filtering: in simple mode the CSS hides the AltGr layers.
      if (keyboardFullscreenStage) {
        keyboardFullscreenStage.classList.toggle('is-full', wantsFull);
      }

      var toggle = keyboardFullscreen.querySelector('.keyboard-fullscreen__switch');
      if (toggle) {
        toggle.setAttribute('aria-checked', wantsFull ? 'true' : 'false');
        toggle.setAttribute('aria-label', wantsFull
          ? 'Afficher la carte simplifiée'
          : 'Afficher la carte complète');
      }
    }

    function closeKeyboardFullscreen() {
      if (!keyboardFullscreen || keyboardFullscreen.hidden) return;
      keyboardFullscreen.hidden = true;
      document.body.classList.remove('keyboard-fullscreen-open');
      keyboard.focus();
    }

    function createKeyboardFullscreen() {
      var overlay = document.createElement('div');
      overlay.className = 'keyboard-fullscreen keyboard-map-overlay';
      overlay.hidden = true;
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', 'Carte du clavier AZERTY Global');

      var closeButton = document.createElement('button');
      closeButton.type = 'button';
      closeButton.className = 'keyboard-fullscreen__close';
      closeButton.setAttribute('aria-label', 'Fermer la carte plein écran');
      closeButton.textContent = '×';

      // Stage wraps the map image and the hotspots container so the hotspots'
      // percentage positions map onto the image (same model as the guide overlay).
      var stage = document.createElement('div');
      stage.className = 'keyboard-fullscreen__stage hero__keyboard';

      var image = document.createElement('img');
      image.className = 'keyboard-fullscreen__image';
      image.decoding = 'async';
      stage.appendChild(image);

      overlay.appendChild(closeButton);
      overlay.appendChild(stage);
      keyboardFullscreenStage = stage;

      // Switch simplified <-> complete map (only if a complete map exists).
      if (fullKeyboardImage) {
        var toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'keyboard-fullscreen__switch';
        toggle.setAttribute('role', 'switch');
        toggle.setAttribute('aria-checked', 'false');
        toggle.setAttribute('aria-label', 'Afficher la carte complète');

        var knob = document.createElement('span');
        knob.className = 'keyboard-fullscreen__switch-knob';
        knob.setAttribute('aria-hidden', 'true');
        toggle.appendChild(knob);

        toggle.addEventListener('click', function () {
          setFullscreenMap(fullscreenMode === 'full' ? 'simple' : 'full');
        });

        overlay.appendChild(toggle);
      }

      document.body.appendChild(overlay);

      closeButton.addEventListener('click', closeKeyboardFullscreen);
      overlay.addEventListener('click', function (event) {
        if (event.target === overlay) closeKeyboardFullscreen();
      });

      return overlay;
    }

    // Mobile: the hotspots belong inside the fullscreen overlay, not on the inline
    // hero. Tapping the inline map then opens it "en grand" with the hotspots,
    // instead of the hotspots intercepting the tap. Render eagerly: the hidden
    // overlay would never trigger the inline IntersectionObserver.
    if (isTouchLike() && hotspotsContainer) {
      keyboardFullscreen = createKeyboardFullscreen();
      keyboardFullscreenStage.appendChild(hotspotsContainer);
      mobileHotspotsHandled = true;
      loadHotspots();
    }
  }

  // ─── Tester Modal Lazy Loading ───
  var testerLoaded = false;
  var testerLoading = false;
  var testerLoadPromise = null;
  var testerAssetVersion = 'final-20260703-2';
  var openBtn = document.getElementById('open-tester-btn');
  var shouldAutoLoadLessons = !shouldUseTesterFallback() &&
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
      cssLink.href = 'tester/keyboard.css?v=' + testerAssetVersion;

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
    initUrl.searchParams.set('v', testerAssetVersion);
    if (scriptTag) {
      var mode = scriptTag.getAttribute('data-mode');
      var mod = scriptTag.getAttribute('data-module');
      var lesson = scriptTag.getAttribute('data-lesson');
      var tutorial = scriptTag.getAttribute('data-tutorial');
      var guidedHints = scriptTag.getAttribute('data-guided-hints');
      if (mode) initUrl.searchParams.set('mode', mode);
      if (mod) initUrl.searchParams.set('module', mod);
      if (lesson) initUrl.searchParams.set('lesson', lesson);
      if (tutorial) initUrl.searchParams.set('tutorial', tutorial);
      if (guidedHints) initUrl.searchParams.set('guidedHints', guidedHints);
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
    if (shouldUseTesterFallback()) {
      openBtn.style.display = 'none';
      // Sur les pages avec un CTA "Ce qui change" mobile (home/audiences), on l'affiche
      // a la place du testeur. Les LP utilisent leur propre carte ; presse masque le
      // testeur en CSS (cf. .page-presse #open-tester-btn). Plus de repli textuel injecte.
      var mobileGuideFallback = document.querySelector('.hero__mobile-guide');
      if (mobileGuideFallback) {
        mobileGuideFallback.style.display = 'inline-flex';
      }
    } else {
      openBtn.addEventListener('click', function handler() {
        if (testerLoaded || testerLoading) return;
        loadTesterOnce().then(function () {
          openBtn.click();
        }).catch(function () { });
      });
    }
  }

  if (shouldAutoLoadLessons && openBtn) {
    loadTesterOnce().catch(function () { });
  }

  // ─── Keyboard Hotspots Lazy Loading (inline desktop map) ───
  // On mobile the hotspots were already relocated into the fullscreen overlay and
  // rendered eagerly above; here we only schedule the inline desktop rendering.
  if (hotspotsContainer && !mobileHotspotsHandled) {
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
