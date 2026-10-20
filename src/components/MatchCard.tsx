import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BarChart3, Ban, CheckCircle2, MapPinned } from 'lucide-react';
import type { Match } from '../types';
import { CATEGORY_LABELS } from '../data/taxonomy';
import { useApp } from '../state/AppContext';
import { formatKm } from '../services/distanceCalculator';
import { fmtQty } from '../services/matchingEngine';
import { Button, MatchStatusBadge, ScorePill } from './ui';

export default function MatchCard({ match }: { match: Match }) {
  const { index, selectActor, setCollabActorId, setFocusedMatchId, openAnalysis } = useApp();
  const navigate = useNavigate();
  const resource = index.resourceById.get(match.sourceResourceId);
  const need = index.needById.get(match.targetNeedId);
  const source = index.actorById.get(match.sourceActorId);
  const target = index.actorById.get(match.targetActorId);
  if (!resource || !need || !source || !target) return null;
  const rejected = match.status === 'rejected';

  const showOnMap = () => {
    selectActor(source.id);
    setCollabActorId(source.id);
    setFocusedMatchId(match.id);
    navigate('/');
  };

  return (
    <article className="card flex flex-col p-5" data-testid="match-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[15px] font-semibold text-slate-900">
            <span>{source.name}</span>
            <ArrowRight size={16} className="text-slate-400" />
            <span>{target.name}</span>
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            {source.municipality} → {target.municipality}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <ScorePill score={match.score} rejected={rejected} />
          <span className="text-[10px] text-slate-400">matchningspotential</span>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-slate-50 px-3 py-2.5 text-xs">
        <div className="min-w-0">
          <dt className="text-slate-400">Resurs</dt>
          <dd className="truncate font-medium text-slate-700" title={resource.material}>
            {CATEGORY_LABELS[resource.category]}
          </dd>
          <dd className="truncate text-slate-500">{resource.material}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Volym</dt>
          <dd className="font-medium text-slate-700">{fmtQty(resource.quantity, resource.unit)}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Avstånd</dt>
          <dd className="font-medium text-slate-700">{formatKm(match.distanceKm)}</dd>
          <dd className="text-slate-500">fågelväg</dd>
        </div>
      </dl>

      <div className="mt-4 flex-1 space-y-2.5 text-sm">
        {rejected ? (
          <Reason icon={<Ban size={14} className="text-red-500" />} title="Hinder">
            {match.blockers[0]}
          </Reason>
        ) : (
          <Reason icon={<CheckCircle2 size={14} className="text-emerald-500" />} title="Varför relevant">
            {match.reasons[0]}
          </Reason>
        )}
        {match.uncertainties.length > 0 && (
          <Reason icon={<AlertTriangle size={14} className="text-amber-500" />} title={`Osäkerheter (${match.uncertainties.length})`}>
            {match.uncertainties.slice(0, 2).join(' ')}
          </Reason>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <MatchStatusBadge status={match.status} />
        <div className="flex gap-2">
          <Button size="sm" icon={<MapPinned size={14} />} onClick={showOnMap}>
            Visa på karta
          </Button>
          <Button size="sm" variant="primary" icon={<BarChart3 size={14} />} onClick={() => openAnalysis(match.id)}>
            Analysera matchning
          </Button>
        </div>
      </div>
    </article>
  );
}

function Reason({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <div className="text-xs font-medium text-slate-700">{title}</div>
        <p className="text-xs leading-relaxed text-slate-500">{children}</p>
      </div>
    </div>
  );
}
