function setActiveOs(os) {
  const tab = document.querySelector(`.os-tab[data-os="${os}"]`);
  const content = document.getElementById('os-' + os);
  if (!tab || !content) return;

  document.querySelectorAll('.os-tab').forEach(item => {
    item.classList.remove('os-tab--active');
  });

  document.querySelectorAll('.os-content').forEach(item => {
    item.classList.add('d-none');
  });

  tab.classList.add('os-tab--active');
  content.classList.remove('d-none');
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
});

setActiveOs(detectPreferredOs());

(function () {
  const downloadBtn = document.getElementById('btn-download-exe');
  if (!downloadBtn) return;

  downloadBtn.addEventListener('click', () => {
    window.setTimeout(() => {
      window.location.href = '/merci?os=windows';
    }, 100);
  });
})();
