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

    // Vérification anti-spam (js/v2/captcha.js, S-02 du 2026-10-05) : même
    // clé d'accès Web3Forms que les formulaires v2, donc même obligation une
    // fois hCaptcha activé dans le tableau de bord.
    var captcha = null;
    if (window.AGCaptcha) {
      var zone = document.createElement('div');
      zone.className = 'waitlist-captcha';
      zone.tabIndex = -1;
      zone.setAttribute('role', 'group');
      zone.setAttribute('aria-label', 'Vérification anti-spam');
      var row = form.querySelector('.waitlist-row');
      if (row) row.parentNode.insertBefore(zone, row.nextSibling);
      else form.insertBefore(zone, status);
      captcha = window.AGCaptcha.brancher(form, zone);
      if (!captcha) zone.parentNode.removeChild(zone);
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

      // hCaptcha indisponible (réseau, bloqueur) : l'envoi part, Web3Forms
      // tranche, et web3forms.js affiche le repli mailto en cas de refus.
      if (captcha && captcha.etat() === 'chargement') {
        say('La vérification anti-spam se charge. Réessayez dans un instant.');
        return;
      }
      if (captcha && captcha.etat() === 'pret' && !captcha.reponse()) {
        say('Cochez la case de vérification pour recevoir le lien.');
        captcha.zone.focus();
        return;
      }

      button.disabled = true;
      try {
        await window.AzertyWeb3Forms.submitForm(form, {
          from_page: location.pathname + location.search,
          referrer: (document.referrer || '').slice(0, 200),
          'h-captcha-response': captcha ? captcha.reponse() : ''
        });
        form.dataset.state = 'sent';
        say('C’est noté. Vous recevrez le lien d’installation par e-mail.');
        status.focus();
      } catch (error) {
        say('L’envoi n’a pas abouti.');
        if (captcha) captcha.reinitialiser();
      } finally {
        button.disabled = false;
      }
    });
  });
})();
