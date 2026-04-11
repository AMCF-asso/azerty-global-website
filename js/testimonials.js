/**
 * Testimonials carousel — loads from data/testimonials.json
 * Infinite loop, auto-scrolls 1 card every 10s, pauses on hover.
 * Chevron navigation. Desktop: 3 visible, tablet: 2, mobile: 1.
 */
(function () {
  'use strict';

  var SCROLL_INTERVAL = 10000;
  var container = document.getElementById('testimonials-carousel');
  if (!container) return;

  fetch('/data/testimonials.json')
    .then(function (res) { return res.json(); })
    .then(function (data) {
      var testimonials = data.filter(function (t) { return t.display; });
      if (testimonials.length === 0) return;
      buildCarousel(testimonials);
    })
    .catch(function (err) {
      console.error('Failed to load testimonials:', err);
    });

  function createCard(t) {
    var card = document.createElement('div');
    card.className = 'testimonials-card card';

    var stars = document.createElement('div');
    stars.className = 'mb-2 text-lg';
    stars.textContent = '\u2B50'.repeat(t.stars);

    var quote = document.createElement('p');
    quote.className = 'card__text mb-4 italic';
    quote.textContent = '\u00AB\u00A0' + t.quote + '\u00A0\u00BB';

    var author = document.createElement('p');
    author.className = 'text-sm font-semibold';
    author.textContent = '\u2014\u00A0' + t.name + (t.role ? ', ' + t.role : '');

    card.appendChild(stars);
    card.appendChild(quote);
    card.appendChild(author);
    return card;
  }

  function buildCarousel(testimonials) {
    var totalCards = testimonials.length;

    // Outer container with chevrons
    var outer = document.createElement('div');
    outer.className = 'testimonials-outer';

    // Chevron left
    var chevronLeft = document.createElement('button');
    chevronLeft.className = 'testimonials-chevron testimonials-chevron--left';
    chevronLeft.setAttribute('aria-label', 'Témoignage précédent');
    chevronLeft.textContent = '\u2039';

    // Chevron right
    var chevronRight = document.createElement('button');
    chevronRight.className = 'testimonials-chevron testimonials-chevron--right';
    chevronRight.setAttribute('aria-label', 'Témoignage suivant');
    chevronRight.textContent = '\u203A';

    // Wrapper (overflow hidden)
    var wrapper = document.createElement('div');
    wrapper.className = 'testimonials-wrapper';

    // Track
    var track = document.createElement('div');
    track.className = 'testimonials-track';

    // Build cards: [clones of last N] + [originals] + [clones of first N]
    // Clone enough cards to fill the visible area
    var maxVisible = 3;

    // Clones of last cards (prepended)
    for (var i = totalCards - maxVisible; i < totalCards; i++) {
      var idx = (i + totalCards) % totalCards;
      track.appendChild(createCard(testimonials[idx]));
    }

    // Original cards
    for (var j = 0; j < totalCards; j++) {
      track.appendChild(createCard(testimonials[j]));
    }

    // Clones of first cards (appended)
    for (var k = 0; k < maxVisible; k++) {
      track.appendChild(createCard(testimonials[k % totalCards]));
    }

    wrapper.appendChild(track);
    outer.appendChild(chevronLeft);
    outer.appendChild(wrapper);
    outer.appendChild(chevronRight);
    container.appendChild(outer);

    // State
    var currentIndex = maxVisible; // Start at first real card
    var paused = false;
    var intervalId = null;
    var isTransitioning = false;

    function getCardWidth() {
      var firstCard = track.querySelector('.testimonials-card');
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
        if (!paused) slideNext();
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

    // Pause on hover
    outer.addEventListener('mouseenter', function () { paused = true; });
    outer.addEventListener('mouseleave', function () { paused = false; });

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
