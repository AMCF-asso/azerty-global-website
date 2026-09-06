(function () {
  'use strict';

  // Formulaire « Recevoir le lien » (src/_includes/waitlist-form.njk).
  // Transport : window.AzertyWeb3Forms (js/web3forms.js), qui affiche lui-même
  // le repli mailto sous le formulaire quand l’envoi échoue.
  var forms = document.querySelectorAll('form[data-waitlist]');
  if (!forms.length || !window.AzertyWeb3Forms) return;

  forms.forEach(function (form) {
    var input = form.querySelector('input[type="email"]');
    var button = form.querySelector('button[type="submit"]');
    var status = form.querySelector('.waitlist-status');
    if (!input || !button || !status) return;

    function say(text) {
      status.textContent = text;
      status.hidden = false;
    }

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      status.hidden = true;
      status.textContent = '';

      var value = (input.value || '').trim();
      if (!value || !input.checkValidity()) {
        say('Indiquez une adresse e-mail valide.');
        input.focus();
        return;
      }

      button.disabled = true;
      try {
        await window.AzertyWeb3Forms.submitForm(form, {
          from_page: location.pathname + location.search,
          referrer: (document.referrer || '').slice(0, 200)
        });
        form.dataset.state = 'sent';
        say('C’est noté. Vous recevrez le lien d’installation par e-mail.');
        status.focus();
      } catch (error) {
        say('L’envoi n’a pas abouti.');
      } finally {
        button.disabled = false;
      }
    });
  });
})();
