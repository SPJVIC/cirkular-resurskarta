import type { DataState, Facility, Match, MatchStatus, Need, Resource, ScoreBreakdown } from '../types';
import {
  AVAILABILITY_LABELS,
  CATEGORY_LABELS,
  TAG_LABELS,
  VERIFICATION_LABELS,
} from '../data/taxonomy';
import {
  DISTANCE_PROFILES,
  OPPOSITE_TAG,
  findRule,
  isMaterialSensitive,
  materialTokens,
} from './compatibilityRules';
import { formatKm, haversineKm } from './distanceCalculator';

/**
 * Regelbaserad matchningsmotor.
 *
 * Poängmodell (0–100, indikativ matchningspotential – inte sannolikhet för lyckat samarbete):
 *   Kompatibilitet 0–30 · Kvalitet 0–10 · Volym 0–15 · Tillgänglighet 0–10 · Avstånd 0–25 · Datakvalitet 0–10
 *
 * Inkompatibla kategorier ger ingen matchning alls. Brutna tekniska krav, för långt avstånd
 * eller redan avtalade flöden ger hinder (blockers) och poängen begränsas till max 25.
 */

export const MAX_SCORE_WHEN_BLOCKED = 25;

export const SCORE_WEIGHTS: ScoreBreakdown = {
  compatibility: 30,
  quality: 10,
  volume: 15,
  availability: 10,
  distance: 25,
  dataQuality: 10,
};

const QUALITY_POINTS = { high: 10, medium: 7, low: 3, unknown: 3 } as const;
const AVAILABILITY_POINTS = { continuous: 10, seasonal: 7, batch: 6, one_off: 3 } as const;
const VERIFICATION_POINTS = { verified: 5, self_reported: 3, unverified: 1 } as const;

export interface PairContext {
  sourceFacility: Facility;
  targetFacility: Facility;
}

