import { useCallback, useMemo, useSyncExternalStore } from "react";

const KEY = "sz_learning_progress_v1";

/** Stable snapshot for SSR / getServerSnapshot (must be same reference). */
const EMPTY_SNAPSHOT = { lessons: {}, sections: {} };

let cacheToken = null;
let cacheSnap = null;

function parseFromStorageString(s) {
  if (!s) {
    return { lessons: {}, sections: {} };
  }
  try {
    const p = JSON.parse(s);
    return {
      lessons: p.lessons && typeof p.lessons === "object" ? p.lessons : {},
      sections: p.sections && typeof p.sections === "object" ? p.sections : {}
    };
  } catch {
    return { lessons: {}, sections: {} };
  }
}

/**
 * Snapshot for useSyncExternalStore — same object reference while localStorage unchanged.
 */
function getSnapshot() {
  if (typeof window === "undefined") {
    return EMPTY_SNAPSHOT;
  }
  const s = localStorage.getItem(KEY);
  const token = s === null ? "__empty__" : s;
  if (token === cacheToken && cacheSnap) {
    return cacheSnap;
  }
  cacheToken = token;
  const parsed = parseFromStorageString(s);
  cacheSnap = {
    lessons: { ...parsed.lessons },
    sections: { ...parsed.sections }
  };
  return cacheSnap;
}

function invalidateCache() {
  cacheToken = null;
  cacheSnap = null;
}

/** Clone from disk for writes — never mutate getSnapshot’s cached object. */
function readForMutation() {
  const s = localStorage.getItem(KEY);
  let p = {};
  if (s) {
    try {
      p = JSON.parse(s);
    } catch {
      p = {};
    }
  }
  return {
    lessons: { ...(p.lessons && typeof p.lessons === "object" ? p.lessons : {}) },
    sections: { ...(p.sections && typeof p.sections === "object" ? p.sections : {}) }
  };
}

function writeRaw(data) {
  const str = JSON.stringify(data);
  localStorage.setItem(KEY, str);
  cacheToken = str;
  cacheSnap = {
    lessons: { ...data.lessons },
    sections: { ...data.sections }
  };
  window.dispatchEvent(new Event("sz-learning-progress"));
}

function subscribe(cb) {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener("sz-learning-progress", cb);
  return () => window.removeEventListener("sz-learning-progress", cb);
}

export function useLearningProgress() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_SNAPSHOT);

  const toggleLesson = useCallback((trackId, lessonId) => {
    const k = `${trackId}:${lessonId}`;
    const raw = readForMutation();
    raw.lessons[k] = !raw.lessons[k];
    writeRaw(raw);
  }, []);

  const toggleSection = useCallback((topicId, sectionIndex) => {
    const k = `${topicId}:${sectionIndex}`;
    const raw = readForMutation();
    raw.sections[k] = !raw.sections[k];
    writeRaw(raw);
  }, []);

  const isLessonDone = useCallback(
    (trackId, lessonId) => Boolean(snap.lessons[`${trackId}:${lessonId}`]),
    [snap.lessons]
  );

  const isSectionDone = useCallback(
    (topicId, sectionIndex) => Boolean(snap.sections[`${topicId}:${sectionIndex}`]),
    [snap.sections]
  );

  const helpers = useMemo(
    () => ({
      toggleLesson,
      toggleSection,
      isLessonDone,
      isSectionDone,
      countTrackDone(trackId, lessonIds) {
        return lessonIds.filter((id) => snap.lessons[`${trackId}:${id}`]).length;
      },
      countTopicDone(topicId, sectionCount) {
        let c = 0;
        for (let i = 0; i < sectionCount; i += 1) {
          if (snap.sections[`${topicId}:${i}`]) c += 1;
        }
        return c;
      }
    }),
    [toggleLesson, toggleSection, isLessonDone, isSectionDone, snap.lessons, snap.sections]
  );

  return helpers;
}
