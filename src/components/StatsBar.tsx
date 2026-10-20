import { Building2, GitMerge, PackageOpen, Search } from 'lucide-react';
import { useApp } from '../state/AppContext';
import { markerKind } from '../services/filtering';

export default function StatsBar() {
  const { data, index, viableMatches, matches } = useApp();
  const unmapped = data.actors.filter((a) => markerKind(a.id, index) === 'unmapped').length;
  const potential = viableMatches.filter((m) => m.status === 'potential').length;
  const stats = [
    { label: 'Aktörer', value: data.actors.length, sub: `${unmapped} ej kartlagda`, icon: Building2, color: 'text-slate-600 bg-slate-100' },
    { label: 'Resursflöden', value: data.resources.length, sub: 'registrerade restströmmar', icon: PackageOpen, color: 'text-orange-600 bg-orange-50' },
    { label: 'Behov', value: data.needs.length, sub: 'identifierade behov', icon: Search, color: 'text-blue-600 bg-blue-50' },
    {
      label: 'Matchningar',
      value: viableMatches.length,
      sub: `${potential} möjliga · ${viableMatches.length - potential} kräver verifiering · ${matches.length - viableMatches.length} avvisade`,
      icon: GitMerge,
      color: 'text-emerald-600 bg-emerald-50',
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-px border-b border-slate-200 bg-slate-200 lg:grid-cols-4">
      {stats.map(({ label, value, sub, icon: Icon, color }) => (
        <div key={label} className="flex items-center gap-3 bg-white px-4 py-2.5 lg:px-6">
          <div className={`rounded-lg p-2 ${color}`}>
            <Icon size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold tabular-nums text-slate-900" data-testid={`stat-${label}`}>
                {value}
              </span>
              <span className="text-xs font-medium text-slate-500">{label}</span>
            </div>
            <div className="truncate text-[11px] text-slate-400">{sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
