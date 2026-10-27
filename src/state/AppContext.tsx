import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { DataState, Filters, Match, Need, Resource } from '../types';
import { getSeedData } from '../data/seed';
import { buildIndex, EMPTY_FILTERS, type DataIndex } from '../services/filtering';
import { isViable, runMatching } from '../services/matchingEngine';
import { clearState, loadState, saveState } from '../services/storage';
import * as store from '../services/dataStore';
import { canCreateActor, canEditActor, isAdmin, ownActorId } from '../services/auth';
import { useAuth } from './AuthContext';

/** Vad högerpanelen redigerar just nu. Positionen hålls separat i `draft`. */
export type Editor =
  | { kind: 'actor-create' }
  | { kind: 'actor-edit'; actorId: string }
  | { kind: 'facility-create'; actorId: string }
  | { kind: 'facility-edit'; facilityId: string };

export interface DraftLocation {
  latitude: number;
  longitude: number;
}

export interface Toast {
  id: number;
  message: string;
  tone: 'success' | 'info' | 'error';
}

interface AppContextValue {
  data: DataState;
  index: DataIndex;
  matches: Match[];
  viableMatches: Match[];

  // Behörighet för inloggat konto (besökare kan bara se och söka)
  canEdit: (actorId: string) => boolean;
  canCreate: boolean;
  isAdmin: boolean;
  /** Det inloggade kontots egen aktör, om någon */
  ownActorId: string | null;

  // Mutationer – varje ändring sparas och matchningsmotorn körs om automatiskt
  createActor: (actor: store.ActorInput, facility: store.FacilityInput) => string;
  updateActor: (id: string, patch: Partial<store.ActorInput>, facility?: { id: string; patch: Partial<store.FacilityInput> }) => void;
  deleteActor: (id: string) => void;
  addFacility: (actorId: string, facility: store.FacilityInput) => void;
  updateFacility: (id: string, patch: Partial<store.FacilityInput>) => void;
  deleteFacility: (id: string) => void;
  saveResource: (r: Resource) => void;
  deleteResource: (id: string) => void;
  saveNeed: (n: Need) => void;
  deleteNeed: (id: string) => void;
  resetData: () => void;

