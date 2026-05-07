/**
 * AZERTY Global - Main Application
 * Common functionality across all pages
 */

(function () {
  'use strict';

  // Detect Windows for platform-specific features (e.g. portable app warning)
  if (navigator.userAgent.includes('Windows')) {
    document.documentElement.classList.add('is-windows');
  }

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
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  /**
   * Dropdown keyboard support with arrow navigation
   */
  function initDropdownKeyboard() {
    const dropdown = document.querySelector('.nav__dropdown');
    const toggle = document.querySelector('.nav__dropdown-toggle');
    const menu = dropdown?.querySelector('.nav__dropdown-menu');
    const items = menu ? Array.from(menu.querySelectorAll('.nav__dropdown-item')) : [];

    if (!dropdown || !toggle || !menu || items.length === 0) return;

    menu.setAttribute('role', 'menu');
    items.forEach(item => {
      item.setAttribute('role', 'menuitem');
      item.setAttribute('tabindex', '-1');
    });

    function isOpen() {
      return dropdown.classList.contains('is-open');
    }

    function updateExpandedState(open) {
      dropdown.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      items.forEach(item => {
        item.setAttribute('tabindex', open ? '0' : '-1');
      });
    }

    function focusItem(index) {
      const clampedIndex = (index + items.length) % items.length;
      items[clampedIndex].focus();
    }

    function openMenu(options) {
      const focusTarget = options?.focusTarget || null;
      updateExpandedState(true);

      if (focusTarget === 'first') {
        focusItem(0);
      } else if (focusTarget === 'last') {
        focusItem(items.length - 1);
      }
    }

    function closeMenu(restoreFocus) {
      updateExpandedState(false);
      if (restoreFocus) {
        toggle.focus();
      }
    }

    toggle.addEventListener('click', () => {
      if (isOpen()) {
        closeMenu(false);
      } else {
        openMenu();
      }
    });

    toggle.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        openMenu({ focusTarget: 'first' });
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        openMenu({ focusTarget: 'last' });
        return;
      }

      if ((event.key === 'Enter' || event.key === ' ') && !isOpen()) {
        event.preventDefault();
        openMenu({ focusTarget: 'first' });
      }
    });

    items.forEach((item, index) => {
      item.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          focusItem(index + 1);
          return;
        }

        if (event.key === 'ArrowUp') {
          event.preventDefault();
          focusItem(index - 1);
          return;
        }

        if (event.key === 'Home') {
          event.preventDefault();
          focusItem(0);
          return;
        }

        if (event.key === 'End') {
          event.preventDefault();
          focusItem(items.length - 1);
          return;
        }

        if (event.key === 'Escape') {
          event.preventDefault();
          closeMenu(true);
          return;
        }

        if (event.key === 'Tab') {
          closeMenu(false);
        }
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) {
        closeMenu(true);
      }
    });

    document.addEventListener('click', (event) => {
      if (!dropdown.contains(event.target)) {
        closeMenu(false);
      }
    });
  }

  /**
   * Initialize on DOM ready
   */
  document.addEventListener('DOMContentLoaded', () => {
    initMobileNav();
    initDropdownKeyboard();
    initCopyButtons();
    initSmoothScroll();
    setActiveNavLink();
    initLogoContextMenu();
    initAnalytics();
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
      <a href="presse#kit-presse" class="logo-context-menu__item">
        📦 Kit presse complet
      </a>
    `;
    document.body.appendChild(menu);

    // Show menu on right-click (header logo)
    logo.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      menu.style.left = e.clientX + 'px';
      menu.style.top = e.clientY + 'px';
      menu.classList.add('is-visible');
    });

    // Footer favicon context menu
    const footerLogo = document.querySelector('.footer__logo');
    if (footerLogo) {
      const footerMenu = document.createElement('div');
      footerMenu.className = 'logo-context-menu';
      footerMenu.innerHTML = `
        <a href="assets/favicon-azerty-global.png" download="AZERTY-Global-Favicon.png" class="logo-context-menu__item">
          📥 Télécharger le favicon (PNG)
        </a>
        <a href="presse#kit-presse" class="logo-context-menu__item">
          📦 Kit presse complet
        </a>
      `;
      document.body.appendChild(footerMenu);

      footerLogo.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        footerMenu.style.left = e.clientX + 'px';
        footerMenu.style.top = e.clientY + 'px';
        footerMenu.classList.add('is-visible');
      });

      document.addEventListener('click', () => {
        footerMenu.classList.remove('is-visible');
      });
      document.addEventListener('scroll', () => {
        footerMenu.classList.remove('is-visible');
      }, { passive: true });
    }

    // Hide menu on click anywhere
    document.addEventListener('click', () => {
      menu.classList.remove('is-visible');
    });

    // Hide menu on scroll
    document.addEventListener('scroll', () => {
      menu.classList.remove('is-visible');
    }, { passive: true });
  }

  // ─── Analytics Markers Handler ───
  function initAnalytics() {
    document.querySelectorAll('[data-analytics-event]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const eventName = btn.dataset.analyticsEvent;

        // Dispatch a standard custom event (easy to pick up by Cloudflare Zaraz / GTM)
        const customEvent = new CustomEvent('analytics', {
          detail: { event: eventName }
        });
        window.dispatchEvent(customEvent);
      });
    });
  }

})();
