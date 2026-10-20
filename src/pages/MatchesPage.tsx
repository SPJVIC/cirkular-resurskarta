import { useMemo, useState } from 'react';
import { GitMerge, Info, Search } from 'lucide-react';
import type { MatchStatus, Municipality, ResourceCategory } from '../types';
import { CATEGORIES, CATEGORY_LABELS, MUNICIPALITIES } from '../data/taxonomy';
import { useApp } from '../state/AppContext';
import MatchCard from '../components/MatchCard';
import { EmptyState } from '../components/ui';

type StatusTab = 'viable' | MatchStatus | 'all';

const TABS: [StatusTab, string][] = [
  ['viable', 'Alla genomförbara'],
  ['potential', 'Möjliga'],
  ['needs_verification', 'Kräver verifiering'],
  ['rejected', 'Avvisade'],
  ['all', 'Alla'],
];

export default function MatchesPage() {
  const { matches, index } = useApp();
  const [tab, setTab] = useState<StatusTab>('viable');
  const [category, setCategory] = useState<ResourceCategory | ''>('');
  const [municipality, setMunicipality] = useState<Municipality | ''>('');
  const [minScore, setMinScore] = useState(0);
  const [q, setQ] = useState('');

  const counts = useMemo(
    () => ({
      viable: matches.filter((m) => m.status !== 'rejected').length,
      potential: matches.filter((m) => m.status === 'potential').length,
      needs_verification: matches.filter((m) => m.status === 'needs_verification').length,
      rejected: matches.filter((m) => m.status === 'rejected').length,
      all: matches.length,
    }),
    [matches],
  );

  const list = matches.filter((m) => {
    if (tab === 'viable' && m.status === 'rejected') return false;
    if (tab !== 'viable' && tab !== 'all' && m.status !== tab) return false;
    if (m.score < minScore) return false;
    const r = index.resourceById.get(m.sourceResourceId);
    if (category && r?.category !== category) return false;
    const a = index.actorById.get(m.sourceActorId);
    const b = index.actorById.get(m.targetActorId);
    if (municipality && a?.municipality !== municipality && b?.municipality !== municipality) return false;
    if (q && !`${a?.name} ${b?.name} ${r?.material}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Matchningar</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Prioriterad lista över möjliga samarbeten, beräknad av den regelbaserade matchningsmotorn utifrån registrerade resurser och behov.
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-2 rounded-xl bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-800">
        <Info size={15} className="mt-0.5 shrink-0" />
        <span>
          Poängen (0–100) visar <strong>indikativ matchningspotential</strong> baserat på kompatibilitet, kvalitet, volym, tillgänglighet, avstånd och datakvalitet – inte sannolikheten att
          samarbetet lyckas. Avstånd är fågelväg (Haversine).
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${tab === k ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {l} <span className="ml-1 rounded-full bg-slate-100 px-1.5 text-[11px] text-slate-500">{counts[k]}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Sök aktör eller material" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value as ResourceCategory | '')} aria-label="Resurskategori">
          <option value="">Alla resurskategorier</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <select className="input" value={municipality} onChange={(e) => setMunicipality(e.target.value as Municipality | '')} aria-label="Kommun">
          <option value="">Alla kommuner</option>
          {MUNICIPALITIES.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600">
          <span className="whitespace-nowrap">Min poäng</span>
          <input type="range" min={0} max={95} step={5} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="w-full accent-emerald-600" />
          <span className="w-6 text-right font-semibold tabular-nums">{minScore}</span>
        </label>
      </div>

      <div className="mt-2 text-xs text-slate-400">{list.length} matchningar visas</div>

      {list.length === 0 ? (
        <EmptyState icon={<GitMerge size={20} />} title="Inga matchningar matchar filtren">
          Justera filtren eller registrera fler resurser och behov.
        </EmptyState>
      ) : (
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {list.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      )}
    </div>
  );
}
