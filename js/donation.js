// Donation buttons logic (feedback.html)
(function () {
  'use strict';

  let selectedAmount = 10;

  document.querySelectorAll('.donation-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      selectedAmount = parseInt(this.dataset.amount, 10);

      document.querySelectorAll('.donation-btn').forEach(button => {
        button.classList.remove('btn--primary');
        button.classList.add('btn--secondary');
      });

      this.classList.remove('btn--secondary');
      this.classList.add('btn--primary');
      document.getElementById('custom-amount').value = '';
    });
  });

  document.getElementById('custom-amount')?.addEventListener('input', function () {
    if (this.value) {
      selectedAmount = parseInt(this.value, 10);
      document.querySelectorAll('.donation-btn').forEach(button => {
        button.classList.remove('btn--primary');
        button.classList.add('btn--secondary');
      });
    }
  });

  document.getElementById('donate-btn')?.addEventListener('click', function () {
    const url = selectedAmount && selectedAmount > 0
      ? `https://www.paypal.com/paypalme/azertyglobal/${selectedAmount}EUR`
      : 'https://www.paypal.com/paypalme/azertyglobal';

    window.open(url, '_blank');
  });
})();