  // UI-tillstånd som delas mellan vyer
  filters: Filters;
  setFilters: (f: Filters) => void;
  selectedActorId: string | null;
  selectActor: (id: string | null) => void;
  collabActorId: string | null;
  setCollabActorId: (id: string | null) => void;
  focusedMatchId: string | null;
  setFocusedMatchId: (id: string | null) => void;
  analysisMatchId: string | null;
  openAnalysis: (id: string | null) => void;
  editor: Editor | null;
  setEditor: (e: Editor | null) => void;
  draft: DraftLocation | null;
  setDraft: (d: DraftLocation | null) => void;
  toasts: Toast[];
  notify: (message: string, tone?: Toast['tone']) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children, initialData }: { children: ReactNode; initialData?: DataState }) {
  const [data, setData] = useState<DataState>(() => initialData ?? loadState() ?? getSeedData());
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  const [collabActorId, setCollabActorId] = useState<string | null>(null);
  const [focusedMatchId, setFocusedMatchId] = useState<string | null>(null);
  const [analysisMatchId, openAnalysis] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [draft, setDraft] = useState<DraftLocation | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
  const { account, setActor } = useAuth();

  useEffect(() => {
    saveState(data);
  }, [data]);

  const index = useMemo(() => buildIndex(data), [data]);
  const matches = useMemo(() => runMatching(data), [data]);
  const viableMatches = useMemo(() => matches.filter(isViable), [matches]);

  const notify = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  /** Sparar nytt tillstånd och rapporterar hur matchningarna påverkades. */
  const commit = useCallback(
    (next: DataState, message: string) => {
      const before = viableMatches.length;
      const after = runMatching(next).filter(isViable).length;
      setData(next);
      const diff = after === before ? 'oförändrat antal matchningar' : `matchningar ${before} → ${after}`;
      notify(`${message} · ${diff}`);
    },
    [viableMatches.length, notify],
  );

  const canEdit = (actorId: string | undefined) => !!actorId && canEditActor(account, actorId, data);
  const facilityActor = (facilityId: string) => index.facilityById.get(facilityId)?.actorId;
  const resourceActor = (id: string) => {
    const r = index.resourceById.get(id);
    return r && facilityActor(r.facilityId);
  };
  const needActor = (id: string) => {
    const n = data.needs.find((x) => x.id === id);
    return n && facilityActor(n.facilityId);
  };
  /** Spärr i datalagret – knapparna döljs också i gränssnittet, men det här gäller oavsett. */
  const guard = (ok: boolean) => {
    if (!ok) notify('Du saknar behörighet att ändra den här aktören', 'error');
    return ok;
  };

  const value: AppContextValue = {
    data,
    index,
    matches,
    viableMatches,
    canEdit,
    canCreate: canCreateActor(account, data),
    isAdmin: isAdmin(account),
    ownActorId: ownActorId(account, data),
    createActor: (actor, facility) => {
      if (!guard(canCreateActor(account, data))) return '';
      const res = store.createActor(data, actor, facility);
      commit(res.state, `${actor.name} har lagts till på kartan`);
      if (account && !isAdmin(account)) setActor(account.id, res.actorId);
      return res.actorId;
    },
    updateActor: (id, patch, facility) => {
      if (!guard(canEdit(id) && (!facility || canEdit(facilityActor(facility.id))))) return;
      let next = store.updateActor(data, id, patch);
      if (facility) next = store.updateFacility(next, facility.id, facility.patch);
      commit(next, 'Aktören har uppdaterats');
    },
    deleteActor: (id) => {
      if (!guard(canEdit(id))) return;
      const name = index.actorById.get(id)?.name ?? 'Aktören';
      if (selectedActorId === id) setSelectedActorId(null);
      if (collabActorId === id) setCollabActorId(null);
      commit(store.deleteActor(data, id), `${name} har tagits bort`);
    },
    addFacility: (actorId, facility) => guard(canEdit(actorId)) && commit(store.addFacility(data, actorId, facility).state, 'Arbetsstället har lagts till'),
    updateFacility: (id, patch) => guard(canEdit(facilityActor(id))) && commit(store.updateFacility(data, id, patch), 'Arbetsstället har uppdaterats'),
    deleteFacility: (id) => guard(canEdit(facilityActor(id))) && commit(store.deleteFacility(data, id), 'Arbetsstället har tagits bort'),
    saveResource: (r) => {
      const isNew = !index.resourceById.has(r.id);
      if (!guard(canEdit(facilityActor(r.facilityId)) && (isNew || canEdit(resourceActor(r.id))))) return;
      commit(store.upsertResource(data, r), 'Resursen har sparats');
    },
    deleteResource: (id) => guard(canEdit(resourceActor(id))) && commit(store.deleteResource(data, id), 'Resursen har tagits bort'),
    saveNeed: (n) => {
      const isNew = !data.needs.some((x) => x.id === n.id);
      if (!guard(canEdit(facilityActor(n.facilityId)) && (isNew || canEdit(needActor(n.id))))) return;
      commit(store.upsertNeed(data, n), 'Behovet har sparats');
    },
    deleteNeed: (id) => guard(canEdit(needActor(id))) && commit(store.deleteNeed(data, id), 'Behovet har tagits bort'),
    resetData: () => {
      if (!guard(isAdmin(account))) return;
      clearState();
      setData(getSeedData());
      setSelectedActorId(null);
      setCollabActorId(null);
      setFocusedMatchId(null);
      setEditor(null);
      setDraft(null);
      setFilters(EMPTY_FILTERS);
      notify('Demonstrationsdata har återställts', 'info');
    },
    filters,
    setFilters,
    selectedActorId,
    selectActor: (id) => {
      setSelectedActorId(id);
      if (id !== collabActorId) {
        setCollabActorId(null);
        setFocusedMatchId(null);
      }
    },
    collabActorId,
    setCollabActorId,
    focusedMatchId,
    setFocusedMatchId,
    analysisMatchId,
    openAnalysis,
    editor,
    setEditor,
    draft,
    setDraft,
    toasts,
    notify,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp måste användas inom AppProvider');
  return ctx;
}
