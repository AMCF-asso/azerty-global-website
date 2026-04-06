(function () {
  'use strict';

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
    const formData = buildFormData(form, extraFields);
    const response = await fetch(CONFIG.submitUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json'
      },
      body: formData
    });

    let result = {};

    try {
      result = await response.json();
    } catch (error) {
      result = {};
    }

    if (!response.ok || result.success === false) {
      throw new Error(result.message || 'Erreur serveur');
    }

    return result;
  }

  window.AzertyWeb3Forms = {
    CONFIG,
    buildFormData,
    submitForm
  };
})();
