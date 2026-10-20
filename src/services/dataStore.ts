import type { Actor, DataState, Facility, Municipality, Need, Resource } from '../types';
import { PLACES } from '../data/taxonomy';
import { haversineKm } from './distanceCalculator';

/**
 * Rena funktioner för att skapa, ändra och ta bort entiteter.
 * Varje funktion returnerar ett nytt DataState – inget muteras.
 */

let counter = 0;
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}`;
}

export const today = () => new Date().toISOString().slice(0, 10);

export type ActorInput = Omit<Actor, 'id' | 'source'>;
export type FacilityInput = Omit<Facility, 'id' | 'actorId'>;

export function createActor(
  state: DataState,
  actor: ActorInput,
  facility: FacilityInput,
): { state: DataState; actorId: string; facilityId: string } {
  const actorId = newId('a');
  const facilityId = newId('f');
  return {
    actorId,
    facilityId,
    state: {
      ...state,
      actors: [...state.actors, { ...actor, id: actorId, source: 'user' }],
      facilities: [...state.facilities, { ...facility, id: facilityId, actorId }],
    },
  };
}

export function updateActor(state: DataState, id: string, patch: Partial<ActorInput>): DataState {
  return { ...state, actors: state.actors.map((a) => (a.id === id ? { ...a, ...patch } : a)) };
}

/** Tar bort aktören och kaskaderar till arbetsställen, resurser och behov. */
export function deleteActor(state: DataState, id: string): DataState {
  const facilityIds = new Set(state.facilities.filter((f) => f.actorId === id).map((f) => f.id));
  return {
    actors: state.actors.filter((a) => a.id !== id),
    facilities: state.facilities.filter((f) => !facilityIds.has(f.id)),
    resources: state.resources.filter((r) => !facilityIds.has(r.facilityId)),
    needs: state.needs.filter((n) => !facilityIds.has(n.facilityId)),
  };
}

export function addFacility(state: DataState, actorId: string, facility: FacilityInput): { state: DataState; facilityId: string } {
  const facilityId = newId('f');
  return { facilityId, state: { ...state, facilities: [...state.facilities, { ...facility, id: facilityId, actorId }] } };
}

export function updateFacility(state: DataState, id: string, patch: Partial<FacilityInput>): DataState {
  return { ...state, facilities: state.facilities.map((f) => (f.id === id ? { ...f, ...patch } : f)) };
}

export function deleteFacility(state: DataState, id: string): DataState {
  return {
    ...state,
    facilities: state.facilities.filter((f) => f.id !== id),
    resources: state.resources.filter((r) => r.facilityId !== id),
    needs: state.needs.filter((n) => n.facilityId !== id),
  };
}

export function upsertResource(state: DataState, resource: Resource): DataState {
  const exists = state.resources.some((r) => r.id === resource.id);
  const next = { ...resource, updatedAt: today() };
  return {
    ...state,
    resources: exists ? state.resources.map((r) => (r.id === resource.id ? next : r)) : [...state.resources, next],
  };
}

export function deleteResource(state: DataState, id: string): DataState {
  return { ...state, resources: state.resources.filter((r) => r.id !== id) };
}

export function upsertNeed(state: DataState, need: Need): DataState {
  const exists = state.needs.some((n) => n.id === need.id);
  const next = { ...need, updatedAt: today() };
  return { ...state, needs: exists ? state.needs.map((n) => (n.id === need.id ? next : n)) : [...state.needs, next] };
}

export function deleteNeed(state: DataState, id: string): DataState {
  return { ...state, needs: state.needs.filter((n) => n.id !== id) };
}

/** Närmaste ort i länet (lokal tabell). Används för att förifylla kommun vid kartklick. */
export function nearestPlace(lat: number, lng: number) {
  let best = PLACES[0];
  let bestKm = Infinity;
  for (const p of PLACES) {
    const km = haversineKm(lat, lng, p.latitude, p.longitude);
    if (km < bestKm) {
      best = p;
      bestKm = km;
    }
  }
  return { place: best, km: bestKm };
}

export function nearestMunicipality(lat: number, lng: number): Municipality {
  return nearestPlace(lat, lng).place.municipality;
}

/** Tomma mallar för nya resurser/behov. */
export function blankResource(facilityId: string): Resource {
  return {
    id: newId('r'),
    facilityId,
    category: 'wood_waste',
    material: '',
    description: '',
    quantity: null,
    unit: 'ton/år',
    quality: 'unknown',
    availability: 'continuous',
    classification: [],
    temperatureC: null,
    status: 'available',
    verificationStatus: 'unverified',
    source: 'user',
    updatedAt: today(),
  };
}

export function blankNeed(facilityId: string): Need {
  return {
    id: newId('n'),
    facilityId,
    category: 'wood_waste',
    material: '',
    description: '',
    requiredQuantity: null,
    unit: 'ton/år',
    technicalRequirements: [],
    minTemperatureC: null,
    maxDistanceKm: null,
    verificationStatus: 'unverified',
    source: 'user',
    updatedAt: today(),
  };
}
