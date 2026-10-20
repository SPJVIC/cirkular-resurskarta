import { beforeEach, describe, expect, it } from 'vitest';
import { getSeedData } from '../../data/seed';
import { clearState, loadState, saveState, STORAGE_KEY } from '../storage';

describe('localStorage-persistens', () => {
  beforeEach(() => localStorage.clear());

  it('sparar och läser tillbaka data', () => {
    const data = getSeedData();
    data.actors[0].name = 'Sparad';
    expect(saveState(data)).toBe(true);
    expect(loadState()?.actors[0].name).toBe('Sparad');
  });

  it('återställning tar bort sparad data', () => {
    saveState(getSeedData());
    clearState();
    expect(loadState()).toBeNull();
  });

  it('ignorerar trasig data', () => {
    localStorage.setItem(STORAGE_KEY, '{inte json');
    expect(loadState()).toBeNull();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ actors: 'x' }));
    expect(loadState()).toBeNull();
  });
});