/** Bedömer om en resurs kan möta ett behov. Returnerar null om kategorierna är inkompatibla. */
export function evaluatePair(resource: Resource, need: Need, ctx: PairContext): Match | null {
  const rule = findRule(need.category, resource.category);
  if (!rule) return null;

  const reasons: string[] = [];
  const uncertainties: string[] = [];
  const blockers: string[] = [];

  // 1. Resurskompatibilitet och material
  let compatibility = rule.fit * SCORE_WEIGHTS.compatibility;
  reasons.push(rule.use);
  if (rule.fit < 1) {
    uncertainties.push(
      `${CATEGORY_LABELS[resource.category]} är en ersättningsråvara för ${CATEGORY_LABELS[need.category].toLowerCase()} – passformen behöver bekräftas.`,
    );
  }

  if (isMaterialSensitive(resource.category)) {
    const needTokens = materialTokens(need.category, need.material);
    const resTokens = materialTokens(resource.category, resource.material);
    if (needTokens.length > 0) {
      if (resTokens.length === 0) {
        compatibility *= 0.7;
        uncertainties.push(`Materialtypen för "${resource.material}" är inte specificerad – mottagaren kräver ${needTokens.join('/')}.`);
      } else if (resTokens.every((t) => needTokens.includes(t))) {
        reasons.push(`Materialtypen (${resTokens.join('/')}) motsvarar mottagarens krav.`);
      } else {
        compatibility = 0;
        const label = resTokens.includes('BLAND') ? 'blandade polymerer' : resTokens.join('/');
        blockers.push(`Materialet består av ${label} men mottagaren tar endast emot ${needTokens.join('/')}.`);
      }
    }
  }

  // 2. Tekniska förutsättningar
  for (const req of need.technicalRequirements) {
    if (resource.classification.includes(req)) {
      reasons.push(`Uppfyller kravet: ${TAG_LABELS[req].toLowerCase()}.`);
    } else if (resource.classification.includes(OPPOSITE_TAG[req])) {
      blockers.push(
        `Tekniskt krav ej uppfyllt: mottagaren kräver "${TAG_LABELS[req].toLowerCase()}" men materialet är "${TAG_LABELS[OPPOSITE_TAG[req]].toLowerCase()}".`,
      );
    } else {
      uncertainties.push(`Okänt om materialet uppfyller kravet "${TAG_LABELS[req].toLowerCase()}".`);
    }
  }

  if (need.minTemperatureC != null) {
    if (resource.temperatureC == null) {
      uncertainties.push(`Temperaturen är inte angiven – mottagaren behöver minst ${need.minTemperatureC} °C.`);
    } else if (resource.temperatureC < need.minTemperatureC) {
      blockers.push(
        `Temperaturen (${resource.temperatureC} °C) är lägre än mottagarens krav på ${need.minTemperatureC} °C. Värmepump krävs.`,
      );
    } else {
      reasons.push(`Temperaturen (${resource.temperatureC} °C) uppfyller kravet på minst ${need.minTemperatureC} °C.`);
    }
  }

  // 3. Materialkvalitet
  const quality = QUALITY_POINTS[resource.quality];
  if (resource.quality === 'unknown') uncertainties.push('Materialkvaliteten är inte angiven.');
  if (resource.quality === 'low') uncertainties.push('Materialkvaliteten är angiven som låg – kan kräva förbehandling.');

  // 4. Volym
  let volume = 5;
  if (resource.quantity == null || need.requiredQuantity == null) {
    uncertainties.push(
      resource.quantity == null ? 'Tillgänglig volym är inte angiven.' : 'Mottagarens behovsvolym är inte angiven.',
    );
  } else if (resource.unit !== need.unit) {
    uncertainties.push(`Olika enheter (${resource.unit} och ${need.unit}) – volymerna kan inte jämföras direkt.`);
  } else {
    const ratio = resource.quantity / need.requiredQuantity;
    const pct = Math.round(Math.min(ratio, 1) * 100);
    if (ratio >= 1) {
      volume = 15;
      reasons.push(`Volymen (${fmtQty(resource.quantity, resource.unit)}) täcker hela mottagarens behov.`);
    } else if (ratio >= 0.5) {
      volume = 12;
      reasons.push(`Volymen täcker ca ${pct} % av mottagarens behov.`);
    } else if (ratio >= 0.1) {
      volume = 8;
      reasons.push(`Volymen täcker ca ${pct} % av behovet – kan bli en av flera leverantörer.`);
    } else if (ratio >= 0.02) {
      volume = 3;
      uncertainties.push(`Volymen täcker endast ca ${pct} % av behovet – samlastning med andra leverantörer krävs.`);
    } else {
      volume = 0;
      blockers.push(`Volymen (${fmtQty(resource.quantity, resource.unit)}) är för liten i förhållande till behovet (${fmtQty(need.requiredQuantity, need.unit)}).`);
    }
  }

  // 5. Tillgänglighet och status
  const availability = AVAILABILITY_POINTS[resource.availability];
  if (resource.availability === 'seasonal') uncertainties.push('Säsongsvis tillgång – kräver lager eller kompletterande källa.');
  if (resource.availability === 'one_off') uncertainties.push('Engångsparti – lämpar sig inte för ett långsiktigt avtal.');
  if (resource.availability === 'batch') uncertainties.push('Batchvis tillgång – leveransintervall behöver stämmas av.');
  if (resource.availability === 'continuous') reasons.push(`Tillgången är ${AVAILABILITY_LABELS.continuous.toLowerCase()}.`);
  if (resource.status === 'committed') blockers.push('Resursen är redan avtalad med en annan mottagare.');
  if (resource.status === 'planned') uncertainties.push('Flödet är planerat men ännu inte i drift.');

  // 6. Geografi (fågelväg)
  const distanceKm = haversineKm(
    ctx.sourceFacility.latitude,
    ctx.sourceFacility.longitude,
    ctx.targetFacility.latitude,
    ctx.targetFacility.longitude,
  );
  const profile = DISTANCE_PROFILES[resource.category];
  let distance: number;
  if (distanceKm <= profile.idealKm) {
    distance = SCORE_WEIGHTS.distance;
    reasons.push(`Kort avstånd: ${formatKm(distanceKm)} fågelväg.`);
  } else if (distanceKm <= profile.maxKm) {
    distance = SCORE_WEIGHTS.distance * (1 - (distanceKm - profile.idealKm) / (profile.maxKm - profile.idealKm));
    reasons.push(`${formatKm(distanceKm)} fågelväg – inom rimligt avstånd för ${CATEGORY_LABELS[resource.category].toLowerCase()}.`);
  } else {
    distance = 0;
    blockers.push(
      `Avståndet (${formatKm(distanceKm)} fågelväg) överstiger rimlig gräns på ${profile.maxKm} km för ${CATEGORY_LABELS[resource.category].toLowerCase()} (${profile.note}).`,
    );
  }
  if (need.maxDistanceKm != null && distanceKm > need.maxDistanceKm) {
    blockers.push(`Mottagaren accepterar max ${need.maxDistanceKm} km transportavstånd.`);
  }

  // 7. Datakvalitet
  const dataQuality = VERIFICATION_POINTS[resource.verificationStatus] + VERIFICATION_POINTS[need.verificationStatus];
  if (resource.verificationStatus === 'unverified') uncertainties.push(`Resursuppgifterna är ${VERIFICATION_LABELS.unverified.toLowerCase()}.`);
  if (need.verificationStatus === 'unverified') uncertainties.push(`Behovsuppgifterna är ${VERIFICATION_LABELS.unverified.toLowerCase()}.`);

  const breakdown: ScoreBreakdown = {
    compatibility: round1(compatibility),
    quality,
    volume,
    availability,
    distance: round1(distance),
    dataQuality,
  };
  let score = Math.round(Object.values(breakdown).reduce((a, b) => a + b, 0));
  if (blockers.length > 0) score = Math.min(score, MAX_SCORE_WHEN_BLOCKED);

  const status: MatchStatus =
    blockers.length > 0
      ? 'rejected'
      : uncertainties.length >= 2 || resource.verificationStatus === 'unverified' || need.verificationStatus === 'unverified'
        ? 'needs_verification'
        : 'potential';

  return {
    id: `${resource.id}__${need.id}`,
    sourceResourceId: resource.id,
    targetNeedId: need.id,
    sourceActorId: ctx.sourceFacility.actorId,
    targetActorId: ctx.targetFacility.actorId,
    score,
    breakdown,
    distanceKm: round1(distanceKm),
    reasons,
    uncertainties,
    blockers,
    nextSteps: suggestNextSteps(resource, need, blockers, uncertainties),
    status,
  };
}

