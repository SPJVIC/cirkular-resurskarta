import type { Actor, Facility, PropertyTag, Resource, ResourceCategory, Unit } from '../types';
import { CATEGORY_LABELS, DEFAULT_UNIT } from '../data/taxonomy';

/**
 * SIMULERAD AI – regelbaserad identifiering av sannolika restströmmar.
 *
 * Inferensen är isolerad bakom gränssnittet ResourceInferenceProvider så att den
 * senare kan ersättas med ett riktigt LLM-anrop (t.ex. Azure OpenAI) som returnerar
 * samma struktur. Ingen extern tjänst anropas här.
 */

export interface InferenceInput {
  actor: Actor;
  facilities: Facility[];
  existingResources: Resource[];
}

export interface ResourceSuggestion {
  id: string;
  facilityId: string;
  category: ResourceCategory;
  material: string;
  description: string;
  unit: Unit;
  classification: PropertyTag[];
  /** Vilka ord i verksamhetsbeskrivningen eller processerna som utlöste förslaget */
  matchedKeywords: string[];
  motivation: string;
  confidence: 'låg' | 'medel' | 'hög';
}

export interface ResourceInferenceProvider {
  readonly name: string;
  readonly isSimulated: boolean;
  infer(input: InferenceInput): ResourceSuggestion[];
}

interface KnowledgeRule {
  keywords: string[];
  process: string;
  yields: { category: ResourceCategory; material: string; classification: PropertyTag[]; why: string }[];
}

/** Kunskapsmodell: process/nyckelord → typiska restströmmar. */
export const KNOWLEDGE_BASE: KnowledgeRule[] = [
  {
    keywords: ['sågverk', 'sågning', 'sågar'],
    process: 'Sågning',
    yields: [
      { category: 'sawdust', material: 'Sågspån', classification: ['untreated'], why: 'Sågning av timmer ger normalt 10–15 % sågspån.' },
      { category: 'bark', material: 'Bark', classification: ['untreated', 'wet'], why: 'Timmer barkas före sågning; barken blir en restström.' },
      { category: 'wood_waste', material: 'Träflis', classification: ['untreated'], why: 'Ytterbitar och kantribbor flisas ofta till träflis.' },
    ],
  },
  {
    keywords: ['tork', 'torkning', 'virkestork', 'kammartork'],
    process: 'Torkning',
    yields: [{ category: 'waste_heat', material: 'Spillvärme från tork', classification: [], why: 'Virkes- och produktionstorkar ventilerar ut fuktig varmluft som kan värmeåtervinnas.' }],
  },
  {
    keywords: ['hyvling', 'snickeri', 'cnc', 'kapning', 'möbel'],
    process: 'Träbearbetning',
    yields: [
      { category: 'wood_waste', material: 'Kapspill', classification: [], why: 'Kapning och bearbetning av virke ger kapbitar.' },
      { category: 'sawdust', material: 'Hyvel- och frässpån', classification: ['dry'], why: 'Hyvling och fräsning ger torrt spån som samlas i spåncyklon.' },
    ],
  },
  {
    keywords: ['gjuteri', 'smältning', 'smältugn', 'härdning', 'ugn'],
    process: 'Termiska processer',
    yields: [{ category: 'waste_heat', material: 'Spillvärme från ugnar', classification: [], why: 'Ugnar och smältverk avger stora mängder värme via kylkretsar och rökgaser.' }],
  },
  {
    keywords: ['svarvning', 'fräsning', 'stansning', 'bockning', 'plåt', 'svets'],
    process: 'Metallbearbetning',
    yields: [{ category: 'metal_scrap', material: 'Metallspill och spån', classification: [], why: 'Skärande bearbetning och stansning ger spån och stansrester.' }],
  },
  {
    keywords: ['formsprutning', 'extrudering', 'plast'],
    process: 'Plastbearbetning',
    yields: [{ category: 'plastic_waste', material: 'Plastspill (ingöt och kassation)', classification: [], why: 'Formsprutning ger ingöt, uppstartsspill och kassation.' }],
  },
  {
    keywords: ['mejeri', 'ystning', 'osttillverkning', 'slakt', 'bageri', 'centralkök', 'livsmedel'],
    process: 'Livsmedelsproduktion',
    yields: [
      { category: 'organic', material: 'Organiska produktionsrester', classification: ['wet'], why: 'Livsmedelsproduktion ger organiska restströmmar, t.ex. vassle eller kassation.' },
      { category: 'process_water', material: 'Disk- och sköljvatten', classification: [], why: 'Diskning av processutrustning ger stora vattenflöden.' },
    ],
  },
  {
    keywords: ['diskning', 'sköljning', 'förbehandling', 'tvätt'],
    process: 'Vattenintensiva processer',
    yields: [{ category: 'process_water', material: 'Processvatten', classification: [], why: 'Sköljning och tvätt ger processvatten som kan renas och återanvändas.' }],
  },
  {
    keywords: ['kylning', 'tryckluft', 'kompressor', 'kylanläggning', 'datacenter'],
    process: 'Kyl- och tryckluftsanläggningar',
    yields: [{ category: 'waste_heat', material: 'Spillvärme från kylning/tryckluft', classification: [], why: 'Kompressorer omvandlar största delen av tillförd el till värme som kan återvinnas.' }],
  },
  {
    keywords: ['lager', 'ompackning', 'distribution', 'kitting', 'omlastning'],
    process: 'Lager och logistik',
    yields: [{ category: 'packaging', material: 'Wellpapp och sträckfilm', classification: [], why: 'Inleveranser och ompackning ger emballage i form av wellpapp och plastfilm.' }],
  },
  {
    keywords: ['sömnad', 'tillskärning', 'konfektion', 'textil'],
    process: 'Textilproduktion',
    yields: [{ category: 'textile', material: 'Tillskärningsspill', classification: [], why: 'Tillskärning av tyg ger spill som kan fiberåtervinnas.' }],
  },
];

