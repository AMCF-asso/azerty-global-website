/**
 * Carrousel de témoignages — charge depuis data/temoignages.json
 * Infinite loop, auto-scrolls 1 card every 10s.
 * Chevron navigation. Desktop: 3 visible, tablet: 2, mobile: 1.
 */
(function () {
  'use strict';

  var SCROLL_INTERVAL = 10000;
  var container = document.getElementById('temoignages-carousel');
  if (!container) return;

  // Langue pilotée par la page (base-en.njk pose <html lang="en">), pattern t(fr, en).
  var isEnglish = /^en/i.test(document.documentElement.lang || 'fr');
  function t(fr, en) { return isEnglish ? en : fr; }

  fetch('/data/temoignages.json?v=6')
    .then(function (res) { return res.json(); })
    .then(function (data) {
      var temoignages = data.filter(function (t) { return t.display; });
      if (temoignages.length === 0) return;
      buildCarousel(temoignages);
    })
    .catch(function (err) {
      console.error('Échec du chargement des témoignages :', err);
    });

  function createCard(data, isClone) {
    var card = document.createElement('div');
    card.className = 'temoignages-card card';
    if (isClone) {
      card.setAttribute('aria-hidden', 'true');
    }

    var stars = document.createElement('div');
    stars.className = 'mb-2 text-lg';
    stars.textContent = '\u2B50'.repeat(data.stars);

    var quoteText = isEnglish && data.quoteEn ? data.quoteEn : data.quote;
    var quote = document.createElement('p');
    quote.className = 'card__text mb-4 italic';
    quote.textContent = t('\u00AB\u00A0' + quoteText + '\u00A0\u00BB', '\u201C' + quoteText + '\u201D');

    var roleText = isEnglish && data.roleEn ? data.roleEn : data.role;
    var author = document.createElement('p');
    author.className = 'text-sm font-semibold';
    author.textContent = '\u2014\u00A0' + data.name + (roleText ? ', ' + roleText : '');

    card.appendChild(stars);
    card.appendChild(quote);
    card.appendChild(author);
    return card;
  }

  function buildCarousel(temoignages) {
    var totalCards = temoignages.length;

    // Outer container with chevrons
    var outer = document.createElement('div');
    outer.className = 'temoignages-outer';

    // Chevron left
    var chevronLeft = document.createElement('button');
    chevronLeft.className = 'temoignages-chevron temoignages-chevron--left';
    chevronLeft.setAttribute('aria-label', t('Témoignage précédent', 'Previous testimonial'));
    chevronLeft.textContent = '\u2039';

    // Chevron right
    var chevronRight = document.createElement('button');
    chevronRight.className = 'temoignages-chevron temoignages-chevron--right';
    chevronRight.setAttribute('aria-label', t('Témoignage suivant', 'Next testimonial'));
    chevronRight.textContent = '\u203A';

    // Wrapper (overflow hidden)
    var wrapper = document.createElement('div');
    wrapper.className = 'temoignages-wrapper';
    wrapper.setAttribute('aria-live', 'off');

    // Track
    var track = document.createElement('div');
    track.className = 'temoignages-track';

    // Build cards: [clones of last N] + [originals] + [clones of first N]
    // Clone enough cards to fill the visible area
    var maxVisible = 3;

    // Clones of last cards (prepended)
    for (var i = totalCards - maxVisible; i < totalCards; i++) {
      var idx = (i + totalCards) % totalCards;
      track.appendChild(createCard(temoignages[idx], true));
    }

    // Original cards
    for (var j = 0; j < totalCards; j++) {
      track.appendChild(createCard(temoignages[j], false));
    }

    // Clones of first cards (appended)
    for (var k = 0; k < maxVisible; k++) {
      track.appendChild(createCard(temoignages[k % totalCards], true));
    }

    outer.setAttribute('role', 'region');
    outer.setAttribute('aria-label', t('Témoignages d’utilisateurs', 'User testimonials'));
    wrapper.appendChild(track);
    outer.appendChild(chevronLeft);
    outer.appendChild(wrapper);
    outer.appendChild(chevronRight);
    container.appendChild(outer);

    // State
    var currentIndex = maxVisible; // Start at first real card
    var reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    var userPaused = reduceMotionQuery.matches;
    var interactionPaused = false;
    var intervalId = null;
    var isTransitioning = false;

    function isPaused() {
      return userPaused || interactionPaused;
    }

    function getCardWidth() {
      var firstCard = track.querySelector('.temoignages-card');
      if (!firstCard) return 0;
      var style = window.getComputedStyle(track);
      var gap = parseFloat(style.gap) || 24;
      return firstCard.offsetWidth + gap;
    }

    function setPosition(index, animate) {
      var cardWidth = getCardWidth();
      if (animate) {
        track.style.transition = 'transform 0.5s ease';
      } else {
        track.style.transition = 'none';
      }
      track.style.transform = 'translateX(-' + (index * cardWidth) + 'px)';
    }

    function goTo(index, animate) {
      if (isTransitioning) return;
      currentIndex = index;
      setPosition(currentIndex, animate !== false);

      if (animate !== false) {
        isTransitioning = true;
      }
    }

    function slideNext() {
      goTo(currentIndex + 1);
    }

    function slidePrev() {
      goTo(currentIndex - 1);
    }

    // Handle transition end — jump to real position if we're on a clone
    track.addEventListener('transitionend', function () {
      isTransitioning = false;

      // If we scrolled past the last real card, jump to the first real card
      if (currentIndex >= totalCards + maxVisible) {
        currentIndex = maxVisible;
        setPosition(currentIndex, false);
      }

      // If we scrolled before the first real card, jump to the last real card
      if (currentIndex < maxVisible) {
        currentIndex = totalCards + maxVisible - 1;
        setPosition(currentIndex, false);
      }
    });

    // Initial position (no animation)
    setPosition(currentIndex, false);

    // Auto-scroll
    function startAutoScroll() {
      stopAutoScroll();
      intervalId = setInterval(function () {
        if (!isPaused()) slideNext();
      }, SCROLL_INTERVAL);
    }

    function stopAutoScroll() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    function resetAutoScroll() {
      stopAutoScroll();
      startAutoScroll();
    }

    // Pause while the user interacts with the carousel.
    outer.addEventListener('mouseenter', function () { interactionPaused = true; });
    outer.addEventListener('mouseleave', function () { interactionPaused = false; });
    outer.addEventListener('focusin', function () { interactionPaused = true; });
    outer.addEventListener('focusout', function () {
      window.setTimeout(function () {
        interactionPaused = outer.contains(document.activeElement);
      }, 0);
    });

    if (reduceMotionQuery.addEventListener) {
      reduceMotionQuery.addEventListener('change', function (event) {
        if (event.matches) userPaused = true;
      });
    }

    // Chevron clicks
    chevronLeft.addEventListener('click', function () {
      slidePrev();
      resetAutoScroll();
    });

    chevronRight.addEventListener('click', function () {
      slideNext();
      resetAutoScroll();
    });

    // Handle resize
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        setPosition(currentIndex, false);
      }, 150);
    });

    startAutoScroll();
  }
})();
