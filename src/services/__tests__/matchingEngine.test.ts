import { describe, expect, it } from 'vitest';
import type { DataState, Facility, Need, Resource } from '../../types';
import { getSeedData } from '../../data/seed';
import { evaluatePair, isViable, MAX_SCORE_WHEN_BLOCKED, runMatching } from '../matchingEngine';
import { upsertNeed, upsertResource } from '../dataStore';

// Två arbetsställen ca 5 km från varandra (Jönköping/Huskvarna)
const facA: Facility = { id: 'fa', actorId: 'A', name: 'A', latitude: 57.7826, longitude: 14.1618, processes: [] };
const facB: Facility = { id: 'fb', actorId: 'B', name: 'B', latitude: 57.786, longitude: 14.24, processes: [] };
// ca 90 km bort (Värnamo-trakten)
const facFar: Facility = { id: 'ff', actorId: 'C', name: 'C', latitude: 57.0, longitude: 14.05, processes: [] };

const resource = (over: Partial<Resource> = {}): Resource => ({
  id: 'r',
  facilityId: 'fa',
  category: 'sawdust',
  material: 'Granspån',
  description: '',
  quantity: 500,
  unit: 'ton/år',
  quality: 'high',
  availability: 'continuous',
  classification: ['untreated', 'dry'],
  status: 'available',
  verificationStatus: 'verified',
  source: 'demo',
  updatedAt: '2026-01-01',
  ...over,
});

const need = (over: Partial<Need> = {}): Need => ({
  id: 'n',
  facilityId: 'fb',
  category: 'sawdust',
  material: 'Sågspån',
  description: '',
  requiredQuantity: 400,
  unit: 'ton/år',
  technicalRequirements: ['untreated', 'dry'],
  verificationStatus: 'verified',
  source: 'demo',
  updatedAt: '2026-01-01',
  ...over,
});

const near = { sourceFacility: facA, targetFacility: facB };

