import { useState } from 'react';
import { FilterX, Search, Sparkles } from 'lucide-react';
import type { ActorType, Filters, FlowFilter, Municipality, ResourceCategory, ResourceStatus, VerificationStatus } from '../types';
import {
  ACTOR_TYPE_LABELS,
  CATEGORIES,
  CATEGORY_LABELS,
  INDUSTRIES,
  MUNICIPALITIES,
  PLACES,
  RESOURCE_STATUS_LABELS,
  VERIFICATION_LABELS,
} from '../data/taxonomy';
import { useApp } from '../state/AppContext';
import { activeFilterCount, EMPTY_FILTERS } from '../services/filtering';
import { EXAMPLE_QUERIES, parseQuery } from '../services/naturalLanguageSearch';
import { Button } from './ui';

export default function FilterPanel({ visibleCount }: { visibleCount: number }) {
  const { filters, setFilters, data } = useApp();
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters({ ...filters, [key]: value });
  const count = activeFilterCount(filters);

  return (
    <div className="flex flex-col gap-4 p-4">
      <NLSearchBox />

      <div className="flex items-center justify-between">
        <div>
          <div className="section-title">Filter</div>
          <div className="mt-0.5 text-xs text-slate-500">
            Visar <span className="font-semibold text-slate-700">{visibleCount}</span> av {data.actors.length} aktörer
          </div>
        </div>
        {count > 0 && (
          <Button size="sm" variant="ghost" icon={<FilterX size={14} />} onClick={() => setFilters(EMPTY_FILTERS)}>
            Rensa ({count})
          </Button>
        )}
      </div>

      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9"
          placeholder="Sök aktör, material…"
          value={filters.search}
          onChange={(e) => set('search', e.target.value)}
          aria-label="Sök"
        />
      </div>

      <Select label="Kommun" value={filters.municipality} onChange={(v) => set('municipality', v as Municipality | '')}>
        {MUNICIPALITIES.map((m) => (
          <option key={m}>{m}</option>
        ))}
      </Select>

      <Select label="Bransch" value={filters.industry} onChange={(v) => set('industry', v)}>
        {INDUSTRIES.map((i) => (
          <option key={i}>{i}</option>
        ))}
      </Select>

      <Select label="Aktörstyp" value={filters.actorType} onChange={(v) => set('actorType', v as ActorType | '')}>
        {(Object.keys(ACTOR_TYPE_LABELS) as ActorType[]).map((t) => (
          <option key={t} value={t}>
            {ACTOR_TYPE_LABELS[t]}
          </option>
        ))}
      </Select>

      <div>
        <Select label="Resurskategori" value={filters.resourceCategory} onChange={(v) => set('resourceCategory', v as ResourceCategory | '')}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </Select>
        <div className="mt-2 grid grid-cols-3 rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
          {(
            [
              ['all', 'Alla'],
              ['offer', 'Erbjuder'],
              ['need', 'Behöver'],
            ] as [FlowFilter, string][]
          ).map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => set('flow', v)}
              className={`rounded-md px-2 py-1 transition ${filters.flow === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <Select label="Resursstatus" value={filters.resourceStatus} onChange={(v) => set('resourceStatus', v as ResourceStatus | '')}>
        {(Object.keys(RESOURCE_STATUS_LABELS) as ResourceStatus[]).map((s) => (
          <option key={s} value={s}>
            {RESOURCE_STATUS_LABELS[s]}
          </option>
        ))}
      </Select>

      <Select label="Verifieringsstatus" value={filters.verificationStatus} onChange={(v) => set('verificationStatus', v as VerificationStatus | '')}>
        {(Object.keys(VERIFICATION_LABELS) as VerificationStatus[]).map((s) => (
          <option key={s} value={s}>
            {VERIFICATION_LABELS[s]}
          </option>
        ))}
      </Select>

      <DistanceFilter />
    </div>
  );
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Alla</option>
        {children}
      </select>
    </label>
  );
}

function DistanceFilter() {
  const { filters, setFilters } = useApp();
  const d = filters.distance;
  const setPlace = (name: string) => {
    const p = PLACES.find((x) => x.name === name);
    setFilters({ ...filters, distance: p ? { label: p.name, latitude: p.latitude, longitude: p.longitude, km: d?.km ?? 30 } : null });
  };
  return (
    <div>
      <span className="label">Geografiskt avstånd</span>
      <select className="input" value={d?.label ?? ''} onChange={(e) => setPlace(e.target.value)} aria-label="Avstånd från ort">
        <option value="">Inget avståndsfilter</option>
        {[...PLACES]
          .sort((a, b) => a.name.localeCompare(b.name, 'sv'))
          .map((p) => (
            <option key={p.name} value={p.name}>
              Från {p.name}
            </option>
          ))}
      </select>
      {d && (
        <div className="mt-2">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Radie (fågelväg)</span>
            <span className="font-semibold text-slate-700">{d.km} km</span>
          </div>
          <input
            type="range"
            min={5}
            max={150}
            step={5}
            value={d.km}
            onChange={(e) => setFilters({ ...filters, distance: { ...d, km: Number(e.target.value) } })}
            className="w-full accent-emerald-600"
            aria-label="Radie i km"
          />
        </div>
      )}
    </div>
  );
}

function NLSearchBox() {
  const { setFilters } = useApp();
  const [text, setText] = useState('');
  const [result, setResult] = useState<{ ok: boolean; lines: string[] } | null>(null);

  const run = (q: string) => {
    const r = parseQuery(q);
    if (r.ok) {
      setFilters({ ...EMPTY_FILTERS, ...r.filters });
      setResult({ ok: true, lines: r.interpretation });
    } else {
      setResult({ ok: false, lines: [r.message] });
    }
  };

  return (
    <div className="rounded-xl border border-violet-200 bg-gradient-to-b from-violet-50 to-white p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-violet-700">
        <Sparkles size={14} /> Sök med naturligt språk
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(text);
        }}
      >
        <textarea
          className="input min-h-[60px] resize-none text-[13px]"
          placeholder={EXAMPLE_QUERIES[0]}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              run(text);
            }
          }}
          aria-label="Fråga"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <button
            type="button"
            className="truncate text-left text-[11px] text-violet-600 hover:underline"
            onClick={() => {
              const q = EXAMPLE_QUERIES[Math.floor(Math.random() * EXAMPLE_QUERIES.length)];
              setText(q);
              run(q);
            }}
          >
            Prova ett exempel
          </button>
          <Button size="sm" variant="primary" type="submit" className="!bg-violet-600 hover:!bg-violet-700">
            Tolka
          </Button>
        </div>
      </form>
      {result && (
        <div className={`mt-2 rounded-lg px-2.5 py-2 text-xs ${result.ok ? 'bg-white text-slate-600 ring-1 ring-violet-100' : 'bg-red-50 text-red-700'}`}>
          {result.ok && <div className="mb-1 font-medium text-slate-700">Tolkat som:</div>}
          <ul className={result.ok ? 'list-inside list-disc space-y-0.5' : ''}>
            {result.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-2 text-[10px] leading-snug text-slate-400">Regelbaserad texttolkning – ingen språkmodell används.</p>
    </div>
  );
}
