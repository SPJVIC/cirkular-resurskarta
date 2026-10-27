// Datamodell för Cirkulär Resurskarta.
// Entiteterna är separerade (aktör → arbetsställe → resurs/behov) så att
// riktiga källor (t.ex. SCB:s företagsregister, PostGIS) kan anslutas senare.

export type ActorType = 'company' | 'public' | 'association';

export type Municipality =
  | 'Aneby'
  | 'Eksjö'
  | 'Gislaved'
  | 'Gnosjö'
  | 'Habo'
  | 'Jönköping'
  | 'Mullsjö'
  | 'Nässjö'
  | 'Sävsjö'
  | 'Tranås'
  | 'Vaggeryd'
  | 'Vetlanda'
  | 'Värnamo';

export type ResourceCategory =
  | 'wood_waste'
  | 'sawdust'
  | 'bark'
  | 'plastic_waste'
  | 'metal_scrap'
  | 'waste_heat'
  | 'process_water'
  | 'packaging'
  | 'organic'
  | 'textile';

export type Unit = 'ton/år' | 'MWh/år' | 'm³/år';

export type Quality = 'high' | 'medium' | 'low' | 'unknown';

export type Availability = 'continuous' | 'seasonal' | 'batch' | 'one_off';

/** Resursstatus: om flödet finns tillgängligt idag, är planerat eller redan avtalat. */
export type ResourceStatus = 'available' | 'planned' | 'committed';

export type VerificationStatus = 'unverified' | 'self_reported' | 'verified';

/** Varifrån uppgiften kommer. */
export type DataSource = 'demo' | 'user' | 'inference';

/**
 * Egenskapstaggar som beskriver en resurs (classification) eller krävs av ett
 * behov (technicalRequirements). Taggarna har motpoler, se compatibilityRules.
 */
export type PropertyTag =
  | 'untreated'
  | 'treated'
  | 'dry'
  | 'wet'
  | 'sorted'
  | 'mixed'
  | 'clean'
  | 'contaminated'
  | 'food_grade'
  | 'not_food_grade';

export interface Actor {
  id: string;
  name: string;
  actorType: ActorType;
  industry: string;
  description: string;
  municipality: Municipality;
  employeeRange: string;
  source: DataSource;
}

export interface Facility {
  id: string;
  actorId: string;
  name: string;
  latitude: number;
  longitude: number;
  processes: string[];
}

export interface Resource {
  id: string;
  facilityId: string;
  category: ResourceCategory;
  material: string;
  description: string;
  /** null = okänd mängd */
  quantity: number | null;
  unit: Unit;
  quality: Quality;
  availability: Availability;
  classification: PropertyTag[];
  /** Endast relevant för spillvärme */
  temperatureC?: number | null;
  status: ResourceStatus;
  verificationStatus: VerificationStatus;
  source: DataSource;
  updatedAt: string;
}

export interface Need {
  id: string;
  facilityId: string;
  category: ResourceCategory;
  material: string;
  description: string;
  requiredQuantity: number | null;
  unit: Unit;
  technicalRequirements: PropertyTag[];
  /** Endast relevant för spillvärme */
  minTemperatureC?: number | null;
  /** Mottagarens egen gräns för transportavstånd (valfri) */
  maxDistanceKm?: number | null;
  verificationStatus: VerificationStatus;
  source: DataSource;
  updatedAt: string;
}

export type MatchStatus = 'potential' | 'needs_verification' | 'rejected';

export interface ScoreBreakdown {
  compatibility: number; // 0–30
  quality: number; // 0–10
  volume: number; // 0–15
  availability: number; // 0–10
  distance: number; // 0–25
  dataQuality: number; // 0–10
}

export interface Match {
  id: string;
  sourceResourceId: string;
  targetNeedId: string;
  sourceActorId: string;
  targetActorId: string;
  score: number;
  breakdown: ScoreBreakdown;
  distanceKm: number;
  reasons: string[];
  uncertainties: string[];
  blockers: string[];
  nextSteps: string[];
  status: MatchStatus;
}

export interface DataState {
  actors: Actor[];
  facilities: Facility[];
  resources: Resource[];
  needs: Need[];
}

export type FlowFilter = 'all' | 'offer' | 'need';

export interface DistanceFilter {
  label: string;
  latitude: number;
  longitude: number;
  km: number;
}

export interface Filters {
  search: string;
  municipality: Municipality | '';
  industry: string;
  actorType: ActorType | '';
  resourceCategory: ResourceCategory | '';
  flow: FlowFilter;
  resourceStatus: ResourceStatus | '';
  verificationStatus: VerificationStatus | '';
  distance: DistanceFilter | null;
}

export type MarkerKind = 'resources' | 'needs' | 'both' | 'unmapped';

// Konton och behörighet (simulerat i demon – ingen server)

export type AccountRole = 'admin' | 'member';

/** pending = väntar på admin, approved = får redigera, rejected = avvisad/återkallad */
export type AccountStatus = 'pending' | 'approved' | 'rejected';

export interface Account {
  id: string;
  name: string;
  email: string;
  organisation: string;
  /** Meddelande till admin vid registrering */
  message: string;
  /** Demo-hash, inte säker – se services/auth.ts */
  passwordHash: string;
  role: AccountRole;
  status: AccountStatus;
  /** Aktören som kontot får redigera. null = ingen kopplad ännu. */
  actorId: string | null;
  createdAt: string;
}
