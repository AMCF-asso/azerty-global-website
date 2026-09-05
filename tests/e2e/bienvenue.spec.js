const fs = require('fs');
const path = require('path');
const { test, expect } = require('../helpers/local-site');

const siteRoot = process.env.TEST_SITE_ROOT || 'dist';
const welcome = JSON.parse(fs.readFileSync(path.resolve(siteRoot, 'tester/welcome.json'), 'utf8'));
const lessons = JSON.parse(fs.readFileSync(path.resolve(siteRoot, 'tester/lessons.json'), 'utf8'));
const characterIndex = JSON.parse(fs.readFileSync(path.resolve(siteRoot, 'tester/character-index.json'), 'utf8')).characters;

// Drive physical key codes through the production engine, never expected text.
// The ISO key is native via CDP in Chromium and an explicit DOM-event fixture in
// Firefox/WebKit because Playwright's portable US key map does not include it.
function physicalTyper(page, platform = 'windows', caps = false) {
  let cdp;
  const browserName = page.context().browser().browserType().name();
  const physicalCode = (code) => {
    if (platform !== 'mac') return code;
    if (code === 'Backquote') return 'IntlBackslash';
    if (code === 'IntlBackslash') return 'Backquote';
    return code === 'AltRight' ? 'AltLeft' : code;
  };
  const choose = (methods) => {
    const compatible = methods.filter((method) => Boolean(method.layer?.includes('Caps')) === caps);
    const candidates = compatible.length ? compatible : methods;
    return candidates.find((method) => method.recommended) || candidates[0];
  };
  async function pressMethod(method) {
    if (!method) throw new Error('No indexed character method');
    const requiredCaps = Boolean(method.layer?.includes('Caps'));
    if (requiredCaps !== caps) {
      caps = requiredCaps;
      await page.evaluate((value) => { window.__welcomePhysicalCaps = value; }, caps);
      await page.keyboard.press('CapsLock');
    }
    const shift = method.layer?.includes('Shift');
    const altgr = method.layer?.includes('AltGr');
    if (shift) await page.keyboard.down('ShiftLeft');
    // Chromium's CDP does not synthesize AltGraph for AltRight by itself.
    // Windows reports its physical AltGr as Ctrl+Alt, which the shared helper accepts.
    if (altgr && platform !== 'mac') await page.keyboard.down('ControlLeft');
    if (altgr) await page.keyboard.down(platform === 'mac' ? 'AltLeft' : 'AltRight');
    const code = physicalCode(method.key);
    if (code === 'IntlBackslash' && browserName === 'chromium') {
      // Playwright's US key list omits the ISO key. Send its physical scan/code
      // through Chromium's input protocol, still exercising real DOM key events.
      cdp ||= await page.context().newCDPSession(page);
      const modifiers = (shift ? 8 : 0) | (altgr ? 1 : 0) | (altgr && platform !== 'mac' ? 2 : 0);
      const key = { code, key: '<', windowsVirtualKeyCode: 226, nativeVirtualKeyCode: 226, modifiers };
      await cdp.send('Input.dispatchKeyEvent', { ...key, type: 'rawKeyDown' });
      await cdp.send('Input.dispatchKeyEvent', { ...key, type: 'keyUp' });
    } else if (code === 'IntlBackslash') {
      // Explicit ISO-key fixture, not a claim of native hardware input on these
      // engines. Exercise the same keydown/keyup listeners and production map.
      await page.evaluate(({ shift, altgr, platform, caps }) => {
        const input = document.getElementById('welcome-input');
        for (const type of ['keydown', 'keyup']) {
          const event = new KeyboardEvent(type, {
            code: 'IntlBackslash', key: '<', keyCode: 226, which: 226,
            shiftKey: Boolean(shift), altKey: Boolean(altgr),
            ctrlKey: Boolean(altgr && platform !== 'mac'),
            bubbles: true, cancelable: true, composed: true
          });
          const nativeState = event.getModifierState.bind(event);
          Object.defineProperty(event, 'getModifierState', {
            value: modifier => modifier === 'CapsLock' ? caps : nativeState(modifier)
          });
          input.dispatchEvent(event);
        }
      }, { shift, altgr, platform, caps });
    } else await page.keyboard.press(code);
    if (altgr) await page.keyboard.up(platform === 'mac' ? 'AltLeft' : 'AltRight');
    if (altgr && platform !== 'mac') await page.keyboard.up('ControlLeft');
    if (shift) await page.keyboard.up('ShiftLeft');
  }
  return {
    method(char) { return choose(characterIndex[char].methods); },
    async setCaps(value) {
      if (value === caps) return;
      caps = value;
      await page.evaluate((state) => { window.__welcomePhysicalCaps = state; }, caps);
      await page.keyboard.press('CapsLock');
    },
    pressMethod,
    async type(text) {
      for (const char of text) {
        const method = choose(characterIndex[char]?.methods || []);
        if (!method) throw new Error(`No method for ${char}`);
        if (method.type === 'deadkey') {
          const deadkey = method.deadkey || method.deadKey;
          await pressMethod(choose(characterIndex[deadkey.replace('dk_', 'dk:')].methods));
        }
        await pressMethod(method);
      }
    }
  };
}

