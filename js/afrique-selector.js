(function () {
  'use strict';

  var root = document.querySelector('[data-afrique-selector]');
  if (!root) {
    return;
  }

  var countrySelect = root.querySelector('[data-afrique-country]');
  var selectorBody = root.querySelector('[data-afrique-body]');
  var choicesPanel = root.querySelector('[data-afrique-choices]');
  var featuredList = root.querySelector('[data-afrique-featured]');
  var resultPanel = root.querySelector('[data-afrique-result]');
  var status = root.querySelector('[data-afrique-status]');
  var dataUrl = root.getAttribute('data-source') || 'data/afrique-selector.json';
  var state = {
    data: null,
    countryCode: '',
    languageId: ''
  };

  function clear(node) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function createElement(tagName, className, text) {
    var node = document.createElement(tagName);
    if (className) {
      node.className = className;
    }
    if (typeof text === 'string') {
      node.textContent = text;
    }
    return node;
  }

  function getCountry(code) {
    return state.data.countries.find(function (country) {
      return country.code === code;
    });
  }

  function getLanguage(id) {
    return state.data.languages.find(function (language) {
      return language.id === id;
    });
  }

  function languagesForCountry(code) {
    return state.data.languages
      .filter(function (language) {
        return language.countries.indexOf(code) !== -1;
      })
      .sort(function (a, b) {
        return a.name.localeCompare(b.name, 'fr');
      });
  }

  function countryNames(codes) {
    return codes.map(function (code) {
      var country = getCountry(code);
      return country ? country.name : code;
    }).join(', ');
  }

  function displayCharacter(character) {
    if (/[\u0300-\u036f\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]/.test(character)) {
      return '\u25cc' + character;
    }
    return character;
  }

  function uppercaseFor(character) {
    var uppercase = character.toLocaleUpperCase('fr');
    return uppercase !== character ? uppercase : '';
  }

  function lowercaseFor(character) {
    return character.toLocaleLowerCase('fr');
  }

  function alphabeticKeyFor(character) {
    return lowercaseFor(character)
      .normalize('NFD')
      .replace(/[\u0300-\u036f\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]/g, '');
  }

  function compareCharacterItems(a, b) {
    var alphabetic = alphabeticKeyFor(a.char).localeCompare(alphabeticKeyFor(b.char), 'fr', { sensitivity: 'base' });
    if (alphabetic !== 0) {
      return alphabetic;
    }
    return displayCharacter(a.char).localeCompare(displayCharacter(b.char), 'fr');
  }

  function isTraditionalAzertyCharacter(character) {
    var basicTraditional = new Set(['é', 'è', 'ç', 'à', 'ù']);
    var lowercase = lowercaseFor(character);
    if (basicTraditional.has(lowercase)) {
      return true;
    }

    var normalized = character.normalize('NFD');
    var base = normalized.replace(/[\u0300-\u036f]/g, '');
    var hasCircumflexOrDiaeresis = /[\u0302\u0308]/.test(normalized);
    return hasCircumflexOrDiaeresis && /^[a-z]$/i.test(base);
  }

  function charactersForDisplay(characters) {
    var chars = new Set(characters.map(function (item) {
      return item.char;
    }));

    return characters.filter(function (item) {
      var lowercase = lowercaseFor(item.char);
      if (isTraditionalAzertyCharacter(item.char)) {
        return false;
      }
      return lowercase === item.char || !chars.has(lowercase);
    });
  }

  function createCharacterDisplay(character) {
    var node = createElement('span', 'afrique-method__char');
    var lowercase = createElement('span', 'afrique-method__glyph', displayCharacter(character));
    node.appendChild(lowercase);

    var uppercase = uppercaseFor(character);
    if (uppercase) {
      var uppercaseNode = createElement('span', 'afrique-method__glyph afrique-method__glyph--uppercase', displayCharacter(uppercase));
      node.appendChild(uppercaseNode);
    }

    return node;
  }

  function makeKbd(label) {
    return createElement('kbd', '', label);
  }

  function keyLabel(label) {
    var value = String(label || '').trim();
    var aliases = {
      'touche accent aigu': '´',
      'accent aigu': '´',
      'accent grave': '`',
      'touche circonflexe': '^',
      'bracketleft': '^',
      'espace': 'Espace'
    };
    var normalized = normalize(value);
    if (aliases[normalized]) {
      return aliases[normalized];
    }
    if (/^[a-z]$/i.test(value)) {
      return value.toUpperCase();
    }
    return value;
  }

  function appendText(node, text) {
    node.appendChild(document.createTextNode(text));
  }

  function appendShortcut(node, shortcut) {
    var shortcutAliases = {
      'dk_phonetic': 'AltGr + Maj + 0'
    };
    var value = String(shortcut || '').trim();
    var normalized = normalize(value);
    String(shortcutAliases[normalized] || value).split(/\s+\+\s+/).forEach(function (part, index) {
      if (index > 0) {
        appendText(node, ' + ');
      }
      node.appendChild(makeKbd(keyLabel(part)));
    });
  }

  function renderMethod(methodText) {
    var node = createElement('span', 'afrique-method__combo');
    var deadKeyMatch = /^Touche morte ([^(]+) \(([^)]+)\), puis (.+)$/.exec(methodText);
    if (deadKeyMatch) {
      appendShortcut(node, deadKeyMatch[2]);
      appendText(node, ' (' + deadKeyMatch[1].trim() + ') puis ');
      node.appendChild(makeKbd(keyLabel(deadKeyMatch[3])));
      return node;
    }

    var layerMatch = /^(.+), touche (.+)$/.exec(methodText);
    if (layerMatch) {
      appendShortcut(node, layerMatch[1]);
      appendText(node, ' puis ');
      node.appendChild(makeKbd(keyLabel(layerMatch[2])));
      return node;
    }

    node.textContent = methodText;
    return node;
  }

  function methodGroup(methodText) {
    var deadKeyMatch = /^Touche morte ([^(]+) \(/.exec(methodText);
    if (deadKeyMatch) {
      return deadKeyMatch[1].trim();
    }
    if (methodText === 'Accès direct') {
      return 'Accès direct';
    }
    return 'Autres accès';
  }

  function groupTitle(name) {
    if (name === 'Accès direct' || name === 'Autres accès') {
      return name;
    }
    return 'Touche morte ' + name;
  }

  function groupRank(name) {
    var order = [
      'Latin étendu',
      'Crochet',
      'Point souscrit',
      'Macron',
      'Accent aigu',
      'Accent grave',
      'Tilde',
      'Caron',
      'Brève',
      'Point en chef',
      'Cédille',
      'Barre diagonale',
      'Ponctuation',
      'Accès direct',
      'Autres accès'
    ];
    var rank = order.indexOf(name);
    return rank === -1 ? order.length : rank;
  }

  function groupedCharacters(characters) {
    return characters.reduce(function (groups, item) {
      var name = methodGroup(item.method);
      if (!groups.has(name)) {
        groups.set(name, []);
      }
      groups.get(name).push(item);
      return groups;
    }, new Map());
  }

  function sortedGroups(characters) {
    return Array.from(groupedCharacters(characters).entries())
      .map(function (entry) {
        return [entry[0], entry[1].slice().sort(compareCharacterItems)];
      })
      .sort(function (a, b) {
        return groupRank(a[0]) - groupRank(b[0]) || a[0].localeCompare(b[0], 'fr');
      });
  }

  function balancedGroupColumns(groups) {
    return groups.slice()
      .sort(function (a, b) {
        return b[1].length - a[1].length || groupRank(a[0]) - groupRank(b[0]) || a[0].localeCompare(b[0], 'fr');
      })
      .reduce(function (columns, group, index) {
        var target = index === 0 || columns[0].weight <= columns[1].weight ? columns[0] : columns[1];
        target.groups.push(group);
        target.weight += group[1].length;
        return columns;
      }, [
        { groups: [], weight: 0 },
        { groups: [], weight: 0 }
      ]);
  }

  function createMethodGroup(entry) {
    var group = createElement('section', 'afrique-method-group');
    group.appendChild(createElement('h4', 'afrique-method-group__title', groupTitle(entry[0])));

    var rows = createElement('div', 'afrique-method-group__rows');
    entry[1].forEach(function (item) {
      var row = createElement('article', 'afrique-method');
      row.appendChild(createCharacterDisplay(item.char));
      row.appendChild(renderMethod(item.method));
      rows.appendChild(row);
    });
    group.appendChild(rows);
    return group;
  }

  function renderMethodGroups(list, groups, useColumns) {
    if (!useColumns) {
      groups.forEach(function (entry) {
        list.appendChild(createMethodGroup(entry));
      });
      return;
    }

    balancedGroupColumns(groups).forEach(function (column) {
      var columnNode = createElement('div', 'afrique-method-column');
      column.groups.forEach(function (entry) {
        columnNode.appendChild(createMethodGroup(entry));
      });
      list.appendChild(columnNode);
    });
  }

  function setStatus(message) {
    if (status) {
      status.textContent = message;
    }
  }

  function renderInitialResult(message) {
    clear(resultPanel);
    resultPanel.hidden = false;
    var box = createElement('div', 'afrique-result__empty');
    box.appendChild(createElement('p', '', message));
    resultPanel.appendChild(box);
  }

  function renderCountryOptions() {
    state.data.countries
      .slice()
      .sort(function (a, b) {
        return a.name.localeCompare(b.name, 'fr');
      })
      .forEach(function (country) {
      var option = document.createElement('option');
      option.value = country.code;
      option.textContent = country.name;
      countrySelect.appendChild(option);
    });
  }

  function makeLanguageButton(language, variant) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = variant === 'featured'
      ? 'afrique-language-chip'
      : 'afrique-language-row';
    button.textContent = language.name;
    button.setAttribute('data-language-id', language.id);
    if (language.id === state.languageId) {
      button.classList.add('is-selected');
      button.setAttribute('aria-current', 'true');
    }
    return button;
  }

  function renderFeaturedLanguages(country) {
    clear(featuredList);
    var title = createElement('p', 'afrique-tool__label', 'Langues du pays');
    featuredList.appendChild(title);

    var chips = createElement('div', 'afrique-language-chips');
    var featuredIds = country.featuredLanguages || [];
    var featuredLanguages = featuredIds.map(getLanguage).filter(Boolean);
    var otherLanguages = languagesForCountry(country.code).filter(function (language) {
      return featuredIds.indexOf(language.id) === -1;
    });

    featuredLanguages.concat(otherLanguages).forEach(function (language) {
      chips.appendChild(makeLanguageButton(language, 'featured'));
    });
    featuredList.appendChild(chips);
  }

  function renderLanguage(language) {
    state.languageId = language.id;
    clear(resultPanel);
    resultPanel.hidden = false;
    resultPanel.classList.remove('afrique-selector__result--columns');

    var header = createElement('div', 'afrique-result__header');
    var title = createElement('h3', 'afrique-result__title', language.name);
    var meta = createElement('p', 'afrique-result__meta', countryNames(language.countries));
    header.appendChild(title);
    header.appendChild(meta);
    resultPanel.appendChild(header);

    var displayItems = charactersForDisplay(language.characters);
    if (!displayItems.length) {
      resultPanel.appendChild(createElement(
        'p',
        'afrique-result__empty',
        'Cette langue utilise ici l’alphabet latin courant : aucune combinaison spéciale n’est nécessaire dans ce référentiel.'
      ));
    } else {
      var list = createElement('div', 'afrique-method-list');
      var groups = sortedGroups(displayItems);
      var useColumns = displayItems.length > 6 && groups.length > 1;
      if (useColumns) {
        list.classList.add('afrique-method-list--columns');
        resultPanel.classList.add('afrique-selector__result--columns');
      }
      renderMethodGroups(list, groups, useColumns);
      resultPanel.appendChild(list);
    }

    root.querySelectorAll('[data-language-id]').forEach(function (button) {
      var isSelected = button.getAttribute('data-language-id') === language.id;
      button.classList.toggle('is-selected', isSelected);
      if (isSelected) {
        button.setAttribute('aria-current', 'true');
      } else {
        button.removeAttribute('aria-current');
      }
    });

    setStatus(language.name + ' sélectionné.');
  }

  function selectLanguage(languageId) {
    var language = getLanguage(languageId);
    if (language) {
      renderLanguage(language);
    }
  }

  function selectCountry(code) {
    state.countryCode = code;
    state.languageId = '';
    clear(featuredList);
    clear(resultPanel);
    resultPanel.hidden = true;
    resultPanel.classList.remove('afrique-selector__result--columns');

    if (!code) {
      selectorBody.hidden = true;
      choicesPanel.hidden = true;
      setStatus('Aucun pays sélectionné.');
      return;
    }

    var country = getCountry(code);
    selectorBody.hidden = false;
    choicesPanel.hidden = false;
    renderFeaturedLanguages(country);
    setStatus(country.name + ' sélectionné.');
  }

  featuredList.addEventListener('click', function (event) {
    var button = event.target.closest('[data-language-id]');
    if (button) {
      selectLanguage(button.getAttribute('data-language-id'));
    }
  });

  countrySelect.addEventListener('change', function () {
    selectCountry(countrySelect.value);
  });

  fetch(dataUrl)
    .then(function (response) {
      if (!response.ok) {
        throw new Error('Chargement impossible');
      }
      return response.json();
    })
    .then(function (data) {
      state.data = data;
      renderCountryOptions();
      selectCountry('');
    })
    .catch(function () {
      countrySelect.disabled = true;
      renderInitialResult('Le sélecteur n’a pas pu charger les données des langues.');
      setStatus('Chargement impossible.');
    });
}());