function suggestNextSteps(resource: Resource, need: Need, blockers: string[], uncertainties: string[]): string[] {
  if (blockers.length > 0) {
    return [
      'Dokumentera varför matchningen inte är genomförbar i nuläget.',
      'Undersök om hindret kan undanröjas (t.ex. sortering, förbehandling, värmepump eller mellanlager).',
      'Sök alternativa mottagare närmare eller med andra krav.',
    ];
  }
  const steps = ['Boka ett inledande samtal med båda aktörerna.'];
  if (resource.verificationStatus !== 'verified') steps.push('Verifiera resursens volym och kvalitet på plats.');
  if (uncertainties.some((u) => u.includes('krav'))) steps.push('Ta fram provmaterial och stäm av mot mottagarens tekniska krav.');
  if (resource.category === 'waste_heat') steps.push('Gör en förstudie av ledningsdragning och temperaturprofil.');
  else steps.push('Ta fram en enkel transportkalkyl baserad på faktiskt vägavstånd.');
  if (need.verificationStatus !== 'verified') steps.push('Bekräfta mottagarens behov och tidplan.');
  steps.push('Ta fram en avsiktsförklaring om fortsatt utredning.');
  return steps;
}

/** Kör matchningsmotorn över hela datamängden. Matchningar mellan samma aktör utesluts. */
export function runMatching(state: DataState): Match[] {
  const facilityById = new Map(state.facilities.map((f) => [f.id, f]));
  const matches: Match[] = [];
  for (const resource of state.resources) {
    const sourceFacility = facilityById.get(resource.facilityId);
    if (!sourceFacility) continue;
    for (const need of state.needs) {
      const targetFacility = facilityById.get(need.facilityId);
      if (!targetFacility || targetFacility.actorId === sourceFacility.actorId) continue;
      const match = evaluatePair(resource, need, { sourceFacility, targetFacility });
      if (match) matches.push(match);
    }
  }
  return matches.sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm || a.id.localeCompare(b.id));
}

export const isViable = (m: Match) => m.status !== 'rejected';

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function fmtQty(q: number | null, unit: string): string {
  if (q == null) return 'Okänd mängd';
  return `${q.toLocaleString('sv-SE')} ${unit}`;
}
