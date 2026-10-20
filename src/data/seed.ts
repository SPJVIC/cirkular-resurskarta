import type { Actor, DataState, Facility, Need, Resource } from '../types';
import actors from './actors.json';
import facilities from './facilities.json';
import resources from './resources.json';
import needs from './needs.json';

/** Ursprunglig, deterministisk demonstrationsdata. Returnerar alltid en ny kopia. */
export function getSeedData(): DataState {
  return structuredClone({
    actors: actors as Actor[],
    facilities: facilities as Facility[],
    resources: resources as Resource[],
    needs: needs as Need[],
  });
}
