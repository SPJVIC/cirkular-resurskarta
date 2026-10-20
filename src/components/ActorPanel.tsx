import { useState, type ReactNode } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bot,
  Building,
  Factory,
  MapPin,
  Move,
  Network,
  PackageOpen,
  Pencil,
  Plus,
  Search,
  Trash2,
  Undo2,
  Users,
  X,
} from 'lucide-react';
import type { Actor, Match, Need, Resource } from '../types';
import {
  ACTOR_TYPE_LABELS,
  AVAILABILITY_LABELS,
  CATEGORY_LABELS,
  MARKER_LABELS,
  RESOURCE_STATUS_LABELS,
  TAG_LABELS,
} from '../data/taxonomy';
import { useApp } from '../state/AppContext';
import { markerKind } from '../services/filtering';
import { formatKm } from '../services/distanceCalculator';
import { blankNeed, blankResource } from '../services/dataStore';
import { fmtQty } from '../services/matchingEngine';
import InferencePanel from './InferencePanel';
import { NeedForm, ResourceForm } from './ResourceForm';
import { Badge, Button, ConfirmDialog, EmptyState, MarkerDot, MatchStatusBadge, ScorePill, VerificationBadge } from './ui';

type Tab = 'profile' | 'flows' | 'matches';

export default function ActorPanel({ actor }: { actor: Actor }) {
  const { index, matches, selectActor, collabActorId, setCollabActorId, setFocusedMatchId, setEditor, deleteActor, deleteFacility } = useApp();
  const [tab, setTab] = useState<Tab>(collabActorId === actor.id ? 'matches' : 'profile');
  const [showInference, setShowInference] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmFacility, setConfirmFacility] = useState<string | null>(null);

  const facilities = index.facilitiesByActor.get(actor.id) ?? [];
  const resources = index.resourcesByActor.get(actor.id) ?? [];
  const needs = index.needsByActor.get(actor.id) ?? [];
  const kind = markerKind(actor.id, index);
  const actorMatches = matches.filter((m) => m.sourceActorId === actor.id || m.targetActorId === actor.id);
  const viable = actorMatches.filter((m) => m.status !== 'rejected');
  const collabActive = collabActorId === actor.id;

  const toggleCollab = () => {
    if (collabActive) {
      setCollabActorId(null);
      setFocusedMatchId(null);
    } else {
      setCollabActorId(actor.id);
      setTab('matches');
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Huvud */}
      <div className="border-b border-slate-100 px-5 pb-4 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2.5">
            <div className="mt-1.5">
              <MarkerDot kind={kind} size={12} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold leading-snug text-slate-900">{actor.name}</h2>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                <span>{actor.industry}</span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-0.5">
                  <MapPin size={11} />
                  {actor.municipality}
                </span>
              </div>
            </div>
          </div>
          <button type="button" onClick={() => selectActor(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Stäng aktörspanel">
            <X size={18} />
          </button>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <Badge className="bg-slate-100 text-slate-600">{ACTOR_TYPE_LABELS[actor.actorType]}</Badge>
          <Badge className="bg-slate-100 text-slate-600">
            <Users size={11} /> {actor.employeeRange} anst.
          </Badge>
          <Badge className="bg-slate-100 text-slate-600">{MARKER_LABELS[kind]}</Badge>
          {actor.source === 'user' && <Badge className="bg-violet-50 text-violet-700 ring-1 ring-violet-200">Användarregistrerad</Badge>}
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-2">
          <Button variant={collabActive ? 'secondary' : 'primary'} icon={collabActive ? <Undo2 size={15} /> : <Network size={15} />} onClick={toggleCollab} className="col-span-2">
            {collabActive ? 'Återgå till standardvy' : `Visa möjliga samarbeten (${viable.length})`}
          </Button>
          <Button
            variant="subtle"
            className="!bg-violet-50 !text-violet-700 hover:!bg-violet-100"
            icon={<Bot size={15} />}
            onClick={() => {
              setShowInference(true);
              setTab('flows');
            }}
          >
            <span className="truncate">Identifiera resurser</span>
          </Button>
          <div className="flex gap-2">
            <Button className="flex-1" icon={<Pencil size={14} />} onClick={() => setEditor({ kind: 'actor-edit', actorId: actor.id })}>
              Redigera
            </Button>
            <Button variant="danger" aria-label="Ta bort aktör" title="Ta bort aktör" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={15} />
            </Button>
          </div>
        </div>
      </div>

      {/* Flikar */}
      <div className="flex border-b border-slate-100 px-3 text-sm">
        <TabButton active={tab === 'profile'} onClick={() => setTab('profile')}>
          Profil
        </TabButton>
        <TabButton active={tab === 'flows'} onClick={() => setTab('flows')}>
          Resurser & behov <Count n={resources.length + needs.length} />
        </TabButton>
        <TabButton active={tab === 'matches'} onClick={() => setTab('matches')}>
          Samarbeten <Count n={viable.length} />
        </TabButton>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {tab === 'profile' && (
          <div className="space-y-5">
            <div>
              <div className="section-title mb-1.5">Verksamhet</div>
              <p className="text-sm leading-relaxed text-slate-600">{actor.description || <span className="italic text-slate-400">Ingen beskrivning angiven.</span>}</p>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="section-title">Arbetsställen ({facilities.length})</div>
                <Button size="sm" variant="ghost" icon={<Plus size={13} />} onClick={() => setEditor({ kind: 'facility-create', actorId: actor.id })}>
                  Lägg till
                </Button>
              </div>
              <div className="space-y-2">
                {facilities.map((f, i) => (
                  <div key={f.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                          <Factory size={14} className="text-slate-400" />
                          {f.name}
                          {i === 0 && <span className="text-[10px] font-normal text-slate-400">(huvudanläggning)</span>}
                        </div>
                        <div className="mt-0.5 font-mono text-[11px] text-slate-400">
                          {f.latitude.toFixed(4)}, {f.longitude.toFixed(4)}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-0.5">
                        <IconButton title="Flytta / redigera arbetsställe" onClick={() => setEditor({ kind: 'facility-edit', facilityId: f.id })}>
                          <Move size={14} />
                        </IconButton>
                        {facilities.length > 1 && (
                          <IconButton title="Ta bort arbetsställe" onClick={() => setConfirmFacility(f.id)} danger>
                            <Trash2 size={14} />
                          </IconButton>
                        )}
                      </div>
                    </div>
                    {f.processes.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {f.processes.map((p) => (
                          <Badge key={p} className="bg-slate-100 text-slate-600">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <MiniStat label="Resurser" value={resources.length} color="text-orange-600" />
              <MiniStat label="Behov" value={needs.length} color="text-blue-600" />
              <MiniStat label="Matchningar" value={viable.length} color="text-emerald-600" />
            </div>
          </div>
        )}

        {tab === 'flows' && (
          <FlowsTab actor={actor} resources={resources} needs={needs} showInference={showInference} onCloseInference={() => setShowInference(false)} onOpenInference={() => setShowInference(true)} />
        )}

        {tab === 'matches' && <MatchesTab actor={actor} matches={actorMatches} />}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Ta bort ${actor.name}?`}
        message={
          <>
            Aktören tas bort från kartan tillsammans med {facilities.length} arbetsställe(n), {resources.length} resurs(er) och {needs.length} behov. Matchningarna räknas om. Du kan alltid
            återställa demonstrationsdatan.
          </>
        }
        confirmLabel="Ta bort aktör"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          deleteActor(actor.id);
        }}
      />
      <ConfirmDialog
        open={!!confirmFacility}
        title="Ta bort arbetsställe?"
        message="Arbetsstället och dess resurser och behov tas bort."
        confirmLabel="Ta bort"
        onCancel={() => setConfirmFacility(null)}
        onConfirm={() => {
          if (confirmFacility) deleteFacility(confirmFacility);
          setConfirmFacility(null);
        }}
      />
    </div>
  );
}

function FlowsTab({
  actor,
  resources,
  needs,
  showInference,
  onCloseInference,
  onOpenInference,
}: {
  actor: Actor;
  resources: Resource[];
  needs: Need[];
  showInference: boolean;
  onCloseInference: () => void;
  onOpenInference: () => void;
}) {
  const { index, deleteResource, deleteNeed } = useApp();
  const facilities = index.facilitiesByActor.get(actor.id) ?? [];
  const [resourceForm, setResourceForm] = useState<{ r: Resource; isNew: boolean } | null>(null);
  const [needForm, setNeedForm] = useState<{ n: Need; isNew: boolean } | null>(null);
  const firstFacility = facilities[0]?.id ?? '';

  return (
    <div className="space-y-5">
      {showInference ? (
        <InferencePanel actor={actor} onClose={onCloseInference} />
      ) : (
        resources.length === 0 && (
          <button
            type="button"
            onClick={onOpenInference}
            className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-violet-200 p-3 text-left hover:bg-violet-50"
          >
            <Bot size={20} className="shrink-0 text-violet-500" />
            <div>
              <div className="text-sm font-medium text-violet-800">Identifiera potentiella resurser</div>
              <div className="text-xs text-violet-600/80">Inga resurser registrerade. Låt systemet föreslå sannolika restströmmar.</div>
            </div>
          </button>
        )
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <div className="section-title flex items-center gap-1.5">
            <PackageOpen size={13} className="text-orange-500" /> Tillgängliga resurser ({resources.length})
          </div>
          <Button size="sm" variant="ghost" icon={<Plus size={13} />} onClick={() => setResourceForm({ r: blankResource(firstFacility), isNew: true })}>
            Ny resurs
          </Button>
        </div>
        {resources.length === 0 ? (
          <p className="rounded-lg bg-slate-50 px-3 py-3 text-center text-xs text-slate-400">Inga registrerade resurser</p>
        ) : (
          <div className="space-y-2">
            {resources.map((r) => (
              <FlowCard
                key={r.id}
                accent="border-l-orange-400"
                title={CATEGORY_LABELS[r.category]}
                subtitle={r.material}
                quantity={fmtQty(r.quantity, r.unit)}
                verification={r.verificationStatus}
                meta={[AVAILABILITY_LABELS[r.availability], RESOURCE_STATUS_LABELS[r.status], ...r.classification.map((t) => TAG_LABELS[t]), r.temperatureC != null ? `${r.temperatureC} °C` : null, r.source === 'inference' ? 'Från förslag' : null]}
                onEdit={() => setResourceForm({ r, isNew: false })}
                onDelete={() => deleteResource(r.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <div className="section-title flex items-center gap-1.5">
            <Search size={13} className="text-blue-500" /> Behov ({needs.length})
          </div>
          <Button size="sm" variant="ghost" icon={<Plus size={13} />} onClick={() => setNeedForm({ n: blankNeed(firstFacility), isNew: true })}>
            Nytt behov
          </Button>
        </div>
        {needs.length === 0 ? (
          <p className="rounded-lg bg-slate-50 px-3 py-3 text-center text-xs text-slate-400">Inga registrerade behov</p>
        ) : (
          <div className="space-y-2">
            {needs.map((n) => (
              <FlowCard
                key={n.id}
                accent="border-l-blue-400"
                title={CATEGORY_LABELS[n.category]}
                subtitle={n.material}
                quantity={fmtQty(n.requiredQuantity, n.unit)}
                verification={n.verificationStatus}
                meta={[...n.technicalRequirements.map((t) => `Krav: ${TAG_LABELS[t].toLowerCase()}`), n.minTemperatureC != null ? `Min ${n.minTemperatureC} °C` : null, n.maxDistanceKm != null ? `Max ${n.maxDistanceKm} km` : null]}
                onEdit={() => setNeedForm({ n, isNew: false })}
                onDelete={() => deleteNeed(n.id)}
              />
            ))}
          </div>
        )}
      </section>

      {resourceForm && <ResourceForm initial={resourceForm.r} isNew={resourceForm.isNew} facilities={facilities} onClose={() => setResourceForm(null)} />}
      {needForm && <NeedForm initial={needForm.n} isNew={needForm.isNew} facilities={facilities} onClose={() => setNeedForm(null)} />}
    </div>
  );
}

function MatchesTab({ actor, matches }: { actor: Actor; matches: Match[] }) {
  const { index, collabActorId, setCollabActorId, focusedMatchId, setFocusedMatchId, openAnalysis } = useApp();
  const [showRejected, setShowRejected] = useState(false);
  const shown = matches.filter((m) => showRejected || m.status !== 'rejected');
  const rejectedCount = matches.length - matches.filter((m) => m.status !== 'rejected').length;
  const outgoing = shown.filter((m) => m.sourceActorId === actor.id);
  const incoming = shown.filter((m) => m.targetActorId === actor.id);

  if (matches.length === 0) {
    return (
      <EmptyState icon={<Network size={20} />} title="Inga matchningar ännu">
        Registrera resurser eller behov för att matchningsmotorn ska kunna hitta samarbeten.
      </EmptyState>
    );
  }

  const row = (m: Match) => {
    const out = m.sourceActorId === actor.id;
    const partner = index.actorById.get(out ? m.targetActorId : m.sourceActorId);
    const r = index.resourceById.get(m.sourceResourceId);
    return (
      <button
        key={m.id}
        type="button"
        onClick={() => {
          if (collabActorId !== actor.id) setCollabActorId(actor.id);
          setFocusedMatchId(m.id);
        }}
        className={`w-full rounded-lg border p-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50/30 ${focusedMatchId === m.id ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-200'}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-sm font-medium text-slate-800">
              {out ? <ArrowUpRight size={14} className="shrink-0 text-orange-500" /> : <ArrowDownLeft size={14} className="shrink-0 text-blue-500" />}
              <span className="truncate">{partner?.name}</span>
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              {r && CATEGORY_LABELS[r.category]} · {formatKm(m.distanceKm)}
            </div>
          </div>
          <ScorePill score={m.score} rejected={m.status === 'rejected'} />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <MatchStatusBadge status={m.status} />
          <span
            role="link"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              openAnalysis(m.id);
            }}
            onKeyDown={(e) => e.key === 'Enter' && openAnalysis(m.id)}
            className="text-xs font-medium text-emerald-700 hover:underline"
          >
            Analysera →
          </span>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">Klicka på en matchning för att markera den på kartan. Avstånd anges som fågelväg.</p>
      {outgoing.length > 0 && (
        <div>
          <div className="section-title mb-2">Kan leverera till ({outgoing.length})</div>
          <div className="space-y-2">{outgoing.map(row)}</div>
        </div>
      )}
      {incoming.length > 0 && (
        <div>
          <div className="section-title mb-2">Kan ta emot från ({incoming.length})</div>
          <div className="space-y-2">{incoming.map(row)}</div>
        </div>
      )}
      {rejectedCount > 0 && (
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input type="checkbox" className="accent-emerald-600" checked={showRejected} onChange={(e) => setShowRejected(e.target.checked)} />
          Visa även avvisade matchningar ({rejectedCount})
        </label>
      )}
    </div>
  );
}

function FlowCard({
  accent,
  title,
  subtitle,
  quantity,
  verification,
  meta,
  onEdit,
  onDelete,
}: {
  accent: string;
  title: string;
  subtitle: string;
  quantity: string;
  verification: Resource['verificationStatus'];
  meta: (string | null)[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`rounded-lg border border-l-[3px] border-slate-200 ${accent} bg-white p-3`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-800">{title}</div>
          <div className="text-xs text-slate-500">{subtitle}</div>
        </div>
        <div className="flex shrink-0 gap-0.5">
          <IconButton title="Redigera" onClick={onEdit}>
            <Pencil size={13} />
          </IconButton>
          <IconButton title="Ta bort" onClick={onDelete} danger>
            <Trash2 size={13} />
          </IconButton>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <span className="mr-1 text-xs font-semibold tabular-nums text-slate-700">{quantity}</span>
        <VerificationBadge status={verification} />
        {meta.filter(Boolean).map((m) => (
          <Badge key={m} className="bg-slate-100 text-slate-500">
            {m}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px flex items-center gap-1.5 border-b-2 px-2.5 py-2.5 text-[13px] font-medium transition ${active ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
    >
      {children}
    </button>
  );
}

function Count({ n }: { n: number }) {
  return <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-500">{n}</span>;
}

function IconButton({ children, title, onClick, danger }: { children: ReactNode; title: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`rounded-md p-1.5 text-slate-400 transition ${danger ? 'hover:bg-red-50 hover:text-red-600' : 'hover:bg-slate-100 hover:text-slate-700'}`}
    >
      {children}
    </button>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg bg-slate-50 py-2">
      <div className={`text-lg font-semibold ${color}`}>{value}</div>
      <div className="text-[11px] text-slate-500">{label}</div>
    </div>
  );
}

export function NoActorSelected() {
  const { setEditor, setDraft, viableMatches, index, selectActor, setCollabActorId, setFocusedMatchId } = useApp();
  const top = viableMatches.slice(0, 5);
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-slate-100 p-5">
        <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Building size={16} className="text-emerald-600" /> Utforska regionen
        </div>
        <p className="text-sm leading-relaxed text-slate-500">
          Klicka på en markör för att se aktörens resurser, behov och möjliga samarbeten – eller registrera en ny aktör direkt på kartan.
        </p>
        <Button
          variant="primary"
          className="mt-4 w-full"
          icon={<Plus size={16} />}
          onClick={() => {
            selectActor(null);
            setDraft(null);
            setEditor({ kind: 'actor-create' });
          }}
        >
          Lägg till aktör på kartan
        </Button>
      </div>
      <div className="p-5">
        <div className="section-title mb-3">Starkaste matchningarna</div>
        <div className="space-y-2">
          {top.map((m) => {
            const a = index.actorById.get(m.sourceActorId);
            const b = index.actorById.get(m.targetActorId);
            const r = index.resourceById.get(m.sourceResourceId);
            return (
              <button
                key={m.id}
                type="button"
                className="w-full rounded-lg border border-slate-200 p-3 text-left transition hover:border-emerald-300"
                onClick={() => {
                  selectActor(m.sourceActorId);
                  setCollabActorId(m.sourceActorId);
                  setFocusedMatchId(m.id);
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 text-xs">
                    <div className="truncate font-medium text-slate-800">{a?.name}</div>
                    <div className="truncate text-slate-500">→ {b?.name}</div>
                  </div>
                  <ScorePill score={m.score} />
                </div>
                <div className="mt-1.5 text-[11px] text-slate-400">
                  {r && CATEGORY_LABELS[r.category]} · {formatKm(m.distanceKm)} fågelväg
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