describe('matchningsmotorn', () => {
  it('1. kompatibla resurser ger en giltig matchning med hög poäng', () => {
    const m = evaluatePair(resource(), need(), near)!;
    expect(m).not.toBeNull();
    expect(m.status).toBe('potential');
    expect(m.blockers).toHaveLength(0);
    expect(m.score).toBeGreaterThanOrEqual(90);
    expect(m.score).toBeLessThanOrEqual(100);
    expect(m.reasons.length).toBeGreaterThan(0);
    expect(m.distanceKm).toBeGreaterThan(4);
    expect(m.distanceKm).toBeLessThan(6);
  });

  it('2a. inkompatibla kategorier ger ingen matchning – oavsett närhet', () => {
    const m = evaluatePair(resource({ category: 'metal_scrap', material: 'Stål' }), need(), { sourceFacility: facA, targetFacility: { ...facB, latitude: facA.latitude, longitude: facA.longitude } });
    expect(m).toBeNull();
  });

  it('2b. inkompatibelt material inom samma kategori avvisas med låg poäng', () => {
    const m = evaluatePair(
      resource({ category: 'plastic_waste', material: 'Blandplast', classification: ['mixed'] }),
      need({ category: 'plastic_waste', material: 'PP', technicalRequirements: ['sorted'] }),
      near,
    )!;
    expect(m.status).toBe('rejected');
    expect(m.score).toBeLessThanOrEqual(MAX_SCORE_WHEN_BLOCKED);
    expect(m.blockers.join(' ')).toMatch(/PP/);
  });

  it('2c. brutet tekniskt krav (behandlat trä) avvisas', () => {
    const m = evaluatePair(resource({ category: 'wood_waste', classification: ['treated'] }), need({ category: 'wood_waste', technicalRequirements: ['untreated'] }), near)!;
    expect(m.status).toBe('rejected');
    expect(m.blockers[0]).toMatch(/obehandlat/);
  });

  it('3a. längre avstånd ger lägre poäng', () => {
    const close = evaluatePair(resource(), need(), near)!;
    const far = evaluatePair(resource(), need({ facilityId: 'ff' }), { sourceFacility: facA, targetFacility: facFar })!;
    expect(far.distanceKm).toBeGreaterThan(80);
    expect(far.breakdown.distance).toBeLessThan(close.breakdown.distance);
    expect(far.score).toBeLessThan(close.score);
  });

  it('3b. spillvärme är mer avståndskänsligt än metallskrot', () => {
    // ca 10 km mellan arbetsställena
    const tenKm = { sourceFacility: facA, targetFacility: { ...facB, latitude: 57.872, longitude: 14.1618 } };
    const heat = evaluatePair(
      resource({ category: 'waste_heat', material: 'Spillvärme', unit: 'MWh/år', temperatureC: 70, classification: [] }),
      need({ category: 'waste_heat', material: 'Värme', unit: 'MWh/år', technicalRequirements: [], minTemperatureC: 50 }),
      tenKm,
    )!;
    const metal = evaluatePair(
      resource({ category: 'metal_scrap', material: 'Stålspill', classification: ['sorted'] }),
      need({ category: 'metal_scrap', material: 'Stål', technicalRequirements: ['sorted'] }),
      tenKm,
    )!;
    expect(heat.distanceKm).toBeGreaterThan(9);
    expect(heat.status).toBe('rejected');
    expect(heat.blockers.join(' ')).toMatch(/Avståndet/);
    expect(metal.status).not.toBe('rejected');
  });

  it('4. otillräcklig information flaggas som osäkerheter', () => {
    const m = evaluatePair(
      resource({ quantity: null, quality: 'unknown', classification: [], verificationStatus: 'unverified' }),
      need(),
      near,
    )!;
    expect(m.status).toBe('needs_verification');
    const text = m.uncertainties.join(' ');
    expect(text).toMatch(/volym/i);
    expect(text).toMatch(/kvalitet/i);
    expect(text).toMatch(/Okänt om materialet uppfyller kravet/);
    expect(m.blockers).toHaveLength(0);
  });

  it('4b. för låg temperatur blockerar spillvärme, okänd temperatur blir osäkerhet', () => {
    const base = { category: 'waste_heat' as const, material: 'Värme', unit: 'MWh/år' as const, classification: [] };
    const nearHeat = { sourceFacility: facA, targetFacility: { ...facB, latitude: facA.latitude + 0.005, longitude: facA.longitude } };
    const low = evaluatePair(resource({ ...base, temperatureC: 35 }), need({ ...base, technicalRequirements: [], minTemperatureC: 60 }), nearHeat)!;
    const unknown = evaluatePair(resource({ ...base, temperatureC: null }), need({ ...base, technicalRequirements: [], minTemperatureC: 60 }), nearHeat)!;
    expect(low.status).toBe('rejected');
    expect(unknown.uncertainties.join(' ')).toMatch(/Temperaturen är inte angiven/);
  });

  it('5. en ny resurs skapar nya möjliga matchningar', () => {
    const seed = getSeedData();
    const before = runMatching(seed).filter(isViable);
    // Ny resurs: sågspån hos Holsbybrunns Gård (f30) – nära flera behov av spån
    const next = upsertResource(seed, resource({ id: 'r-new', facilityId: 'f30' }));
    const after = runMatching(next).filter(isViable);
    expect(after.length).toBeGreaterThan(before.length);
    expect(after.some((m) => m.sourceResourceId === 'r-new')).toBe(true);
  });

  it('6. ändrade behov påverkar matchningsresultatet', () => {
    const seed = getSeedData();
    const id = 'r22__n17'; // Granlunda Såg → Finnvedens Pellets
    const original = runMatching(seed).find((m) => m.id === id)!;
    expect(original.status).toBe('potential');

    // Mottagaren kräver nu livsmedelskvalitet → osäkerhet, lägre status
    const n17 = seed.needs.find((n) => n.id === 'n17')!;
    const stricter = runMatching(upsertNeed(seed, { ...n17, technicalRequirements: [...n17.technicalRequirements, 'food_grade'] })).find((m) => m.id === id)!;
    expect(stricter.uncertainties.length).toBeGreaterThan(original.uncertainties.length);

    // Mottagaren byter kategori → matchningen försvinner
    const changed = runMatching(upsertNeed(seed, { ...n17, category: 'textile' })).find((m) => m.id === id);
    expect(changed).toBeUndefined();

    // Mottagaren sätter ett maxavstånd som är kortare än avståndet → avvisas
    const capped = runMatching(upsertNeed(seed, { ...n17, maxDistanceKm: 10 })).find((m) => m.id === id)!;
    expect(capped.status).toBe('rejected');
  });

  it('matchar inte en aktör mot sig själv', () => {
    const state: DataState = {
      actors: [],
      facilities: [facA, { ...facB, actorId: 'A' }],
      resources: [resource()],
      needs: [need()],
    };
    expect(runMatching(state)).toHaveLength(0);
  });

  it('demonstrationsdatan ger minst 15 genomförbara matchningar och flera avvisade fall', () => {
    const all = runMatching(getSeedData());
    expect(all.filter(isViable).length).toBeGreaterThanOrEqual(15);
    const rejected = all.filter((m) => m.status === 'rejected');
    expect(rejected.length).toBeGreaterThanOrEqual(5);
    // Både geografiska och tekniska hinder finns representerade
    expect(rejected.some((m) => /Avståndet/.test(m.blockers.join()))).toBe(true);
    expect(rejected.some((m) => /Tekniskt krav/.test(m.blockers.join()))).toBe(true);
  });

  it('är deterministisk och poängen ligger inom 0–100', () => {
    const a = runMatching(getSeedData());
    const b = runMatching(getSeedData());
    expect(a.map((m) => [m.id, m.score])).toEqual(b.map((m) => [m.id, m.score]));
    for (const m of a) {
      expect(m.score).toBeGreaterThanOrEqual(0);
      expect(m.score).toBeLessThanOrEqual(100);
    }
  });
});
