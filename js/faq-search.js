// FAQ search + deep link (aide.html, faq.html)
document.addEventListener('DOMContentLoaded', () => {
  // Deep link: open FAQ item from hash
  function openTarget() {
    if (window.location.hash) {
      const id = window.location.hash.substring(1);
      const element = document.getElementById(id);
      if (element && element.tagName === 'DETAILS') {
        element.open = true;
        element.classList.add('faq-item--highlight');
      }
    }
  }

  openTarget();
  window.addEventListener('hashchange', openTarget);

  // FAQ Search
  const searchInput = document.getElementById('faq-search-input');
  const searchClear = document.getElementById('faq-search-clear');
  const searchCount = document.getElementById('faq-search-count');
  const faqItems = document.querySelectorAll('.faq-item');
  const categoryHeadings = document.querySelectorAll('.container--narrow > h2');

  if (!searchInput) return;

  function normalizeText(text) {
    return text.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[œ]/g, 'oe').replace(/[æ]/g, 'ae');
  }

  function searchFAQ(query) {
    const normalizedQuery = normalizeText(query.trim());
    let visibleCount = 0;

    if (!normalizedQuery) {
      faqItems.forEach(item => {
        item.style.display = '';
        const summary = item.querySelector('.faq-question');
        summary.innerHTML = summary.textContent;
      });
      categoryHeadings.forEach(heading => heading.style.display = '');
      searchCount.style.display = 'none';
      searchClear.style.display = 'none';
      return;
    }

    searchClear.style.display = 'block';

    faqItems.forEach(item => {
      const summary = item.querySelector('.faq-question');
      const answer = item.querySelector('.faq-answer');
      const summaryText = summary.textContent;
      const answerText = answer ? answer.textContent : '';

      const normalizedSummary = normalizeText(summaryText);
      const normalizedAnswer = normalizeText(answerText);

      if (normalizedSummary.includes(normalizedQuery) || normalizedAnswer.includes(normalizedQuery)) {
        item.style.display = '';
        visibleCount++;
        item.open = true;
      } else {
        item.style.display = 'none';
      }
    });

    categoryHeadings.forEach(heading => {
      let nextElement = heading.nextElementSibling;
      let hasVisibleItems = false;

      while (nextElement && !nextElement.matches('h2')) {
        if (nextElement.classList.contains('faq-item') && nextElement.style.display !== 'none') {
          hasVisibleItems = true;
          break;
        }
        nextElement = nextElement.nextElementSibling;
      }

      heading.style.display = hasVisibleItems ? '' : 'none';
    });

    searchCount.style.display = 'block';
    if (visibleCount === 0) {
      searchCount.textContent = 'Aucune question trouvée. Essayez d\'autres termes.';
      searchCount.style.color = 'var(--color-warning)';
    } else {
      searchCount.textContent = `${visibleCount} question${visibleCount > 1 ? 's' : ''} trouvée${visibleCount > 1 ? 's' : ''}`;
      searchCount.style.color = 'var(--color-success)';
    }
  }

  searchInput.addEventListener('input', (e) => searchFAQ(e.target.value));

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchFAQ('');
    searchInput.focus();
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      searchFAQ('');
    }
  });
});
