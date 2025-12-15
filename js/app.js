/**
 * AZERTY Global - Main Application
 * Common functionality across all pages
 */

(function () {
  /**
   * Mobile navigation toggle
   */
  function initMobileNav() {
    const toggle = document.querySelector('.nav__toggle');
    const nav = document.querySelector('.nav');

    if (toggle && nav) {
      toggle.addEventListener('click', () => {
        nav.classList.toggle('nav--open');
        const isOpen = nav.classList.contains('nav--open');
        toggle.setAttribute('aria-expanded', isOpen);
        toggle.innerHTML = isOpen ? '✕' : '☰';
      });

      // Close on outside click
      document.addEventListener('click', (e) => {
        if (!nav.contains(e.target) && !toggle.contains(e.target)) {
          nav.classList.remove('nav--open');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.innerHTML = '☰';
        }
      });
    }
  }

  /**
   * Copy to clipboard utility
   */
  async function copyToClipboard(text, button) {
    try {
      await navigator.clipboard.writeText(text);
      const originalText = button.textContent;
      button.textContent = 'Copié !';
      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  /**
   * Init copy buttons
   */
  function initCopyButtons() {
    document.querySelectorAll('[data-copy]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = document.querySelector(btn.dataset.copy);
        if (target) {
          copyToClipboard(target.textContent, btn);
        }
      });
    });
  }

  /**
   * Smooth scroll for anchor links
   */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const targetId = anchor.getAttribute('href');
        if (targetId === '#') return;

        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  /**
   * Set active nav link based on current page
   */
  function setActiveNavLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav__link').forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPage || (currentPage === '' && href === 'index.html')) {
        link.classList.add('nav__link--active');
      }
    });
  }

  /**
   * Initialize on DOM ready
   */
  document.addEventListener('DOMContentLoaded', () => {
    initMobileNav();
    initCopyButtons();
    initSmoothScroll();
    setActiveNavLink();
  });

  // Export utilities
  window.AzertyApp = {
    copyToClipboard
  };

  // ─── Logo Context Menu ───
  function initLogoContextMenu() {
    const logo = document.querySelector('.header__logo');
    if (!logo) return;

    // Create context menu
    const menu = document.createElement('div');
    menu.className = 'logo-context-menu';
    menu.innerHTML = `
      <a href="assets/logo-azerty-global.png" download="AZERTY-Global-Logo.png" class="logo-context-menu__item">
        📥 Télécharger le logo (PNG)
      </a>
      <a href="presse.html" class="logo-context-menu__item">
        📦 Kit presse complet
      </a>
    `;
    document.body.appendChild(menu);

    // Show menu on right-click
    logo.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      menu.style.left = e.pageX + 'px';
      menu.style.top = e.pageY + 'px';
      menu.classList.add('is-visible');
    });

    // Hide menu on click anywhere
    document.addEventListener('click', () => {
      menu.classList.remove('is-visible');
    });

    // Hide menu on scroll
    document.addEventListener('scroll', () => {
      menu.classList.remove('is-visible');
    });
  }

  // ─── Analytics Markers Handler ───
  function initAnalytics() {
    document.querySelectorAll('[data-analytics-event]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const eventName = btn.dataset.analyticsEvent;

        // 1. Log for debugging
        console.log('[Analytics] Event triggered:', eventName);

        // 2. Dispatch a standard custom event (easy to pick up by Cloudflare Zaraz / GTM)
        const customEvent = new CustomEvent('analytics', {
          detail: { event: eventName }
        });
        window.dispatchEvent(customEvent);
      });
    });
  }

  // Init on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    initLogoContextMenu();
    initAnalytics();
  });
})();