async function startTrial(page, platform = 'windows', initialCaps = false) {
  // CDP sends real key codes, but does not toggle the operating system's lock
  // LEDs. Supply that hardware state independently; all characters still travel
  // through real keydown/keyup events and the production layout engine.
  await page.addInitScript((value) => {
    window.__welcomePhysicalCaps = value;
    const reportPhysicalCaps = (event) => {
      if (!event.isTrusted || typeof event.getModifierState !== 'function') return;
      const nativeState = event.getModifierState.bind(event);
      Object.defineProperty(event, 'getModifierState', {
        value: (modifier) => modifier === 'CapsLock' ? window.__welcomePhysicalCaps : nativeState(modifier)
      });
    };
    document.addEventListener('keydown', reportPhysicalCaps, true);
    document.addEventListener('keyup', reportPhysicalCaps, true);
    document.addEventListener('click', reportPhysicalCaps, true);
  }, initialCaps);
  await page.goto('/bienvenue');
  await expect(page.locator('#welcome-trial')).toBeHidden();
  await page.locator('#welcome-start').click();
  await expect(page.locator('#welcome-target')).toHaveText(welcome.intro[0].content);
  await page.locator('#welcome-platform').selectOption(platform);
  await page.locator('#welcome-input').focus();
  return physicalTyper(page, platform, initialCaps);
}

async function dispatchPhysicalState(locator, code, caps, { repeat = false } = {}) {
  await locator.evaluate((target, args) => {
    for (const type of ['keydown', 'keyup']) {
      const event = new KeyboardEvent(type, { code: args.code, key: args.code, bubbles: true, cancelable: true, repeat: args.repeat });
      Object.defineProperty(event, 'getModifierState', { value: (modifier) => modifier === 'CapsLock' && args.caps });
      target.dispatchEvent(event);
    }
  }, { code, caps, repeat });
}

async function finishIntro(page, typer) {
  for (const exercise of welcome.intro) {
    await typer.setCaps(exercise.capsRequired);
    await typer.type(exercise.content);
    await expect(page.locator('#welcome-input')).toHaveText(exercise.content);
    await expect(page.locator('#welcome-continue')).toBeVisible();
    await page.locator('#welcome-continue').click();
  }
  await expect(page.locator('#welcome-themes')).toBeVisible();
}