function normalize(s: string) {
  return s.toLowerCase();
}

export const ruleBasedInferenceProvider: ResourceInferenceProvider = {
  name: 'Regelbaserad kunskapsmodell (simulerad AI)',
  isSimulated: true,
  infer({ actor, facilities, existingResources }) {
    const facility = facilities[0];
    if (!facility) return [];
    const text = normalize([actor.description, actor.industry, ...facilities.flatMap((f) => f.processes)].join(' '));
    const existing = new Set(existingResources.map((r) => r.category));
    const byCategory = new Map<ResourceCategory, ResourceSuggestion>();

    for (const rule of KNOWLEDGE_BASE) {
      const hits = rule.keywords.filter((k) => text.includes(k));
      if (hits.length === 0) continue;
      for (const y of rule.yields) {
        if (existing.has(y.category)) continue;
        const prev = byCategory.get(y.category);
        if (prev) {
          prev.matchedKeywords = [...new Set([...prev.matchedKeywords, ...hits])];
          prev.motivation += ` ${y.why}`;
          prev.confidence = 'hög';
          continue;
        }
        byCategory.set(y.category, {
          id: `sug-${actor.id}-${y.category}`,
          facilityId: facility.id,
          category: y.category,
          material: y.material,
          description: `Föreslagen restström (${rule.process.toLowerCase()}). Mängd och kvalitet behöver uppskattas av företaget.`,
          unit: DEFAULT_UNIT[y.category],
          classification: y.classification,
          matchedKeywords: hits,
          motivation: y.why,
          confidence: hits.length > 1 ? 'hög' : 'medel',
        });
      }
    }
    return [...byCategory.values()];
  },
};

/** Gemensam ingång som UI:t använder. Byt provider här för att koppla in ett LLM. */
export function inferPotentialResources(input: InferenceInput, provider = ruleBasedInferenceProvider): ResourceSuggestion[] {
  return provider.infer(input);
}

export function suggestionLabel(s: ResourceSuggestion) {
  return `${CATEGORY_LABELS[s.category]} – ${s.material}`;
}
