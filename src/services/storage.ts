import type { DataState } from '../types';

/** Persistens i webbläsarens localStorage. Versionerad nyckel så att datamodellen kan ändras. */
export const STORAGE_KEY = 'cirkular-resurskarta:data:v1';

export function loadState(): DataState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DataState;
    if (!Array.isArray(parsed.actors) || !Array.isArray(parsed.facilities) || !Array.isArray(parsed.resources) || !Array.isArray(parsed.needs)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveState(state: DataState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* localStorage kan saknas (t.ex. privat läge) – appen fungerar ändå med seed-data */
  }
}