test('départ volontaire, trois vrais gestes et choix de thèmes sans démarrage automatique', async ({ page, network }) => {
  const typer = await startTrial(page);
  await expect(page.locator('#welcome-help')).toBeVisible();
  await expect(page.locator('#welcome-trial a[href="/download"]').first()).toBeVisible();
  await expect(page.locator('#welcome-caps')).toHaveAttribute('data-active', 'false');
  await page.keyboard.press('KeyQ');
  await expect(page.locator('#welcome-input')).toHaveText('');
  await expect(page.locator('#welcome-hint')).toHaveText(welcome.ui.capsEnable);
  await typer.setCaps(true);
  await expect(page.locator('#welcome-hint')).not.toHaveText(welcome.ui.capsEnable);
  await typer.type(welcome.intro[0].content);
  await expect(page.locator('#welcome-input')).toHaveText('ÇA GÈLE DÉJÀ ?');
  await expect(page.locator('#welcome-caps')).toHaveAttribute('data-active', 'true');
  await expect(page.locator('#welcome-continue')).toBeFocused();
  await expect(page.locator('#welcome-target')).toHaveText(welcome.intro[0].content);
  await page.locator('#welcome-continue').click();
  await expect(page.locator('#welcome-caps')).toHaveAttribute('data-active', 'true');
  await page.keyboard.press('KeyT');
  await expect(page.locator('#welcome-input')).toHaveText('');
  await expect(page.locator('#welcome-hint')).toHaveText(welcome.ui.capsDisable);
  await typer.setCaps(false);
  await typer.type('test@example.com');
  await expect(page.locator('#welcome-input')).toHaveText('test@example.com');
  await page.locator('#welcome-continue').click();
  await typer.type('.fr .com .org .net');
  await expect(page.locator('#welcome-input')).toHaveText('.fr .com .org .net');
  await page.locator('#welcome-continue').click();
  await expect(page.locator('#welcome-trial')).toHaveAttribute('data-phase', 'choices');
  await expect(page.locator('#welcome-exercise')).toBeHidden();
  await expect(page.locator('[data-welcome-theme]')).toHaveCount(3);
  await expect(page.locator('#welcome-status')).toHaveText(welcome.ui.introComplete);
  const distinct = new Set(welcome.intro.flatMap((entry) => [...entry.content]).filter((char) => !/\s/u.test(char)));
  await expect(page.locator('#welcome-count')).toHaveAttribute('data-count', String(distinct.size));
  expect(network.web3FormsRequests).toHaveLength(0);
  expect(network.pageErrors).toHaveLength(0);
  expect(network.cspViolations).toHaveLength(0);
});

test('la saisie native et le collage ne valident pas le geste Verr. Maj.', async ({ page }) => {
  await startTrial(page);
  await page.keyboard.insertText('ÇA GÈLE DÉJÀ ?');
  await expect(page.locator('#welcome-input')).toHaveText('');
  await expect(page.locator('#welcome-continue')).toBeHidden();
  await page.locator('#welcome-input').evaluate((element) => {
    const clipboard = new DataTransfer();
    clipboard.setData('text/plain', 'ÇA GÈLE DÉJÀ ?');
    element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: clipboard, bubbles: true, cancelable: true }));
  });
  await expect(page.locator('#welcome-input')).toHaveText('');
  await expect(page.locator('#welcome-continue')).toBeHidden();
});

test('les données et styles du clavier ne chargent qu’après le départ volontaire', async ({ page }) => {
  const deferredAssets = ['/tester/welcome.json', '/tester/azerty-global.json', '/tester/keyboard.css'];
  const requested = [];
  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname;
    if (deferredAssets.includes(pathname)) requested.push(pathname);
  });
  await page.goto('/bienvenue', { waitUntil: 'networkidle' });
  await expect(page.locator('#welcome-trial')).toBeHidden();
  expect(requested).toEqual([]);
  await page.locator('#welcome-start').click();
  await expect(page.locator('#welcome-target')).toHaveText(welcome.intro[0].content);
  expect(new Set(requested)).toEqual(new Set(deferredAssets));
});

