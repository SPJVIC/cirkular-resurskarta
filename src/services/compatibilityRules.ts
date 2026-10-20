import type { PropertyTag, ResourceCategory } from '../types';

/**
 * Explicita kompatibilitetsregler: vilka resurskategorier kan möta ett behov
 * i en viss kategori, med vilken grad av passform (0–1) och för vilket användningsområde.
 * Kategorier som inte finns i listan är inkompatibla och kan aldrig matchas.
 */
export interface CompatibilityRule {
  resource: ResourceCategory;
  fit: number;
  use: string;
}

export const NEED_ACCEPTS: Record<ResourceCategory, CompatibilityRule[]> = {
  wood_waste: [
    { resource: 'wood_waste', fit: 1, use: 'Träspillet kan användas direkt som biobränsle eller flisråvara.' },
    { resource: 'bark', fit: 0.6, use: 'Bark kan eldas tillsammans med flis men har högre fukt- och askhalt.' },
  ],
  sawdust: [
    { resource: 'sawdust', fit: 1, use: 'Spånet kan användas direkt som råvara (pellets/strö).' },
  ],
  bark: [
    { resource: 'bark', fit: 1, use: 'Barken kan användas direkt som bränsle eller jordförbättring.' },
  ],
  plastic_waste: [{ resource: 'plastic_waste', fit: 1, use: 'Plastspillet kan materialåtervinnas till regranulat.' }],
  metal_scrap: [{ resource: 'metal_scrap', fit: 1, use: 'Metallskrotet kan sorteras och återföras till smältverk.' }],
  waste_heat: [{ resource: 'waste_heat', fit: 1, use: 'Spillvärmen kan ersätta egen värmeproduktion hos mottagaren.' }],
  process_water: [{ resource: 'process_water', fit: 1, use: 'Vattnet kan ersätta dricksvatten i användningar som inte kräver dricksvattenkvalitet.' }],
  packaging: [{ resource: 'packaging', fit: 1, use: 'Förpackningsmaterialet kan återbrukas eller bli returfiber.' }],
  organic: [{ resource: 'organic', fit: 1, use: 'Den organiska restströmmen kan användas som substrat eller foder.' }],
  textile: [{ resource: 'textile', fit: 1, use: 'Textilspillet kan återvinnas till fiber eller återbrukas.' }],
};

export function findRule(needCategory: ResourceCategory, resourceCategory: ResourceCategory) {
  return NEED_ACCEPTS[needCategory].find((r) => r.resource === resourceCategory) ?? null;
}

/**
 * Avståndsprofil per resurskategori. Inom idealKm ges full poäng, därefter avtar poängen
 * linjärt till noll vid maxKm. Längre än maxKm räknas som ett hinder.
 * Spillvärme är mycket avståndskänsligt (kräver kulvert), metallskrot tål långa transporter.
 */
export const DISTANCE_PROFILES: Record<ResourceCategory, { idealKm: number; maxKm: number; note: string }> = {
  waste_heat: { idealKm: 1.5, maxKm: 5, note: 'kräver ledningsdragning; värmeförluster och kulvertkostnad ökar snabbt med avståndet' },
  process_water: { idealKm: 3, maxKm: 15, note: 'kräver ledning eller tankbil; låg värde per volym' },
  organic: { idealKm: 20, maxKm: 80, note: 'tungt, fuktigt material med lågt värde per ton' },
  bark: { idealKm: 25, maxKm: 100, note: 'skrymmande bulkgods med lågt värde per ton' },
  sawdust: { idealKm: 30, maxKm: 120, note: 'skrymmande bulkgods' },
  wood_waste: { idealKm: 30, maxKm: 120, note: 'bulkgods som transporteras med flisbil' },
  packaging: { idealKm: 40, maxKm: 200, note: 'kan balas för effektivare transport' },
  plastic_waste: { idealKm: 50, maxKm: 250, note: 'kan balas eller malas; högre värde per ton' },
  textile: { idealKm: 60, maxKm: 300, note: 'lätt att samlasta' },
  metal_scrap: { idealKm: 80, maxKm: 300, note: 'högt värde per ton, transporteras ofta långt' },
};

/** Motpoler för egenskapstaggar. En resurs med motpolen till ett krav uppfyller inte kravet. */
export const OPPOSITE_TAG: Record<PropertyTag, PropertyTag> = {
  untreated: 'treated',
  treated: 'untreated',
  dry: 'wet',
  wet: 'dry',
  sorted: 'mixed',
  mixed: 'sorted',
  clean: 'contaminated',
  contaminated: 'clean',
  food_grade: 'not_food_grade',
  not_food_grade: 'food_grade',
};

/** Materialkänsliga kategorier där exakt materialtyp avgör om en matchning fungerar. */
const MATERIAL_PATTERNS: Partial<Record<ResourceCategory, Record<string, RegExp>>> = {
  plastic_waste: {
    PP: /\bPP\b|polypropen/i,
    PE: /\bPE\b|LDPE|HDPE|polyeten/i,
    PET: /\bPET\b/,
    ABS: /\bABS\b/,
    PA: /\bPA\b|polyamid/i,
    PS: /\bPS\b|polystyren/i,
    BLAND: /blandplast|osorterad/i,
  },
  metal_scrap: {
    Stål: /stål/i,
    Aluminium: /alumin/i,
    Koppar: /koppar/i,
    Mässing: /mässing/i,
  },
};

export function isMaterialSensitive(category: ResourceCategory): boolean {
  return category in MATERIAL_PATTERNS;
}

export function materialTokens(category: ResourceCategory, text: string): string[] {
  const patterns = MATERIAL_PATTERNS[category];
  if (!patterns) return [];
  return Object.entries(patterns)
    .filter(([, re]) => re.test(text))
    .map(([token]) => token);
}
