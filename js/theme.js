/**
 * AZERTY Global - Theme Toggle
 * Handles dark/light mode switching
 */

(function() {
  const THEME_KEY = 'azerty-theme';
  
  /**
   * Get current theme from localStorage or default to light
   */
  function getTheme() {
    return localStorage.getItem(THEME_KEY) || 'light';
  }
  
  /**
   * Set theme and update DOM
   */
  function setTheme(theme) {
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
  
  /**
   * Toggle between light and dark
   */
  function toggleTheme() {
    const current = getTheme();
    setTheme(current === 'dark' ? 'light' : 'dark');
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