for (const platform of ['windows', 'mac', 'linux']) {
  test(`trois thèmes complets, liens résolus par ID et sorties explicites (${platform})`, async ({ page, network }) => {
    test.setTimeout(120000);
    const typer = await startTrial(page, platform);
    await finishIntro(page, typer);
    const moduleIndex = lessons.modules.findIndex((entry) => entry.id === welcome.challenge.moduleId);
    const module = lessons.modules[moduleIndex];
    for (const theme of welcome.challenge.themes) {
      await page.locator(`[data-welcome-theme="${theme.id}"]`).click();
      const lessonIndex = module.lessons.findIndex((entry) => entry.id === theme.lessonId);
      expect(module.lessons[lessonIndex].exercises).toHaveLength(1);
      await expect(page.locator('#welcome-stage')).toHaveText(theme.title);
      await expect(page.locator('#welcome-lesson-link')).toHaveAttribute('href', `/?mode=lessons&module=${moduleIndex}&lesson=${lessonIndex}&tutorial=skip&guidedHints=true`);
      for (const exercise of module.lessons[lessonIndex].exercises) {
        await expect(page.locator('#welcome-target')).toHaveText(exercise.content);
        const formerFragment = {
          francais: '« Ça y est !', voyage: '¡Vamos España!', symboles: '10³ streamers → 20 millions,'
        }[theme.id];
        expect(exercise.content.startsWith(formerFragment)).toBe(true);
        await typer.type(formerFragment);
        await expect(page.locator('#welcome-continue')).toBeHidden();
        await expect(page.locator('#welcome-input')).toHaveText(formerFragment);
        await typer.type(exercise.content.slice(formerFragment.length));
        await expect(page.locator('#welcome-input')).toHaveText(exercise.content);
        await expect(page.locator('#welcome-continue')).toBeVisible();
        await page.locator('#welcome-continue').click();
      }
      await expect(page.locator('#welcome-themes')).toBeVisible();
      await expect(page.locator(`[data-welcome-theme="${theme.id}"]`)).toHaveAttribute('data-complete', 'true');
      await expect(page.locator('#welcome-exercise')).toBeHidden();
    }
    expect(network.pageErrors).toHaveLength(0);
    expect(network.cspViolations).toHaveLength(0);
  });
}

test('aide de touche morte : seule la touche suivante reste après activation', async ({ page }) => {
  const typer = await startTrial(page);
  await finishIntro(page, typer);
  await page.locator('[data-welcome-theme="symboles"]').click();
  await typer.type('10³ streamers ');
  await page.locator('#welcome-help').click();
  const method = typer.method('→');
  const deadkey = method.deadkey || method.deadKey;
  const activation = characterIndex[deadkey.replace('dk_', 'dk:')].methods.find((entry) => entry.recommended)
    || characterIndex[deadkey.replace('dk_', 'dk:')].methods[0];
  await expect(page.locator('#welcome-hint')).toContainText('puis');
  await expect(page.locator(`#welcome-keyboard-container [data-key-id="${activation.key}"]`)).toHaveClass(/welcome-key-dead/);
  await typer.pressMethod(activation);
  await expect(page.locator('#welcome-input')).toHaveText('10³ streamers ');
  await expect(page.locator('#welcome-hint')).not.toContainText('puis');
  await expect(page.locator(`#welcome-keyboard-container [data-key-id="${method.key}"]`)).toHaveClass(/welcome-key-next/);
  await expect(page.locator('.welcome-key-dead')).toHaveCount(0);
  await typer.pressMethod(method);
  await expect(page.locator('#welcome-input')).toHaveText('10³ streamers →');
  await page.keyboard.press('Escape');
  await expect(page.locator('#welcome-trial')).toBeHidden();
  await expect(page.locator('#welcome-start')).toBeFocused();
});

test('macOS modifie les instructions, Option et le vrai remappage de @', async ({ page }) => {
  const typer = await startTrial(page, 'mac');
  await typer.setCaps(true);
  await typer.type(welcome.intro[0].content);
  await page.locator('#welcome-continue').click();
  await expect(page.locator('#welcome-instruction')).toHaveText(welcome.intro[1].instructionMac);
  await typer.setCaps(false);
  await typer.type('test');
  await typer.type('@');
  await expect(page.locator('#welcome-input')).toHaveText('test@');
  await typer.type('example.com');
  await expect(page.locator('#welcome-status')).toHaveText(welcome.intro[1].successMac);
  await page.keyboard.press('Escape');
  await page.locator('#welcome-start').click();
  await expect(page.locator('#welcome-input')).toBeFocused();
});

