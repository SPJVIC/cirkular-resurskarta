import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Plus, Search } from 'lucide-react';
import type { MarkerKind, Municipality } from '../types';
import { ACTOR_TYPE_LABELS, MARKER_LABELS, MUNICIPALITIES } from '../data/taxonomy';
import { useApp } from '../state/AppContext';
import { markerKind } from '../services/filtering';
import { Badge, Button, MarkerDot } from '../components/ui';

export default function ActorsPage() {
  const { data, index, viableMatches, selectActor, setEditor, setDraft } = useApp();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [municipality, setMunicipality] = useState<Municipality | ''>('');
  const [kind, setKind] = useState<MarkerKind | ''>('');

  const matchCount = useMemo(() => {
    const c = new Map<string, number>();
    for (const m of viableMatches) {
      c.set(m.sourceActorId, (c.get(m.sourceActorId) ?? 0) + 1);
      c.set(m.targetActorId, (c.get(m.targetActorId) ?? 0) + 1);
    }
    return c;
  }, [viableMatches]);

  const rows = data.actors
    .filter((a) => !municipality || a.municipality === municipality)
    .filter((a) => !kind || markerKind(a.id, index) === kind)
    .filter((a) => !q || `${a.name} ${a.industry} ${a.description}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.municipality.localeCompare(b.municipality, 'sv') || a.name.localeCompare(b.name, 'sv'));

  const open = (id: string) => {
    selectActor(id);
    navigate('/');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Aktörer</h1>
          <p className="mt-1 text-sm text-slate-500">
            {data.actors.length} aktörer i {new Set(data.actors.map((a) => a.municipality)).size} kommuner. Klicka på en rad för att visa aktören på kartan.
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={16} />}
          onClick={() => {
            selectActor(null);
            setDraft(null);
            setEditor({ kind: 'actor-create' });
            navigate('/');
          }}
        >
          Lägg till aktör
        </Button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Sök namn, bransch eller verksamhet" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input" value={municipality} onChange={(e) => setMunicipality(e.target.value as Municipality | '')} aria-label="Kommun">
          <option value="">Alla kommuner</option>
          {MUNICIPALITIES.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <select className="input" value={kind} onChange={(e) => setKind(e.target.value as MarkerKind | '')} aria-label="Kartläggningsstatus">
          <option value="">Alla kartläggningsstatusar</option>
          {(Object.keys(MARKER_LABELS) as MarkerKind[]).map((k) => (
            <option key={k} value={k}>
              {MARKER_LABELS[k]}
            </option>
          ))}
        </select>
      </div>

      <div className="card mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Aktör</th>
                <th className="px-4 py-3">Kommun</th>
                <th className="px-4 py-3">Bransch</th>
                <th className="px-4 py-3">Typ</th>
                <th className="px-4 py-3 text-center">Resurser</th>
                <th className="px-4 py-3 text-center">Behov</th>
                <th className="px-4 py-3 text-center">Matchningar</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((a) => {
                const k = markerKind(a.id, index);
                return (
                  <tr key={a.id} className="cursor-pointer transition hover:bg-emerald-50/40" onClick={() => open(a.id)} data-testid="actor-row">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <MarkerDot kind={k} />
                        <div>
                          <div className="font-medium text-slate-800">{a.name}</div>
                          <div className="text-[11px] text-slate-400">{MARKER_LABELS[k]}</div>
                        </div>
                        {a.source === 'user' && <Badge className="bg-violet-50 text-violet-700">Ny</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{a.municipality}</td>
                    <td className="px-4 py-3 text-slate-600">{a.industry}</td>
                    <td className="px-4 py-3 text-slate-600">{ACTOR_TYPE_LABELS[a.actorType]}</td>
                    <td className="px-4 py-3 text-center tabular-nums text-slate-600">{index.resourcesByActor.get(a.id)?.length ?? 0}</td>
                    <td className="px-4 py-3 text-center tabular-nums text-slate-600">{index.needsByActor.get(a.id)?.length ?? 0}</td>
                    <td className="px-4 py-3 text-center tabular-nums font-medium text-emerald-700">{matchCount.get(a.id) ?? 0}</td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      <ChevronRight size={16} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <div className="py-10 text-center text-sm text-slate-500">Inga aktörer matchar filtren.</div>}
      </div>
    </div>
  );
}
