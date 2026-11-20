import { JalamapState } from '../types';

const STORAGE_KEY = 'jalamap_demo_state_v1';

export function saveStateToStorage(state: JalamapState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Failed to save JALAMAP state to localStorage', err);
  }
}

export function loadStateFromStorage(): JalamapState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as JalamapState;
  } catch (err) {
    console.warn('Failed to load JALAMAP state from localStorage', err);
    return null;
  }
}

export function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear JALAMAP storage', err);
  }
}