test('375 px : texte lisible, clavier visuel actif et sortie au clavier', async ({ page, network }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await startTrial(page);
  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflows).toBe(false);
  await expect(page.locator('#welcome-input')).toHaveAttribute('inputmode', 'none');
  await page.locator('#welcome-keyboard-container [data-key-id="CapsLock"]').click();
  await page.locator('#welcome-keyboard-container [data-key-id="Digit9"]').click();
  await expect(page.locator('#welcome-input')).toHaveText('Ç');
  await page.locator('#welcome-keyboard-container [data-key-id="KeyQ"]').click();
  await expect(page.locator('#welcome-input')).toHaveText('ÇA');
  await page.locator('#welcome-help').click();
  await expect(page.locator('#welcome-hint')).toContainText('Espace');
  await page.keyboard.press('Tab');
  await expect(page.locator('#welcome-help')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#welcome-trial')).toBeHidden();
  await expect(page.locator('#welcome-start')).toBeFocused();
  expect(network.pageErrors).toHaveLength(0);
  expect(network.cspViolations).toHaveLength(0);
});

test('échec de chargement : erreur visible et téléchargement toujours disponible', async ({ page }) => {
  await page.route('**/tester/welcome.json', (route) => route.fulfill({ status: 503, body: 'Unavailable' }));
  await page.goto('/bienvenue');
  await page.locator('#welcome-start').click();
  await expect(page.locator('#welcome-error')).toBeVisible();
  await expect(page.locator('#welcome-trial a[href="/download"]').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#welcome-trial')).toBeHidden();
  await expect(page.locator('#welcome-start')).toBeFocused();
});

test('échec du module différé : Échap ferme l’erreur et le téléchargement reste joignable', async ({ page }) => {
  await page.route('**/js/bienvenue-trial.js?*', (route) => route.abort('failed'));
  await page.goto('/bienvenue');
  await page.locator('#welcome-start').click();
  await expect(page.locator('#welcome-error')).toBeVisible();
  await expect(page.locator('#welcome-trial a[href="/download"]').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#welcome-trial')).toBeHidden();
  await expect(page.locator('#welcome-start')).toBeFocused();
});

test('Verr. Maj. suit aussi un changement lorsque Continuer a le focus', async ({ page }) => {
  const typer = await startTrial(page);
  await typer.setCaps(true);
  await typer.type(welcome.intro[0].content);
  await expect(page.locator('#welcome-continue')).toBeFocused();
  await typer.setCaps(false);
  await expect(page.locator('#welcome-caps')).toHaveAttribute('data-active', 'false');
  await page.locator('#welcome-continue').click();
  await typer.type('test@example.com');
  await expect(page.locator('#welcome-input')).toHaveText('test@example.com');
  await expect(page.locator('#welcome-continue')).toBeVisible();
});

test('Caps déjà actif avant ouverture : une extinction réelle ne produit pas de majuscules', async ({ page }) => {
  const typer = await startTrial(page, 'windows', true);
  await expect(page.locator('#welcome-caps')).toHaveAttribute('data-active', 'true');
  await typer.setCaps(false);
  await page.keyboard.press('Digit9');
  await expect(page.locator('#welcome-caps')).toHaveAttribute('data-active', 'false');
  await expect(page.locator('#welcome-input')).toHaveText('');
  await expect(page.locator('#welcome-continue')).toBeHidden();
  await typer.setCaps(true);
  await typer.type(welcome.intro[0].content);
  await expect(page.locator('#welcome-input')).toHaveText(welcome.intro[0].content);
});

test('un événement Caps périmé Linux est réconcilié avant toute insertion', async ({ page }) => {
  await startTrial(page, 'linux');
  const input = page.locator('#welcome-input');
  await dispatchPhysicalState(input, 'CapsLock', true);
  await expect(page.locator('#welcome-caps')).toHaveAttribute('data-active', 'true');
  // The real LED is OFF: the old Caps event must not manufacture uppercase output.
  await dispatchPhysicalState(input, 'Digit9', false);
  await expect(page.locator('#welcome-caps')).toHaveAttribute('data-active', 'false');
  await expect(input).toHaveText('');
  await dispatchPhysicalState(input, 'CapsLock', false);
  await dispatchPhysicalState(input, 'Digit9', true);
  await expect(input).toHaveText('Ç');
  // Repeats do not toggle the lock twice.
  await dispatchPhysicalState(input, 'CapsLock', true, { repeat: true });
  await expect(page.locator('#welcome-caps')).toHaveAttribute('data-active', 'true');
});

test('état physique changé hors saisie et Caps visuel volontaire restent distincts', async ({ page }) => {
  await startTrial(page);
  const input = page.locator('#welcome-input');
  await dispatchPhysicalState(input, 'Digit9', true);
  await expect(input).toHaveText('Ç');
  await page.locator('#welcome-platform').focus();
  await dispatchPhysicalState(page.locator('#welcome-platform'), 'CapsLock', false);
  await input.focus();
  await dispatchPhysicalState(input, 'KeyQ', false);
  await expect(input).toHaveText('Ç');
  await page.locator('#welcome-keyboard-container [data-key-id="CapsLock"]').click();
  // A chosen visual Caps state may deliberately differ from the physical LED.
  await input.focus();
  await dispatchPhysicalState(input, 'KeyQ', false);
  await expect(input).toHaveText('ÇA');
  await dispatchPhysicalState(input, 'CapsLock', false);
  await dispatchPhysicalState(input, 'Space', false);
  await expect(input).toHaveText('ÇA');
});

test('le lien vers les leçons ouvre réellement le thème choisi', async ({ page, network }) => {
  const typer = await startTrial(page);
  await finishIntro(page, typer);
  await page.locator('[data-welcome-theme="voyage"]').click();
  await page.locator('#welcome-lesson-link').click();
  await expect(page.locator('#tester-modal')).toBeVisible();
  const module = lessons.modules.find((entry) => entry.id === welcome.challenge.moduleId);
  const theme = welcome.challenge.themes.find((entry) => entry.id === 'voyage');
  const lesson = module.lessons.find((entry) => entry.id === theme.lessonId);
  await expect(page.locator('#lesson-title')).toContainText(lesson.title);
  await expect(page.locator('#lesson-target')).toHaveText(lesson.exercises[0].content);
  expect(network.pageErrors).toHaveLength(0);
});

test('une hésitation affiche l’aide sans déplacer le focus ni avancer', async ({ page }) => {
  const typer = await startTrial(page);
  await finishIntro(page, typer);
  await page.clock.install();
  await page.locator('[data-welcome-theme="voyage"]').click();
  await expect(page.locator('#welcome-hint')).toHaveText('');
  await page.clock.runFor(5600);
  await expect(page.locator('#welcome-hint')).not.toHaveText('');
  await expect(page.locator('#welcome-input')).toBeFocused();
  await expect(page.locator('#welcome-input')).toHaveText('');
  await expect(page.locator('#welcome-continue')).toBeHidden();
});

test('une composition native ne bloque pas la résolution d’une touche morte du moteur', async ({ page }) => {
  await startTrial(page);
  await page.locator('#welcome-keyboard-container [data-key-id="CapsLock"]').click();
  const input = page.locator('#welcome-input');
  await input.focus();
  await input.dispatchEvent('keydown', { code: 'BracketLeft', key: 'Dead', bubbles: true, cancelable: true });
  await expect(page.locator('#welcome-keyboard-container')).toHaveClass(/dead-key-active/);
  await input.dispatchEvent('keydown', { code: 'KeyQ', key: 'a', isComposing: true, bubbles: true, cancelable: true });
  await expect(input).toHaveText('Â');
  await expect(page.locator('#welcome-keyboard-container')).not.toHaveClass(/dead-key-active/);
  // This is literal engine output and a wrong prefix, so it cannot complete the exercise.
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#welcome-continue')).toBeHidden();
});

for (const viewport of [{ width: 375, height: 667 }, { width: 1280, height: 900 }]) {
  test(`hero ${viewport.width} : les deux actions tiennent dans le premier écran`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto('/bienvenue');
    await expect(page.locator('#welcome-trial')).toBeHidden();
    const hero = page.locator('.welcome-hero');
    const screenshot = testInfo.outputPath(`bienvenue-hero-${viewport.width}.png`);
    await page.screenshot({ path: screenshot, fullPage: false });
    await testInfo.attach(`hero-${viewport.width}`, { path: screenshot, contentType: 'image/png' });
    await expect(hero.locator('#welcome-start')).toBeInViewport({ ratio: 1 });
    await expect(hero.locator('a[href="/download"]')).toBeInViewport({ ratio: 1 });
  });
}
