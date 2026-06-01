/**
 * AZERTY Global - Theme
 * Keeps the public site in dark mode while the light theme is paused.
 */

(function() {
  'use strict';

  const THEME_KEY = 'azerty-theme';

  if (navigator.userAgent.includes('Windows')) {
    document.documentElement.classList.add('is-windows');
  }
  
  function getTheme() {
    return 'dark';
  }
  
  /**
   * Set theme and update DOM
   */
  function setTheme(theme) {
    theme = 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    
    // Update toggle button aria-label
    const toggles = document.querySelectorAll('.theme-toggle');
    toggles.forEach(toggle => {
      toggle.setAttribute('aria-label', 
        theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'
      );
    });
  }
  
  function toggleTheme() {
    setTheme('dark');
  }
  
  /**
   * Initialize theme on page load
   */
  function initTheme() {
    // Apply saved theme immediately
    setTheme(getTheme());
    
    // Bind toggle buttons
    document.addEventListener('DOMContentLoaded', () => {
      const toggles = document.querySelectorAll('.theme-toggle');
      toggles.forEach(toggle => {
        toggle.addEventListener('click', toggleTheme);
      });
    });
  }
  
  // Initialize immediately to prevent flash
  initTheme();
  
  // Export for external use
  window.AzertyTheme = {
    getTheme,
    setTheme,
    toggleTheme
  };
})();
