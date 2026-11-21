import type { StoredPlayerProgress } from '../types/game';

const STORAGE_KEY = 'skyrescue_devfest2026_progress_v1';

const DEFAULT_PROGRESS: StoredPlayerProgress = {
  bestScore: 0,
  missionsCompleted: 0,
  totalSuppliesDelivered: 0,
  soundEnabled: true,
  preferredDifficulty: 'Auto',
};

export function loadPlayerProgress(): StoredPlayerProgress {
  if (typeof window === 'undefined') return DEFAULT_PROGRESS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<StoredPlayerProgress>;
    return {
      bestScore: typeof parsed.bestScore === 'number' && parsed.bestScore >= 0 ? parsed.bestScore : 0,
      missionsCompleted:
        typeof parsed.missionsCompleted === 'number' && parsed.missionsCompleted >= 0
          ? parsed.missionsCompleted
          : 0,
      totalSuppliesDelivered:
        typeof parsed.totalSuppliesDelivered === 'number' && parsed.totalSuppliesDelivered >= 0
          ? parsed.totalSuppliesDelivered
          : 0,
      soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : true,
      preferredDifficulty:
        parsed.preferredDifficulty === 'Easy' ||
        parsed.preferredDifficulty === 'Medium' ||
        parsed.preferredDifficulty === 'Hard' ||
        parsed.preferredDifficulty === 'Auto'
          ? parsed.preferredDifficulty
          : 'Auto',
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export function savePlayerProgress(progress: StoredPlayerProgress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota errors gracefully
  }
}
