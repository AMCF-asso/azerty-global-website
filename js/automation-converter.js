(function () {
  'use strict';

  const SPECIFICATION_URL = '/docs/automation/v0.1/azerty-global.json';
  const core = window.AzertyAutomationConverterCore;
  const form = document.getElementById('automation-converter');

  if (!core || !form) return;

  const input = document.getElementById('automation-input');
  const submit = document.getElementById('automation-submit');
  const status = document.getElementById('automation-status');
  const results = document.getElementById('automation-results');
  const json = document.getElementById('automation-json');
  const copy = document.getElementById('automation-copy');

  if (!input || !submit || !status || !results || !json || !copy) return;

  form.noValidate = true;

  const french = document.documentElement.lang.toLowerCase().startsWith('fr');
  const messages = french ? {
    initial: 'Saisissez un texte \u00E0 convertir.',
    loading: 'Conversion en cours\u2026',
    success: 'Conversion pr\u00EAte.',
    partial: 'Conversion pr\u00EAte : certains caract\u00E8res ne sont pas pris en charge.',
    empty: 'Saisissez un texte \u00E0 convertir.',
    tooLong: 'Le texte ne doit pas d\u00E9passer 200 points de code.',
    fetchError: 'Le contrat de conversion est indisponible. R\u00E9essayez plus tard.',
    copySuccess: 'JSON copi\u00E9.',
    copyFail: 'Copie automatique impossible : le JSON est s\u00E9lectionn\u00E9 pour une copie manuelle.'
  } : {
    initial: 'Enter text to convert.',
    loading: 'Converting\u2026',
    success: 'Conversion ready.',
    partial: 'Conversion ready: some characters are unsupported.',
    empty: 'Enter text to convert.',
    tooLong: 'Text must not exceed 200 code points.',
    fetchError: 'The conversion contract is unavailable. Please try again later.',
    copySuccess: 'JSON copied.',
    copyFail: 'Automatic copying failed: the JSON is selected for manual copying.'
  };

  let specificationPromise;
  let latestJson = '';

  function setState(state, message) {
    form.dataset.state = state;
    status.dataset.state = state;
    status.textContent = message;
    results.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');
  }

  function resetResults() {
    results.hidden = true;
    json.textContent = '';
    latestJson = '';
    copy.disabled = true;
    const list = results.querySelector('.automation-token-list');
    if (list) list.replaceChildren();
  }

  function readableGlyph(token) {
    if (token.kind === 'control') return token.action;
    if (token.character === ' ') return '\u2420';
    return token.character;
  }

  function formatSequence(token) {
    if (!token.method || !Array.isArray(token.method.steps)) return french ? 'Non pris en charge' : 'Unsupported';

    return token.method.steps.map((step) => {
      const modifiers = Array.isArray(step.modifiers) ? step.modifiers : [];
      return [...modifiers, step.code].filter(Boolean).join('+');
    }).join(' \u2192 ');
  }

  function tokenList() {
    let list = results.querySelector('.automation-token-list');
    if (list) return list;

    list = document.createElement('ol');
    list.className = 'automation-token-list';
    list.setAttribute('aria-label', french ? 'D\u00E9tail des frappes converties' : 'Converted keystroke details');
    const jsonContainer = json.closest('pre') || json;
    results.insertBefore(list, jsonContainer);
    return list;
  }

  function renderTokens(tokens) {
    const list = tokenList();
    list.replaceChildren();

    tokens.forEach((token) => {
      const item = document.createElement('li');
      item.className = `automation-token automation-token--${token.supported ? 'supported' : 'unsupported'}`;

      const position = document.createElement('span');
      position.className = 'automation-token__position';
      position.textContent = `${french ? 'Position' : 'Position'} ${token.index}`;

      const glyph = document.createElement('span');
      glyph.className = 'automation-token__glyph';
      glyph.textContent = readableGlyph(token);
      glyph.setAttribute('aria-label', token.kind === 'control' ? token.action : token.character);

      const point = document.createElement('code');
      point.className = 'automation-token__code-point';
      point.textContent = token.codePoint;

      const sequence = document.createElement('code');
      sequence.className = 'automation-token__sequence';
      sequence.textContent = formatSequence(token);

      const badge = document.createElement('span');
      badge.className = 'automation-token__status';
      badge.textContent = token.supported
        ? (french ? 'Pris en charge' : 'Supported')
        : (french ? 'Non pris en charge' : 'Unsupported');

      item.append(position, glyph, point, sequence, badge);
      list.append(item);
    });
  }

  function loadSpecification() {
    if (!specificationPromise) {
      specificationPromise = fetch(SPECIFICATION_URL, { credentials: 'same-origin' })
        .then((response) => {
          if (!response.ok) throw new Error(`Specification request failed: ${response.status}`);
          return response.json();
        })
        .catch((error) => {
          specificationPromise = null;
          throw error;
        });
    }
    return specificationPromise;
  }

  function trackConversion(output) {
    if (!window.AzertyTrack || typeof window.AzertyTrack.event !== 'function') return;

    const supportedCount = output.tokens.filter((token) => token.supported).length;
    window.AzertyTrack.event('automation_conversion', {
      input_length: core.validateInput(output.input).codePointCount,
      supported_count: supportedCount,
      unsupported_count: output.tokens.length - supportedCount
    });
  }

  function selectJson() {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(json);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const inputSnapshot = input.value;
    const validation = core.validateInput(inputSnapshot);
    if (validation.isEmpty) {
      resetResults();
      setState('empty', messages.empty);
      return;
    }
    if (validation.isTooLong) {
      resetResults();
      setState('too-long', messages.tooLong);
      return;
    }

    submit.disabled = true;
    input.disabled = true;
    resetResults();
    setState('loading', messages.loading);

    try {
      const specification = await loadSpecification();
      const output = core.convert(inputSnapshot, specification);
      const unsupported = output.tokens.some((token) => !token.supported);

      latestJson = JSON.stringify(output, null, 2);
      json.textContent = latestJson;
      renderTokens(output.tokens);
      results.hidden = false;
      copy.disabled = false;
      setState(unsupported ? 'partial' : 'success', unsupported ? messages.partial : messages.success);
      trackConversion(output);
    } catch (error) {
      resetResults();
      setState('fetch-error', messages.fetchError);
    } finally {
      submit.disabled = false;
      input.disabled = false;
    }
  });

  copy.addEventListener('click', async () => {
    if (!latestJson) return;

    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
        throw new Error('Clipboard API unavailable');
      }
      await navigator.clipboard.writeText(latestJson);
      setState('copy-success', messages.copySuccess);
    } catch (error) {
      selectJson();
      setState('copy-fail', messages.copyFail);
    }
  });

  resetResults();
  setState('initial', messages.initial);
}());
