(function () {
  const downloadUrls = {
    'windows-store': 'https://apps.microsoft.com/detail/9n4bts43sssz?hl=fr-FR&gl=FR',
    'windows-msix': 'https://download.azerty.global/AZERTY_Global_1.0.0.msixbundle',
    'windows-exe': 'https://sourceforge.net/projects/azertyglobal/files/AZERTY_Global_Windows.zip/download',
    'macos-zip': 'https://sourceforge.net/projects/azertyglobal/files/AZERTY_Global_macOS.zip/download',
    'linux-zip': 'https://sourceforge.net/projects/azertyglobal/files/AZERTY_Global_Linux.zip/download'
  };

  const channelDefaults = {
    windows: 'store',
    macos: 'zip',
    linux: 'zip'
  };

  const statusLabels = {
    chooser: 'Choisissez votre système pour afficher seulement les étapes utiles.',
    'windows-store': 'Lancez l’application depuis le Microsoft Store, puis suivez les étapes ci-dessous.',
    'windows-msix': 'Le MSIX signé est prêt : ouvrez le fichier, installez l’application, puis activez AZERTY Global.',
    'windows-exe': 'Le ZIP Windows est prêt : extrayez-le, lancez l’installateur, puis redémarrez votre session.',
    'macos-zip': 'Le ZIP macOS est prêt : copiez la disposition dans votre bibliothèque utilisateur.',
    'linux-zip': 'Le ZIP Linux est prêt : lancez le script d’installation, puis redémarrez votre session.'
  };

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

  function normaliseOs(os) {
    return ['windows', 'macos', 'linux'].includes(os) ? os : null;
  }

  function normaliseChannel(os, channel) {
    if (os === 'windows' && ['store', 'msix', 'exe'].includes(channel)) return channel;
    if ((os === 'macos' || os === 'linux') && channel === 'zip') return channel;
    return channelDefaults[os] || 'store';
  }

  function setChooserState(isChooser) {
    const chooser = document.querySelector('[data-merci-chooser]');
    if (chooser) {
      chooser.hidden = !isChooser;
      chooser.setAttribute('aria-hidden', String(!isChooser));
    }

    document.querySelectorAll('[data-merci-variant-section]').forEach(section => {
      section.hidden = isChooser;
      section.setAttribute('aria-hidden', String(isChooser));
    });
  }

  function setOsBlocks(activeOs) {
    document.querySelectorAll('[data-merci-os-block]').forEach(block => {
      const isCurrentOs = block.dataset.merciOsBlock === activeOs;
      block.hidden = !isCurrentOs;
      block.classList.toggle('page-merci__os-block--hidden', !isCurrentOs);
      block.setAttribute('aria-hidden', String(!isCurrentOs));
    });
  }

  function setPanelState(activeKey) {
    const panels = document.querySelectorAll('[data-merci-panel]');
    const activePanel = document.querySelector(`[data-merci-panel="${activeKey}"]`);
    const activeOs = activePanel ? activePanel.dataset.os : 'windows';

    if (activePanel && activePanel.parentElement) {
      activePanel.parentElement.prepend(activePanel);
    }

    panels.forEach(panel => {
      const isCurrentOs = panel.dataset.os === activeOs;
      const isActive = panel.dataset.merciPanel === activeKey;

      panel.hidden = !isCurrentOs;
      panel.classList.toggle('page-merci__channel--hidden', !isCurrentOs);
      panel.classList.toggle('page-merci__channel--active', isActive);
      panel.classList.toggle('page-merci__channel--collapsed', isCurrentOs && !isActive);
      panel.setAttribute('aria-expanded', String(isActive));
      panel.setAttribute('aria-hidden', String(!isCurrentOs));

      if (isActive || !isCurrentOs) {
        panel.removeAttribute('tabindex');
        panel.removeAttribute('role');
      } else {
        panel.setAttribute('tabindex', '0');
        panel.setAttribute('role', 'button');
      }
    });

    setOsBlocks(activeOs);
  }

  function updateManualLink(activeKey) {
    const manualLink = document.getElementById('manual-download-link');
    if (!manualLink) return;

    if (!downloadUrls[activeKey]) {
      manualLink.href = '/download';
      manualLink.textContent = 'Retourner au téléchargement';
      manualLink.removeAttribute('target');
      manualLink.removeAttribute('rel');
      return;
    }

    manualLink.href = downloadUrls[activeKey];
    manualLink.textContent = activeKey === 'windows-store' ? 'Ouvrir le Store' : 'Reprendre le fichier';
    manualLink.target = '_blank';
    manualLink.rel = 'noopener noreferrer';
  }

  function updateStatus(activeKey) {
    const status = document.querySelector('[data-merci-status]');
    if (!status || !statusLabels[activeKey]) return;
    status.textContent = statusLabels[activeKey];
  }

  const params = new URLSearchParams(window.location.search);
  const os = normaliseOs(params.get('os'));
  const isChooser = !os;

  if (isChooser) {
    setChooserState(true);
    updateManualLink('chooser');
    updateStatus('chooser');
  } else {
    const channel = normaliseChannel(os, params.get('channel'));
    const activeKey = `${os}-${channel}`;

    setChooserState(false);
    setPanelState(activeKey);
    updateManualLink(activeKey);
    updateStatus(activeKey);
  }

  document.querySelectorAll('[data-merci-panel]').forEach(panel => {
    const openPanel = () => {
      const panelKey = panel.dataset.merciPanel;
      setPanelState(panelKey);
      updateManualLink(panelKey);
      updateStatus(panelKey);
    };

    panel.addEventListener('click', event => {
      if (!panel.classList.contains('page-merci__channel--collapsed')) return;
      if (event.target.closest('a, button')) return;
      openPanel();
    });

    panel.addEventListener('keydown', event => {
      if (!panel.classList.contains('page-merci__channel--collapsed')) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      openPanel();
    });
  });
})();
