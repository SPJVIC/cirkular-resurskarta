import type { Actor, DataState, Facility, Filters, MarkerKind, Need, Resource } from '../types';
import { haversineKm } from './distanceCalculator';

export interface DataIndex {
  actorById: Map<string, Actor>;
  facilityById: Map<string, Facility>;
  facilitiesByActor: Map<string, Facility[]>;
  resourcesByActor: Map<string, Resource[]>;
  needsByActor: Map<string, Need[]>;
  resourceById: Map<string, Resource>;
  needById: Map<string, Need>;
}

export function buildIndex(state: DataState): DataIndex {
  const facilityById = new Map(state.facilities.map((f) => [f.id, f]));
  const facilitiesByActor = new Map<string, Facility[]>();
  const resourcesByActor = new Map<string, Resource[]>();
  const needsByActor = new Map<string, Need[]>();
  for (const a of state.actors) {
    facilitiesByActor.set(a.id, []);
    resourcesByActor.set(a.id, []);
    needsByActor.set(a.id, []);
  }
  for (const f of state.facilities) facilitiesByActor.get(f.actorId)?.push(f);
  for (const r of state.resources) {
    const f = facilityById.get(r.facilityId);
    if (f) resourcesByActor.get(f.actorId)?.push(r);
  }
  for (const n of state.needs) {
    const f = facilityById.get(n.facilityId);
    if (f) needsByActor.get(f.actorId)?.push(n);
  }
  return {
    actorById: new Map(state.actors.map((a) => [a.id, a])),
    facilityById,
    facilitiesByActor,
    resourcesByActor,
    needsByActor,
    resourceById: new Map(state.resources.map((r) => [r.id, r])),
    needById: new Map(state.needs.map((n) => [n.id, n])),
  };
}

export function markerKind(actorId: string, index: DataIndex): MarkerKind {
  const hasR = (index.resourcesByActor.get(actorId)?.length ?? 0) > 0;
  const hasN = (index.needsByActor.get(actorId)?.length ?? 0) > 0;
  if (hasR && hasN) return 'both';
  if (hasR) return 'resources';
  if (hasN) return 'needs';
  return 'unmapped';
}

export const EMPTY_FILTERS: Filters = {
  search: '',
  municipality: '',
  industry: '',
  actorType: '',
  resourceCategory: '',
  flow: 'all',
  resourceStatus: '',
  verificationStatus: '',
  distance: null,
};

export function activeFilterCount(f: Filters): number {
  return (
    (f.search ? 1 : 0) +
    (f.municipality ? 1 : 0) +
    (f.industry ? 1 : 0) +
    (f.actorType ? 1 : 0) +
    (f.resourceCategory || f.flow !== 'all' ? 1 : 0) +
    (f.resourceStatus ? 1 : 0) +
    (f.verificationStatus ? 1 : 0) +
    (f.distance ? 1 : 0)
  );
}

/** Returnerar id:n för de aktörer som uppfyller samtliga filter. */
export function applyFilters(state: DataState, index: DataIndex, f: Filters): Set<string> {
  const q = f.search.trim().toLowerCase();
  const visible = new Set<string>();
  for (const actor of state.actors) {
    const resources = index.resourcesByActor.get(actor.id) ?? [];
    const needs = index.needsByActor.get(actor.id) ?? [];
    const facilities = index.facilitiesByActor.get(actor.id) ?? [];

    if (f.municipality && actor.municipality !== f.municipality) continue;
    if (f.industry && actor.industry !== f.industry) continue;
    if (f.actorType && actor.actorType !== f.actorType) continue;

    if (q) {
      const hay = [actor.name, actor.industry, actor.description, actor.municipality, ...facilities.map((x) => x.name), ...resources.map((r) => r.material), ...needs.map((n) => n.material)]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) continue;
    }

    if (f.resourceCategory || f.flow !== 'all') {
      const cat = f.resourceCategory;
      const offerOk = resources.some((r) => !cat || r.category === cat);
      const needOk = needs.some((n) => !cat || n.category === cat);
      if (f.flow === 'offer' && !offerOk) continue;
      if (f.flow === 'need' && !needOk) continue;
      if (f.flow === 'all' && !offerOk && !needOk) continue;
    }

    if (f.resourceStatus && !resources.some((r) => r.status === f.resourceStatus)) continue;
    if (f.verificationStatus && ![...resources, ...needs].some((x) => x.verificationStatus === f.verificationStatus)) continue;

    if (f.distance) {
      const d = f.distance;
      if (!facilities.some((fac) => haversineKm(d.latitude, d.longitude, fac.latitude, fac.longitude) <= d.km)) continue;
    }

    visible.add(actor.id);
  }
  return visible;
}
