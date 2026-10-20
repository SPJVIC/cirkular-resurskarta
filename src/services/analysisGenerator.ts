import type { Match } from '../types';
import { AVAILABILITY_LABELS, CATEGORY_LABELS, MATCH_STATUS_LABELS, QUALITY_LABELS, TAG_LABELS, VERIFICATION_LABELS } from '../data/taxonomy';
import { DISTANCE_PROFILES } from './compatibilityRules';
import { formatKm } from './distanceCalculator';
import type { DataIndex } from './filtering';
import { fmtQty } from './matchingEngine';

/**
 * Mallbaserad analys av en matchning. Texten genereras enbart från strukturerad
 * data och matchningsmotorns regler – ingen språkmodell används.
 */

export interface MatchAnalysisData {
  title: string;
  summary: string;
  why: string[];
  technical: string[];
  geographic: string[];
  benefits: string[];
  obstacles: string[];
  nextSteps: string[];
  dialogQuestions: { to: string; questions: string[] }[];
}

export function generateAnalysis(match: Match, index: DataIndex): MatchAnalysisData | null {
  const resource = index.resourceById.get(match.sourceResourceId);
  const need = index.needById.get(match.targetNeedId);
  const source = index.actorById.get(match.sourceActorId);
  const target = index.actorById.get(match.targetActorId);
  const srcFac = resource && index.facilityById.get(resource.facilityId);
  const tgtFac = need && index.facilityById.get(need.facilityId);
  if (!resource || !need || !source || !target || !srcFac || !tgtFac) return null;

  const cat = CATEGORY_LABELS[resource.category].toLowerCase();
  const profile = DISTANCE_PROFILES[resource.category];
  const level = match.score >= 75 ? 'hög' : match.score >= 55 ? 'måttlig' : 'låg';

  const summary =
    match.status === 'rejected'
      ? `${source.name} har ${cat} (${resource.material.toLowerCase()}) och ${target.name} har ett behov inom samma område, men matchningen bedöms inte som genomförbar i nuläget på grund av ${match.blockers.length} hinder. Indikativ matchningspotential: ${match.score}/100.`
      : `${source.name} i ${source.municipality} har ${cat} (${resource.material.toLowerCase()}, ${fmtQty(resource.quantity, resource.unit)}) som potentiellt kan möta ${target.name}s behov av ${need.material.toLowerCase()} i ${target.municipality}. Avståndet är ${formatKm(match.distanceKm)} fågelväg. Den indikativa matchningspotentialen är ${level} (${match.score}/100) och status är "${MATCH_STATUS_LABELS[match.status].toLowerCase()}".`;

  const technical: string[] = [
    `Resursens egenskaper: ${resource.classification.length ? resource.classification.map((t) => TAG_LABELS[t].toLowerCase()).join(', ') : 'inga angivna'}.`,
    `Mottagarens tekniska krav: ${need.technicalRequirements.length ? need.technicalRequirements.map((t) => TAG_LABELS[t].toLowerCase()).join(', ') : 'inga angivna'}.`,
    `Materialkvalitet: ${QUALITY_LABELS[resource.quality].toLowerCase()}. Tillgänglighet: ${AVAILABILITY_LABELS[resource.availability].toLowerCase()}.`,
  ];
  if (need.minTemperatureC != null) {
    technical.push(`Temperatur: resurs ${resource.temperatureC ?? 'okänd'} °C, krav minst ${need.minTemperatureC} °C.`);
  }
  technical.push(
    `Datakvalitet: resursen är ${VERIFICATION_LABELS[resource.verificationStatus].toLowerCase()}, behovet är ${VERIFICATION_LABELS[need.verificationStatus].toLowerCase()}.`,
  );

  const geographic = [
    `Avstånd mellan ${srcFac.name} och ${tgtFac.name}: ${formatKm(match.distanceKm)} fågelväg (Haversine). Faktiskt vägavstånd är normalt 20–40 % längre.`,
    `För ${cat} bedöms upp till ${profile.idealKm} km som idealt och ${profile.maxKm} km som övre gräns – ${profile.note}.`,
    match.distanceKm <= profile.idealKm
      ? 'Avståndet ligger inom idealintervallet.'
      : match.distanceKm <= profile.maxKm
        ? 'Avståndet är acceptabelt men påverkar transportekonomin.'
        : 'Avståndet överstiger den rimliga gränsen för kategorin.',
  ];

  const benefits: string[] = [];
  if (resource.quantity != null && need.requiredQuantity != null && resource.unit === need.unit) {
    const covered = Math.min(resource.quantity, need.requiredQuantity);
    benefits.push(`Indikativt flöde: upp till ${fmtQty(covered, resource.unit)} som kan gå från restström till råvara.`);
  }
  if (resource.category === 'waste_heat') benefits.push('Mottagaren kan minska egen värmeproduktion och leverantören får avsättning för värme som annars kyls bort.');
  else if (resource.category === 'process_water') benefits.push('Minskat uttag av dricksvatten och minskad belastning på avloppsreningen.');
  else benefits.push(`Leverantören kan minska kostnader för avfallshantering och mottagaren får en lokal råvara.`);
  benefits.push('Kortare och mer lokala materialflöden stärker regional resiliens.');
  benefits.push('Nyttan är indikativ och behöver kvantifieras i dialog med aktörerna.');

  const obstacles = [...match.blockers.map((b) => `Hinder: ${b}`), ...match.uncertainties.map((u) => `Osäkerhet: ${u}`)];
  if (obstacles.length === 0) obstacles.push('Inga specifika hinder har identifierats utifrån registrerade uppgifter. Transportekonomi och avtalsform behöver ändå utredas.');

  const dialogQuestions = [
    {
      to: source.name,
      questions: [
        `Hur stor är den faktiska årsvolymen ${cat} och hur varierar den över året?`,
        'Hur hanteras restströmmen idag och vad kostar det?',
        'Finns det analysdata eller provmaterial som kan delas?',
        'Vilka krav har ni på hämtning, lagring och avtalslängd?',
      ],
    },
    {
      to: target.name,
      questions: [
        `Vilka tekniska krav måste ${need.material.toLowerCase()} uppfylla?`,
        'Vilken volym och leveransfrekvens behöver ni?',
        'Vad betalar ni idag för motsvarande råvara eller energi?',
        'Finns det tillstånd eller certifieringar som påverkar mottagandet?',
      ],
    },
  ];

  return {
    title: `${source.name} → ${target.name}`,
    summary,
    why: match.reasons,
    technical,
    geographic,
    benefits,
    obstacles,
    nextSteps: match.nextSteps,
    dialogQuestions,
  };
}
