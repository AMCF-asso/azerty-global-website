document.querySelectorAll('.os-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.os-tab').forEach(item => {
      item.classList.remove('os-tab--active');
    });

    document.querySelectorAll('.os-content').forEach(content => {
      content.classList.add('d-none');
    });

    tab.classList.add('os-tab--active');
    document.getElementById('os-' + tab.dataset.os).classList.remove('d-none');
  });
});

(function () {
  const downloadBtn = document.getElementById('btn-download-exe');
  if (!downloadBtn) return;

  downloadBtn.addEventListener('click', () => {
    window.setTimeout(() => {
      window.location.href = '/merci?os=windows';
    }, 100);
  });
})();
