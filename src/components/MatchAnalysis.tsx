import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, MapPinned } from 'lucide-react';
import type { ScoreBreakdown } from '../types';
import { useApp } from '../state/AppContext';
import { generateAnalysis } from '../services/analysisGenerator';
import { SCORE_WEIGHTS } from '../services/matchingEngine';
import { Button, MatchStatusBadge, Modal, ScorePill } from './ui';
import { scoreColor } from './scoreColor';

const BREAKDOWN_LABELS: Record<keyof ScoreBreakdown, string> = {
  compatibility: 'Resurskompatibilitet',
  quality: 'Materialkvalitet',
  volume: 'Volym',
  availability: 'Tillgänglighet',
  distance: 'Geografiskt avstånd',
  dataQuality: 'Datakvalitet',
};

/** Detaljerad, regelbaserad analys av en matchning (öppnas som modal från alla vyer). */
export default function MatchAnalysis() {
  const { analysisMatchId, openAnalysis, matches, index, selectActor, setCollabActorId, setFocusedMatchId } = useApp();
  const navigate = useNavigate();
  const match = analysisMatchId ? matches.find((m) => m.id === analysisMatchId) : undefined;
  const analysis = match ? generateAnalysis(match, index) : null;
  if (!match || !analysis) return null;
  const rejected = match.status === 'rejected';

  return (
    <Modal
      open
      onClose={() => openAnalysis(null)}
      width="max-w-3xl"
      title={analysis.title}
      subtitle={
        <span className="flex flex-wrap items-center gap-2">
          <MatchStatusBadge status={match.status} />
          <span className="text-xs">Regelbaserad analys genererad från strukturerad data – ingen AI-modell har använts.</span>
        </span>
      }
      footer={
        <>
          <Button onClick={() => openAnalysis(null)}>Stäng</Button>
          <Button
            variant="primary"
            icon={<MapPinned size={15} />}
            onClick={() => {
              selectActor(match.sourceActorId);
              setCollabActorId(match.sourceActorId);
              setFocusedMatchId(match.id);
              openAnalysis(null);
              navigate('/');
            }}
          >
            Visa på karta
          </Button>
        </>
      }
    >
      <div className="grid gap-6 md:grid-cols-[1fr_240px]">
        <div className="space-y-6">
          <Section n={1} title="Sammanfattning">
            <p className="text-sm leading-relaxed text-slate-600">{analysis.summary}</p>
          </Section>
          <Section n={2} title="Varför matchningen föreslås">
            <List items={analysis.why} />
          </Section>
          <Section n={3} title="Tekniska förutsättningar">
            <List items={analysis.technical} />
          </Section>
          <Section n={4} title="Geografiska förutsättningar">
            <List items={analysis.geographic} />
          </Section>
          <Section n={5} title="Potentiell nytta">
            <List items={analysis.benefits} />
          </Section>
          <Section n={6} title="Hinder och osäkerheter">
            <List items={analysis.obstacles} tone={rejected ? 'red' : 'amber'} />
          </Section>
          <Section n={7} title="Nästa steg">
            <ol className="list-inside list-decimal space-y-1 text-sm text-slate-600">
              {analysis.nextSteps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </Section>
          <Section n={8} title="Frågor inför företagsdialog">
            <div className="grid gap-3 sm:grid-cols-2">
              {analysis.dialogQuestions.map((g) => (
                <div key={g.to} className="rounded-lg bg-slate-50 p-3">
                  <div className="mb-1.5 text-xs font-semibold text-slate-700">Till {g.to}</div>
                  <ul className="list-inside list-disc space-y-1 text-xs text-slate-600">
                    {g.questions.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <aside className="space-y-4 md:sticky md:top-0 md:self-start">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Matchningspotential</span>
              <ScorePill score={match.score} rejected={rejected} />
            </div>
            <div className="mt-4 space-y-2.5">
              {(Object.keys(BREAKDOWN_LABELS) as (keyof ScoreBreakdown)[]).map((k) => {
                const v = match.breakdown[k];
                const max = SCORE_WEIGHTS[k];
                return (
                  <div key={k}>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>{BREAKDOWN_LABELS[k]}</span>
                      <span className="tabular-nums">
                        {Math.round(v)}/{max}
                      </span>
                    </div>
                    <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full" style={{ width: `${(v / max) * 100}%`, background: scoreColor((v / max) * 100) }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {rejected && <p className="mt-3 text-[11px] text-red-600">Poängen är begränsad till max 25 eftersom avgörande hinder finns.</p>}
          </div>
          <div className="flex gap-2 rounded-xl bg-sky-50 p-3 text-[11px] leading-relaxed text-sky-800">
            <Info size={14} className="mt-0.5 shrink-0" />
            Poängen visar indikativ matchningspotential enligt regelmotorn. Den är inte en sannolikhet för att samarbetet lyckas.
          </div>
        </aside>
      </div>
    </Modal>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-semibold text-emerald-700">{n}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function List({ items, tone }: { items: string[]; tone?: 'red' | 'amber' }) {
  const dot = tone === 'red' ? 'bg-red-400' : tone === 'amber' ? 'bg-amber-400' : 'bg-emerald-400';
  return (
    <ul className="space-y-1.5">
      {items.map((t) => (
        <li key={t} className="flex gap-2 text-sm leading-relaxed text-slate-600">
          <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
          {t}
        </li>
      ))}
    </ul>
  );
}
