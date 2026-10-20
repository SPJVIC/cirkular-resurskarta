import { describe, expect, it } from 'vitest';
import { getSeedData } from '../../data/seed';
import { COUNTY_BOUNDS, MUNICIPALITIES } from '../../data/taxonomy';
import { buildIndex, markerKind } from '../filtering';

describe('demonstrationsdata', () => {
  const data = getSeedData();

  it('innehåller 40 aktörer i samtliga 13 kommuner', () => {
    expect(data.actors).toHaveLength(40);
    expect(new Set(data.actors.map((a) => a.municipality))).toEqual(new Set(MUNICIPALITIES));
  });

  it('har giltiga referenser mellan aktör, arbetsställe, resurs och behov', () => {
    const actorIds = new Set(data.actors.map((a) => a.id));
    const facilityIds = new Set(data.facilities.map((f) => f.id));
    for (const f of data.facilities) expect(actorIds.has(f.actorId)).toBe(true);
    for (const r of data.resources) expect(facilityIds.has(r.facilityId)).toBe(true);
    for (const n of data.needs) expect(facilityIds.has(n.facilityId)).toBe(true);
    for (const a of data.actors) expect(data.facilities.some((f) => f.actorId === a.id)).toBe(true);
  });

  it('har koordinater inom Jönköpings län', () => {
    for (const f of data.facilities) {
      expect(f.latitude).toBeGreaterThan(COUNTY_BOUNDS.south);
      expect(f.latitude).toBeLessThan(COUNTY_BOUNDS.north);
      expect(f.longitude).toBeGreaterThan(COUNTY_BOUNDS.west);
      expect(f.longitude).toBeLessThan(COUNTY_BOUNDS.east);
    }
  });

  it('innehåller alla fyra markörtyper inklusive ej kartlagda aktörer', () => {
    const idx = buildIndex(data);
    const kinds = new Set(data.actors.map((a) => markerKind(a.id, idx)));
    expect(kinds).toEqual(new Set(['resources', 'needs', 'both', 'unmapped']));
  });

  it('returnerar en ny kopia varje gång', () => {
    const a = getSeedData();
    a.actors[0].name = 'Ändrad';
    expect(getSeedData().actors[0].name).not.toBe('Ändrad');
  });
});
