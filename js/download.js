function setActiveOs(os) {
  const tab = document.querySelector(`.os-tab[data-os="${os}"]`);
  const content = document.getElementById('os-' + os);
  if (!tab || !content) return;

  document.querySelectorAll('.os-tab').forEach(item => {
    item.classList.remove('os-tab--active');
    item.setAttribute('aria-selected', 'false');
    item.setAttribute('tabindex', '-1');
  });

  document.querySelectorAll('.os-content').forEach(item => {
    item.classList.add('d-none');
    item.setAttribute('hidden', '');
  });

  tab.classList.add('os-tab--active');
  tab.setAttribute('aria-selected', 'true');
  tab.setAttribute('tabindex', '0');
  content.classList.remove('d-none');
  content.removeAttribute('hidden');
}

function detectPreferredOs() {
  const ua = navigator.userAgent;
  const platform = navigator.platform || '';
  const isIpadOs = platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  const isIos = /iPad|iPhone|iPod/.test(ua) || isIpadOs;

  if (isIos || /Macintosh|Mac OS X/.test(ua)) return 'macos';
  if (/Windows/.test(ua)) return 'windows';
  if (/Linux/.test(ua) && !/Android/.test(ua)) return 'linux';
  return 'windows';
}

document.querySelectorAll('.os-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    setActiveOs(tab.dataset.os);
  });

  tab.addEventListener('keydown', event => {
    const tabs = Array.from(document.querySelectorAll('.os-tab'));
    const currentIndex = tabs.indexOf(tab);
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    tabs[nextIndex].focus();
    setActiveOs(tabs[nextIndex].dataset.os);
  });
});

setActiveOs(detectPreferredOs());

/* Après un téléchargement réel, la page suivante est la prise en main.
   Elle visait /merci et son sélecteur d'OS ; /merci est absorbée par /guide
   depuis le 2026-08-30 (contrat du 2026-08-29 §2.1), dont la section
   « Installer et vérifier » porte les cinq canaux. Les paramètres os/channel
   partaient avec le sélecteur : plus rien ne les lit. */
(function () {
  const boutonsSuiviGuide = [
    'btn-download-msix',
    'btn-download-exe',
    'btn-download-macos',
    'btn-download-linux'
  ];

  boutonsSuiviGuide.forEach(id => {
    const downloadBtn = document.getElementById(id);
    if (!downloadBtn) return;

    downloadBtn.addEventListener('click', () => {
      window.setTimeout(() => {
        window.location.href = '/guide?cid=website_download#installer';
      }, 250);
    });
  });
})();

if (window.AzertyTrack && typeof window.AzertyTrack.event === 'function') {
  window.AzertyTrack.event('download_entry_view');
}

// Choix de canal alternatif : le panneau ne s'ouvre qu'au clic sur sa carte.
(function () {
  const choices = Array.from(document.querySelectorAll('[data-channel-choice]'));
  const panels = Array.from(document.querySelectorAll('[data-channel-panel]'));
  if (choices.length === 0 || panels.length === 0) return;

  panels.forEach(panel => panel.setAttribute('hidden', ''));

  function select(id, scroll) {
    choices.forEach(choice => {
      const active = id !== null && choice.dataset.channelChoice === id;
      choice.classList.toggle('download-channel-choice--active', active);
      choice.setAttribute('aria-expanded', active ? 'true' : 'false');
    });
    panels.forEach(panel => {
      if (id !== null && panel.dataset.channelPanel === id) {
        panel.removeAttribute('hidden');
        if (scroll) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        panel.setAttribute('hidden', '');
      }
    });
  }

  choices.forEach(choice => {
    choice.addEventListener('click', () => {
      const isActive = choice.classList.contains('download-channel-choice--active');
      select(isActive ? null : choice.dataset.channelChoice, !isActive);
    });
  });

  if (window.location.hash === '#smartscreen-details') {
    setActiveOs('windows');
    select('exe', false);
    const target = document.getElementById('smartscreen-details');
    if (target) target.scrollIntoView();
  }
})();
