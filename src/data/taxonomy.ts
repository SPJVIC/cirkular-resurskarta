import type {
  ActorType,
  Availability,
  MarkerKind,
  MatchStatus,
  Municipality,
  PropertyTag,
  Quality,
  ResourceCategory,
  ResourceStatus,
  Unit,
  VerificationStatus,
} from '../types';

export const MUNICIPALITIES: Municipality[] = [
  'Aneby',
  'Eksjö',
  'Gislaved',
  'Gnosjö',
  'Habo',
  'Jönköping',
  'Mullsjö',
  'Nässjö',
  'Sävsjö',
  'Tranås',
  'Vaggeryd',
  'Vetlanda',
  'Värnamo',
];

export interface Place {
  name: string;
  municipality: Municipality;
  latitude: number;
  longitude: number;
  /** Centralort för kommunen */
  isSeat?: boolean;
}

/** Verkliga orter i Jönköpings län med ungefärliga koordinater (lokal tabell – ingen geokodning). */
export const PLACES: Place[] = [
  { name: 'Aneby', municipality: 'Aneby', latitude: 57.837, longitude: 14.811, isSeat: true },
  { name: 'Eksjö', municipality: 'Eksjö', latitude: 57.667, longitude: 14.97, isSeat: true },
  { name: 'Mariannelund', municipality: 'Eksjö', latitude: 57.617, longitude: 15.567 },
  { name: 'Gislaved', municipality: 'Gislaved', latitude: 57.304, longitude: 13.542, isSeat: true },
  { name: 'Anderstorp', municipality: 'Gislaved', latitude: 57.283, longitude: 13.634 },
  { name: 'Smålandsstenar', municipality: 'Gislaved', latitude: 57.163, longitude: 13.407 },
  { name: 'Reftele', municipality: 'Gislaved', latitude: 57.18, longitude: 13.588 },
  { name: 'Gnosjö', municipality: 'Gnosjö', latitude: 57.358, longitude: 13.738, isSeat: true },
  { name: 'Hillerstorp', municipality: 'Gnosjö', latitude: 57.312, longitude: 13.881 },
  { name: 'Habo', municipality: 'Habo', latitude: 57.907, longitude: 14.074, isSeat: true },
  { name: 'Jönköping', municipality: 'Jönköping', latitude: 57.7826, longitude: 14.1618, isSeat: true },
  { name: 'Huskvarna', municipality: 'Jönköping', latitude: 57.786, longitude: 14.302 },
  { name: 'Bankeryd', municipality: 'Jönköping', latitude: 57.86, longitude: 14.125 },
  { name: 'Taberg', municipality: 'Jönköping', latitude: 57.68, longitude: 14.085 },
  { name: 'Gränna', municipality: 'Jönköping', latitude: 58.025, longitude: 14.462 },
  { name: 'Mullsjö', municipality: 'Mullsjö', latitude: 57.917, longitude: 13.879, isSeat: true },
  { name: 'Nässjö', municipality: 'Nässjö', latitude: 57.653, longitude: 14.697, isSeat: true },
  { name: 'Bodafors', municipality: 'Nässjö', latitude: 57.504, longitude: 14.69 },
  { name: 'Forserum', municipality: 'Nässjö', latitude: 57.699, longitude: 14.471 },
  { name: 'Sävsjö', municipality: 'Sävsjö', latitude: 57.403, longitude: 14.664, isSeat: true },
  { name: 'Vrigstad', municipality: 'Sävsjö', latitude: 57.352, longitude: 14.467 },
  { name: 'Tranås', municipality: 'Tranås', latitude: 58.037, longitude: 14.975, isSeat: true },
  { name: 'Vaggeryd', municipality: 'Vaggeryd', latitude: 57.498, longitude: 14.146, isSeat: true },
  { name: 'Skillingaryd', municipality: 'Vaggeryd', latitude: 57.432, longitude: 14.092 },
  { name: 'Vetlanda', municipality: 'Vetlanda', latitude: 57.428, longitude: 15.079, isSeat: true },
  { name: 'Ekenässjön', municipality: 'Vetlanda', latitude: 57.48, longitude: 15.03 },
  { name: 'Holsbybrunn', municipality: 'Vetlanda', latitude: 57.433, longitude: 15.233 },
  { name: 'Värnamo', municipality: 'Värnamo', latitude: 57.186, longitude: 14.04, isSeat: true },
  { name: 'Bor', municipality: 'Värnamo', latitude: 57.11, longitude: 14.17 },
  { name: 'Rydaholm', municipality: 'Värnamo', latitude: 56.983, longitude: 14.283 },
];

