(function () {
  'use strict';

  // Langue pilotée par la page (base-en.njk pose <html lang="en">), pattern t(fr, en).
  var isEnglish = /^en/i.test(document.documentElement.lang || 'fr');
  function t(fr, en) { return isEnglish ? en : fr; }

  // Web3Forms access keys are public identifiers intended for client-side forms.
  const CONFIG = {
    accessKey: 'a4d82407-9cc8-4242-b491-ebd1e736a4fc',
    submitUrl: 'https://api.web3forms.com/submit'
  };

  function appendValue(formData, key, value) {
    if (value === undefined || value === null || value === '') return;

    if (Array.isArray(value)) {
      value.forEach(item => appendValue(formData, key, item));
      return;
    }

    formData.append(key, value);
  }

  function buildFormData(form, extraFields) {
    const formData = new FormData(form);

    formData.delete('access_key');
    formData.append('access_key', CONFIG.accessKey);

    Object.entries(extraFields || {}).forEach(([key, value]) => {
      formData.delete(key);
      appendValue(formData, key, value);
    });

    return formData;
  }

  async function submitForm(form, extraFields) {
    form.querySelector('[data-form-send-error]')?.remove();
    try {
      const formData = buildFormData(form, extraFields);
      const response = await fetch(CONFIG.submitUrl, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData
      });
      const result = await response.json();
      if (!response.ok || result.success !== true) {
        throw new Error(t('Erreur serveur', 'Server error'));
      }
      return result;
    } catch (error) {
      const address = form.dataset.fallbackEmail || 'contact@azerty.global';
      const message = document.createElement('p');
      message.dataset.formSendError = '';
      message.className = 'mt-3';
      message.setAttribute('role', 'alert');
      message.textContent = t('L’envoi a échoué. Vous pouvez écrire directement à ', 'Sending failed. You can email us directly at ');
      const link = document.createElement('a');
      link.href = 'mailto:' + address;
      link.textContent = address;
      message.append(link, '.');
      const fallback = form.querySelector('.form-email-fallback');
      if (fallback) fallback.after(message);
      else form.append(message);
      throw error;
    }
  }

  window.AzertyWeb3Forms = {
    CONFIG,
    buildFormData,
    submitForm
  };
})();
