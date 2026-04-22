/**
 * Persistance de la progression des leçons du testeur.
 * Stockage localStorage : { moduleId: { lessonId: [exerciseIndex, ...] } }.
 */

const STORAGE_KEY = 'azerty-lesson-progress';

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStorage(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // quota dépassé ou storage indisponible → no-op
  }
}

export function loadProgress() {
  return readStorage();
}

export function markExerciseDone(moduleId, lessonId, exerciseIndex) {
  if (!moduleId || !lessonId || typeof exerciseIndex !== 'number') return;
  const progress = readStorage();
  if (!progress[moduleId]) progress[moduleId] = {};
  if (!Array.isArray(progress[moduleId][lessonId])) progress[moduleId][lessonId] = [];
  const arr = progress[moduleId][lessonId];
  if (!arr.includes(exerciseIndex)) {
    arr.push(exerciseIndex);
    arr.sort((a, b) => a - b);
    writeStorage(progress);
  }
}

export function isExerciseDone(moduleId, lessonId, exerciseIndex) {
  const progress = readStorage();
  const arr = progress?.[moduleId]?.[lessonId];
  return Array.isArray(arr) && arr.includes(exerciseIndex);
}

export function getCompletedExercises(moduleId, lesson) {
  if (!lesson || !Array.isArray(lesson.exercises)) return [];
  const progress = readStorage();
  const arr = progress?.[moduleId]?.[lesson.id];
  if (!Array.isArray(arr)) return [];
  // Filtrer les indexes obsolètes (exercice retiré de la leçon)
  return arr.filter(idx => idx >= 0 && idx < lesson.exercises.length);
}

export function isLessonDone(moduleId, lesson) {
  if (!lesson || !Array.isArray(lesson.exercises) || lesson.exercises.length === 0) return false;
  const done = getCompletedExercises(moduleId, lesson);
  return done.length >= lesson.exercises.length;
}

export function getModuleProgress(module) {
  if (!module || !Array.isArray(module.lessons)) return { done: 0, total: 0 };
  let done = 0;
  for (const lesson of module.lessons) {
    if (isLessonDone(module.id, lesson)) done++;
  }
  return { done, total: module.lessons.length };
}

export function isModuleDone(module) {
  const { done, total } = getModuleProgress(module);
  return total > 0 && done === total;
}
