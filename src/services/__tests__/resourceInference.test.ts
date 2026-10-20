import { describe, expect, it } from 'vitest';
import { getSeedData } from '../../data/seed';
import { buildIndex } from '../filtering';
import { inferPotentialResources } from '../resourceInference';

describe('identifiering av potentiella resurser (simulerad AI)', () => {
  const data = getSeedData();
  const idx = buildIndex(data);
  const infer = (actorId: string) =>
    inferPotentialResources({
      actor: idx.actorById.get(actorId)!,
      facilities: idx.facilitiesByActor.get(actorId)!,
      existingResources: idx.resourcesByActor.get(actorId)!,
    });

  it('föreslår sågspån, bark, träflis och spillvärme för ett sågverk med torkprocess', () => {
    const cats = infer('a14').map((s) => s.category);
    expect(cats).toEqual(expect.arrayContaining(['sawdust', 'bark', 'wood_waste', 'waste_heat']));
  });

  it('motiverar varje förslag och anger utlösande nyckelord', () => {
    for (const s of infer('a14')) {
      expect(s.motivation.length).toBeGreaterThan(10);
      expect(s.matchedKeywords.length).toBeGreaterThan(0);
    }
  });

  it('föreslår inte kategorier som redan är registrerade', () => {
    // Granlunda Såg har redan sågspån, bark och träflis
    const cats = infer('a34').map((s) => s.category);
    expect(cats).not.toContain('sawdust');
    expect(cats).not.toContain('bark');
  });

  it('identifierar spillvärme från kompressorer och emballage från lager', () => {
    expect(infer('a38').map((s) => s.category)).toContain('waste_heat');
    expect(infer('a40').map((s) => s.category)).toContain('packaging');
  });
});
