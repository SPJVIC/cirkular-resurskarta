import type { Filters, ResourceCategory } from '../types';
import { CATEGORY_LABELS, PLACES } from '../data/taxonomy';

/**
 * Regelbaserad tolkning av sökfrågor på svenska till strukturerade filter.
 * Ingen språkmodell används – frågan tolkas med nyckelord och reguljära uttryck.
 */

export type ParseResult =
  | { ok: true; filters: Partial<Filters>; interpretation: string[] }
  | { ok: false; message: string };

const CATEGORY_KEYWORDS: [RegExp, ResourceCategory][] = [
  [/sågspån|kutterspån|\bspån/, 'sawdust'],
  [/träspill|träflis|\bflis|returträ|\bträ/, 'wood_waste'],
  [/\bbark/, 'bark'],
  [/spillvärme|\bvärme\b/, 'waste_heat'],
  [/processvatten|kylvatten|\bvatten/, 'process_water'],
  [/plast|\bpp\b|\bpe\b|polypropen|polyeten/, 'plastic_waste'],
  [/metall|skrot|\bstål|alumin/, 'metal_scrap'],
  [/förpackning|wellpapp|kartong|emballage/, 'packaging'],
  [/organisk|matavfall|vassle|livsmedelsrester|biogassubstrat/, 'organic'],
  [/textil|\btyg/, 'textile'],
];

const NEED_WORDS = /kan använda|använder|behöver|behov|söker|tar emot|vill ha|köpa|efterfrågar|mottagare/;
const OFFER_WORDS = /\bhar\b|erbjuder|levererar|tillgänglig|överskott|restström|säljer|producerar|genererar|blir över|leverantör/;

export const EXAMPLE_QUERIES = [
  'Visa företag inom 30 km från Värnamo som kan använda träspill',
  'Vilka har spillvärme i Vetlanda?',
  'Aktörer inom 5 mil från Jönköping som erbjuder plast',
  'Behov av sågspån i Nässjö',
];

export function parseQuery(input: string): ParseResult {
  const text = input.trim().toLowerCase();
  if (!text) return { ok: false, message: 'Skriv en fråga, till exempel: "' + EXAMPLE_QUERIES[0] + '".' };

  const filters: Partial<Filters> = {};
  const interpretation: string[] = [];

  // Plats – längsta ortnamn först så att t.ex. "Smålandsstenar" vinner över kortare träffar
  const place = [...PLACES].sort((a, b) => b.name.length - a.name.length).find((p) => text.includes(p.name.toLowerCase()));

  // Avstånd
  const dm = text.match(/(\d+(?:[.,]\d+)?)\s*(km|kilometer|mil)\b/);
  const km = dm ? parseFloat(dm[1].replace(',', '.')) * (dm[2] === 'mil' ? 10 : 1) : null;

  if (km != null && place) {
    filters.distance = { label: place.name, latitude: place.latitude, longitude: place.longitude, km };
    interpretation.push(`Inom ${km} km fågelväg från ${place.name}`);
  } else if (place) {
    filters.municipality = place.municipality;
    interpretation.push(`Kommun: ${place.municipality}${place.isSeat ? '' : ` (utifrån orten ${place.name})`}`);
  } else if (km != null) {
    return { ok: false, message: `Avståndet ${km} km uppfattades, men ingen ort i Jönköpings län hittades. Ange t.ex. "från Värnamo".` };
  }

  // Resurstyp
  const cat = CATEGORY_KEYWORDS.find(([re]) => re.test(text))?.[1];
  if (cat) {
    filters.resourceCategory = cat;
    interpretation.push(`Resurstyp: ${CATEGORY_LABELS[cat]}`);
  }

  // Erbjudande eller behov
  if (NEED_WORDS.test(text)) {
    filters.flow = 'need';
    interpretation.push('Aktörer med behov (mottagare)');
  } else if (OFFER_WORDS.test(text)) {
    filters.flow = 'offer';
    interpretation.push('Aktörer som erbjuder resursen (leverantörer)');
  }

  if (/kommunal|offentlig/.test(text)) {
    filters.actorType = 'public';
    interpretation.push('Aktörstyp: Offentlig aktör');
  }

  if (interpretation.length === 0) {
    return {
      ok: false,
      message: 'Frågan kunde inte tolkas. Ange en ort, ett avstånd, en resurstyp eller om du söker leverantörer eller mottagare.',
    };
  }
  return { ok: true, filters, interpretation };
}
