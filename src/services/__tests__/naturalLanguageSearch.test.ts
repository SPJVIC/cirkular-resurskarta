import { describe, expect, it } from 'vitest';
import { getSeedData } from '../../data/seed';
import { applyFilters, buildIndex, EMPTY_FILTERS } from '../filtering';
import { parseQuery } from '../naturalLanguageSearch';

describe('naturlig språksökning', () => {
  it('tolkar plats, avstånd, resurstyp och behov', () => {
    const r = parseQuery('Visa företag inom 30 km från Värnamo som kan använda träspill');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.filters.distance).toMatchObject({ label: 'Värnamo', km: 30 });
    expect(r.filters.resourceCategory).toBe('wood_waste');
    expect(r.filters.flow).toBe('need');
  });

  it('exempelfrågan ger träffar i demonstrationsdatan', () => {
    const r = parseQuery('Visa företag inom 30 km från Värnamo som kan använda träspill');
    if (!r.ok) throw new Error(r.message);
    const data = getSeedData();
    const visible = applyFilters(data, buildIndex(data), { ...EMPTY_FILTERS, ...r.filters });
    expect(visible.size).toBeGreaterThan(0);
    expect(visible.has('a32')).toBe(true); // Finnvedens Pellets
  });

  it('tolkar mil, erbjudanden och kommun', () => {
    const a = parseQuery('Aktörer inom 5 mil från Jönköping som erbjuder plast');
    expect(a.ok && a.filters.distance?.km).toBe(50);
    expect(a.ok && a.filters.flow).toBe('offer');
    expect(a.ok && a.filters.resourceCategory).toBe('plastic_waste');

    const b = parseQuery('Vilka har spillvärme i Vetlanda?');
    expect(b.ok && b.filters.municipality).toBe('Vetlanda');
    expect(b.ok && b.filters.resourceCategory).toBe('waste_heat');
  });

  it('ger ett begripligt felmeddelande när frågan inte kan tolkas', () => {
    const r = parseQuery('hej hur mår du');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/kunde inte tolkas/);
    const noPlace = parseQuery('inom 20 km som har bark');
    expect(noPlace.ok).toBe(false);
  });
});
