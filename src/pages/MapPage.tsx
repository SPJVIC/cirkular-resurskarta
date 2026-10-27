import { useMemo, useState } from 'react';
import { MousePointerClick, Network, Plus, SlidersHorizontal, Undo2 } from 'lucide-react';
import type { MarkerKind } from '../types';
import { MARKER_LABELS } from '../data/taxonomy';
import { useApp } from '../state/AppContext';
import { activeFilterCount, applyFilters } from '../services/filtering';
import MapView from '../components/MapView';
import FilterPanel from '../components/FilterPanel';
import ActorPanel, { NoActorSelected } from '../components/ActorPanel';
import ActorForm from '../components/ActorForm';
import { Button, MarkerDot } from '../components/ui';
import { scoreColor } from '../components/scoreColor';

export default function MapPage() {
  const { data, index, filters, selectedActorId, collabActorId, setCollabActorId, setFocusedMatchId, matches, editor, setEditor, setDraft, selectActor, canCreate } = useApp();
  const [showRejected, setShowRejected] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const visible = useMemo(() => applyFilters(data, index, filters), [data, index, filters]);
  const selected = selectedActorId ? index.actorById.get(selectedActorId) : undefined;
  const collabActor = collabActorId ? index.actorById.get(collabActorId) : undefined;
  const collabStats = useMemo(() => {
    const ms = matches.filter((m) => m.sourceActorId === collabActorId || m.targetActorId === collabActorId);
    return { viable: ms.filter((m) => m.status !== 'rejected').length, rejected: ms.filter((m) => m.status === 'rejected').length };
  }, [matches, collabActorId]);

  const startCreate = () => {
    selectActor(null);
    setDraft(null);
    setEditor({ kind: 'actor-create' });
  };

  return (
    <div className="grid grid-cols-1 lg:h-full lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-[auto_minmax(0,1fr)] xl:grid-cols-[290px_minmax(0,1fr)_390px] xl:grid-rows-[minmax(0,1fr)]">
      {/* Filter – sidopanel på stora skärmar, utfällbar på mindre */}
      <aside className="border-b border-slate-200 bg-white lg:col-span-2 xl:col-span-1 xl:overflow-y-auto xl:border-b-0 xl:border-r">
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 xl:hidden"
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal size={16} /> Sök och filter
            {activeFilterCount(filters) > 0 && <span className="rounded-full bg-emerald-600 px-1.5 text-[10px] text-white">{activeFilterCount(filters)}</span>}
          </span>
          <span className="text-xs text-slate-400">
            {visible.size} av {data.actors.length}
          </span>
        </button>
        <div className={`${filtersOpen ? 'block' : 'hidden'} max-h-[55vh] overflow-y-auto border-t border-slate-100 xl:block xl:max-h-none xl:overflow-visible xl:border-t-0`}>
          <FilterPanel visibleCount={visible.size} />
        </div>
      </aside>

      {/* Karta */}
      <section className="relative h-[62vh] min-h-[380px] lg:h-auto">
        <MapView visibleActorIds={visible} showRejected={showRejected} />

        {/* Övre överlägg: placeringsläge eller samarbetsläge */}
        <div className="pointer-events-none absolute inset-x-3 top-3 z-[1000] flex justify-center">
          {editor ? (
            <div className="pointer-events-auto flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm text-white shadow-lg">
              <MousePointerClick size={16} />
              Klicka på kartan för att placera – dra markören för att justera
            </div>
          ) : collabActor ? (
            <div className="pointer-events-auto flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-white px-4 py-2.5 text-sm shadow-lg ring-1 ring-slate-200">
              <span className="flex items-center gap-2 font-medium text-slate-800">
                <Network size={16} className="text-emerald-600" />
                Samarbeten för {collabActor.name}
              </span>
              <span className="text-xs text-slate-500">
                {collabStats.viable} möjliga · {collabStats.rejected} avvisade
              </span>
              <label className="flex items-center gap-1.5 text-xs text-slate-600">
                <input type="checkbox" className="accent-emerald-600" checked={showRejected} onChange={(e) => setShowRejected(e.target.checked)} />
                Visa avvisade
              </label>
              <Button
                size="sm"
                icon={<Undo2 size={13} />}
                onClick={() => {
                  setCollabActorId(null);
                  setFocusedMatchId(null);
                }}
              >
                Återgå till standardvy
              </Button>
            </div>
          ) : null}
        </div>

        {/* Lägg till-knapp */}
        {!editor && canCreate && (
          <div className="absolute right-3 top-14 z-[1000]">
            <Button variant="primary" icon={<Plus size={16} />} onClick={startCreate} className="shadow-lg">
              Lägg till aktör
            </Button>
          </div>
        )}

        <Legend collab={!!collabActor} />
      </section>

      {/* Höger panel */}
      <aside className="min-h-[420px] border-t border-slate-200 bg-white lg:min-h-0 lg:overflow-hidden lg:border-l lg:border-t-0">
        {editor ? <ActorForm editor={editor} /> : selected ? <ActorPanel key={selected.id} actor={selected} /> : <NoActorSelected />}
      </aside>
    </div>
  );
}

function Legend({ collab }: { collab: boolean }) {
  const kinds: MarkerKind[] = ['resources', 'needs', 'both', 'unmapped'];
  return (
    <div className="absolute bottom-6 left-3 z-[1000] rounded-xl bg-white/95 px-3 py-2.5 text-xs shadow-lg ring-1 ring-slate-200 backdrop-blur">
      <div className="space-y-1.5">
        {kinds.map((k) => (
          <div key={k} className="flex items-center gap-2 text-slate-600">
            <MarkerDot kind={k} size={11} />
            {MARKER_LABELS[k]}
          </div>
        ))}
        <div className="flex items-center gap-2 text-slate-600">
          <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-white bg-violet-600 shadow" />
          Användarregistrerad
        </div>
      </div>
      {collab && (
        <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
          <div className="flex items-center gap-2 text-slate-600">
            <span className="h-1 w-5 rounded" style={{ background: scoreColor(85) }} /> Hög potential (80+)
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <span className="h-1 w-5 rounded" style={{ background: scoreColor(65) }} /> Måttlig (60–79)
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <span className="h-1 w-5 rounded" style={{ background: scoreColor(45) }} /> Låg (&lt;60)
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <span className="h-0 w-5 border-t-2 border-dashed border-red-500" /> Avvisad
          </div>
          <div className="pt-0.5 text-[10px] text-slate-400">Pilen visar resursflödets riktning</div>
        </div>
      )}
    </div>
  );
}
