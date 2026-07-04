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

(function () {
  const thankYouTargets = [
    { id: 'btn-download-msix', url: '/merci?os=windows&channel=msix' },
    { id: 'btn-download-exe', url: '/merci?os=windows&channel=exe' },
    { id: 'btn-download-macos', url: '/merci?os=macos&channel=zip' },
    { id: 'btn-download-linux', url: '/merci?os=linux&channel=zip' }
  ];

  thankYouTargets.forEach(target => {
    const downloadBtn = document.getElementById(target.id);
    if (!downloadBtn) return;

    downloadBtn.addEventListener('click', () => {
      window.setTimeout(() => {
        window.location.href = target.url;
      }, 250);
    });
  });
})();
