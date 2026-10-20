import { describe, expect, it } from 'vitest';
import { getSeedData } from '../../data/seed';
import { createActor, deleteActor, nearestMunicipality, updateActor, updateFacility } from '../dataStore';

const actorInput = {
  name: 'Testbolaget AB',
  actorType: 'company' as const,
  industry: 'Träindustri',
  description: 'Sågverk med torkprocess',
  municipality: 'Vetlanda' as const,
  employeeRange: '10–49',
};

describe('aktörsregister (CRUD)', () => {
  it('skapar en aktör med arbetsställe på vald position', () => {
    const seed = getSeedData();
    const { state, actorId, facilityId } = createActor(seed, actorInput, { name: 'Fabriken', latitude: 57.43, longitude: 15.2, processes: ['sågning'] });
    expect(state.actors).toHaveLength(41);
    const actor = state.actors.find((a) => a.id === actorId)!;
    expect(actor.source).toBe('user');
    const fac = state.facilities.find((f) => f.id === facilityId)!;
    expect(fac.actorId).toBe(actorId);
    expect(fac.latitude).toBe(57.43);
    expect(seed.actors).toHaveLength(40); // originalet är orört
  });

  it('uppdaterar aktörsuppgifter och flyttar arbetsställe', () => {
    let s = updateActor(getSeedData(), 'a01', { name: 'Nytt namn' });
    s = updateFacility(s, 'f01', { latitude: 57.8, longitude: 14.3 });
    expect(s.actors.find((a) => a.id === 'a01')!.name).toBe('Nytt namn');
    expect(s.facilities.find((f) => f.id === 'f01')!.latitude).toBe(57.8);
  });

  it('tar bort aktör med kaskad till arbetsställen, resurser och behov', () => {
    const s = deleteActor(getSeedData(), 'a34'); // Granlunda Såg har två arbetsställen och tre resurser
    expect(s.actors.some((a) => a.id === 'a34')).toBe(false);
    expect(s.facilities.some((f) => f.actorId === 'a34')).toBe(false);
    expect(s.resources.some((r) => ['f34', 'f41'].includes(r.facilityId))).toBe(false);
  });

  it('hittar närmaste kommun utifrån koordinater', () => {
    expect(nearestMunicipality(57.787, 14.3)).toBe('Jönköping'); // Huskvarna
    expect(nearestMunicipality(57.19, 14.04)).toBe('Värnamo');
    expect(nearestMunicipality(57.62, 15.56)).toBe('Eksjö'); // Mariannelund
  });
});
