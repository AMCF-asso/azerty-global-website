import { initTesterModal } from './tester-modal.js';

// Build config from script query params (e.g. init-tester.js?mode=lessons&module=1&lesson=3)
// or from URL search params (e.g. ?mode=lessons)
const scriptParams = new URLSearchParams(new URL(import.meta.url).search);
const pageParams = new URLSearchParams(location.search);
const testerConfig = {};

const mode = scriptParams.get('mode') || pageParams.get('mode');
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