export const MUNICIPALITY_SEATS: Record<Municipality, Place> = Object.fromEntries(
  PLACES.filter((p) => p.isSeat).map((p) => [p.municipality, p]),
) as Record<Municipality, Place>;

/** Länets ungefärliga utbredning – används för kartans startvy och datavalidering. */
export const COUNTY_BOUNDS = { south: 56.9, north: 58.2, west: 13.2, east: 15.7 };
export const MAP_CENTER: [number, number] = [57.55, 14.35];

export const ACTOR_TYPE_LABELS: Record<ActorType, string> = {
  company: 'Företag',
  public: 'Offentlig aktör',
  association: 'Förening',
};

export const INDUSTRIES = [
  'Träindustri',
  'Metallbearbetning',
  'Plastindustri',
  'Livsmedelsproduktion',
  'Förpackningsindustri',
  'Logistik',
  'Lantbruk',
  'Energiförsörjning',
  'Återvinning',
  'Byggmaterial',
  'Textilindustri',
  'Ytbehandling',
  'Kommunal verksamhet',
];

export const EMPLOYEE_RANGES = ['1–9', '10–49', '50–199', '200+'];

export const CATEGORY_LABELS: Record<ResourceCategory, string> = {
  wood_waste: 'Träspill',
  sawdust: 'Sågspån',
  bark: 'Bark',
  plastic_waste: 'Plastspill',
  metal_scrap: 'Metallskrot',
  waste_heat: 'Spillvärme',
  process_water: 'Processvatten',
  packaging: 'Förpackningsmaterial',
  organic: 'Organiska restströmmar',
  textile: 'Textilspill',
};

export const CATEGORIES = Object.keys(CATEGORY_LABELS) as ResourceCategory[];

export const DEFAULT_UNIT: Record<ResourceCategory, Unit> = {
  wood_waste: 'ton/år',
  sawdust: 'ton/år',
  bark: 'ton/år',
  plastic_waste: 'ton/år',
  metal_scrap: 'ton/år',
  waste_heat: 'MWh/år',
  process_water: 'm³/år',
  packaging: 'ton/år',
  organic: 'ton/år',
  textile: 'ton/år',
};

export const UNITS: Unit[] = ['ton/år', 'MWh/år', 'm³/år'];

export const QUALITY_LABELS: Record<Quality, string> = {
  high: 'Hög',
  medium: 'Medel',
  low: 'Låg',
  unknown: 'Okänd',
};

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  continuous: 'Kontinuerlig',
  seasonal: 'Säsongsvis',
  batch: 'Batchvis',
  one_off: 'Engångsparti',
};

export const RESOURCE_STATUS_LABELS: Record<ResourceStatus, string> = {
  available: 'Tillgänglig',
  planned: 'Planerad',
  committed: 'Redan avtalad',
};

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  unverified: 'Ej verifierad',
  self_reported: 'Egenrapporterad',
  verified: 'Verifierad',
};

export const TAG_LABELS: Record<PropertyTag, string> = {
  untreated: 'Obehandlat',
  treated: 'Behandlat/lackat',
  dry: 'Torrt',
  wet: 'Fuktigt',
  sorted: 'Sorterad fraktion',
  mixed: 'Blandad fraktion',
  clean: 'Rent',
  contaminated: 'Förorenat',
  food_grade: 'Livsmedels-/foderkvalitet',
  not_food_grade: 'Ej livsmedelskvalitet',
};

export const TAGS = Object.keys(TAG_LABELS) as PropertyTag[];

export const MARKER_COLORS: Record<MarkerKind, string> = {
  resources: '#f97316',
  needs: '#3b82f6',
  both: '#16a34a',
  unmapped: '#9ca3af',
};

export const MARKER_LABELS: Record<MarkerKind, string> = {
  resources: 'Tillgängliga resurser',
  needs: 'Identifierade behov',
  both: 'Resurser och behov',
  unmapped: 'Ännu ej kartlagd',
};

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  potential: 'Möjlig matchning',
  needs_verification: 'Kräver verifiering',
  rejected: 'Avvisad',
};

export const DEMO_LABEL = 'Demo – syntetiska företags- och resursdata';
