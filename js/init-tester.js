// Build config from script query params (e.g. init-tester.js?mode=lessons&module=1&lesson=3)
// or from URL search params (e.g. ?mode=lessons)
const scriptParams = new URLSearchParams(new URL(import.meta.url).search);
const pageParams = new URLSearchParams(location.search);

// Langue pilotée par la page via data-lang (relayée par lazy-tester.js en ?lang=).
// setTesterLang DOIT être appelé avant l'import de tester-modal.js : plusieurs
// modules du testeur évaluent des chaînes T(fr, en) au niveau module.
const { setTesterLang } = await import('./tester-i18n.js?v=final-20260717-3');
setTesterLang(scriptParams.get('lang') || 'fr');

const { initTesterModal } = await import('./tester-modal.js?v=final-20260717-3');

const testerConfig = {};

const mode = scriptParams.get('mode') || pageParams.get('mode');
const tutorial = scriptParams.get('tutorial') || pageParams.get('tutorial');
const guidedHints = scriptParams.get('guidedHints') || pageParams.get('guidedHints');
if (tutorial === 'start') {
  testerConfig.forceTutorialStart = true;
}
if (tutorial === 'skip') {
  testerConfig.suppressTutorial = true;
}
if (guidedHints === 'true') {
  testerConfig.guidedHints = true;
}

if (mode === 'lessons') {
  testerConfig.initialMode = 'lessons';
  testerConfig.autoOpen = pageParams.get('mode') === 'lessons';
  const moduleIndex = scriptParams.get('module') || pageParams.get('module');
  const lessonIndex = scriptParams.get('lesson') || pageParams.get('lesson');
  if (moduleIndex !== null && lessonIndex !== null) {
    testerConfig.initialLesson = {
      moduleIndex: parseInt(moduleIndex, 10),
      lessonIndex: parseInt(lessonIndex, 10)
    };
  }
}

initTesterModal(testerConfig);
