import { useMemo, useState } from 'react';
import { Bot, Check, Pencil, Plus, X } from 'lucide-react';
import type { Actor, Resource } from '../types';
import { CATEGORY_LABELS } from '../data/taxonomy';
import { useApp } from '../state/AppContext';
import { inferPotentialResources, ruleBasedInferenceProvider, type ResourceSuggestion } from '../services/resourceInference';
import { blankResource, newId } from '../services/dataStore';
import { ResourceForm } from './ResourceForm';
import { Badge, Button } from './ui';

/**
 * Visar förslag från den (simulerade) inferensmotorn. Användaren kan granska,
 * redigera, lägga till, avvisa eller markera förslag som verifierade.
 */
export default function InferencePanel({ actor, onClose }: { actor: Actor; onClose: () => void }) {
  const { index, saveResource } = useApp();
  const facilities = index.facilitiesByActor.get(actor.id) ?? [];
  const existing = index.resourcesByActor.get(actor.id) ?? [];

  // Förslagen beräknas en gång när panelen öppnas så att tillagda/avvisade inte dyker upp igen
  const [suggestions, setSuggestions] = useState<ResourceSuggestion[]>(() =>
    inferPotentialResources({ actor, facilities, existingResources: existing }),
  );
  const [verified, setVerified] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<{ resource: Resource; suggestionId: string } | null>(null);

  const toResource = (s: ResourceSuggestion): Resource => ({
    ...blankResource(s.facilityId),
    id: newId('r'),
    category: s.category,
    material: s.material,
    description: `${s.description} Motivering: ${s.motivation}`,
    unit: s.unit,
    classification: s.classification,
    source: 'inference',
    verificationStatus: verified.has(s.id) ? 'verified' : 'unverified',
  });

  const remove = (id: string) => setSuggestions((list) => list.filter((x) => x.id !== id));

  const words = useMemo(() => [...new Set(suggestions.flatMap((s) => s.matchedKeywords))], [suggestions]);

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/50">
      <div className="flex items-start justify-between gap-2 border-b border-violet-100 px-4 py-3">
        <div>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-violet-800">
            <Bot size={16} /> Potentiella resurser
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-violet-700/80">
            Simulerad AI: {ruleBasedInferenceProvider.name.toLowerCase()}. Förslagen bygger på verksamhetsbeskrivning och registrerade processer.
          </p>
        </div>
        <button type="button" onClick={onClose} className="rounded p-1 text-violet-400 hover:bg-violet-100 hover:text-violet-700" aria-label="Stäng förslag">
          <X size={16} />
        </button>
      </div>

      <div className="space-y-2 p-3">
        {words.length > 0 && (
          <div className="text-[11px] text-slate-500">
            Identifierade nyckelord: {words.map((w) => <Badge key={w} className="mr-1 bg-white text-violet-700 ring-1 ring-violet-200">{w}</Badge>)}
          </div>
        )}
        {suggestions.length === 0 && (
          <p className="px-1 py-3 text-center text-xs text-slate-500">
            Inga (fler) förslag. Lägg till fler processer eller en utförligare verksamhetsbeskrivning för att få förslag.
          </p>
        )}
        {suggestions.map((s) => (
          <div key={s.id} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-800">{CATEGORY_LABELS[s.category]}</div>
                <div className="text-xs text-slate-500">{s.material}</div>
              </div>
              <Badge className={verified.has(s.id) ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'}>
                {verified.has(s.id) ? 'VERIFIERAD (demo)' : 'EJ VERIFIERAD'}
              </Badge>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">{s.motivation}</p>
            <div className="mt-1 text-[11px] text-slate-400">
              Utlöst av: {s.matchedKeywords.join(', ')} · Säkerhet: {s.confidence}
            </div>
            <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                className="accent-emerald-600"
                checked={verified.has(s.id)}
                onChange={(e) =>
                  setVerified((v) => {
                    const next = new Set(v);
                    if (e.target.checked) next.add(s.id);
                    else next.delete(s.id);
                    return next;
                  })
                }
              />
              Markera som verifierad i demosystemet
            </label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Button
                size="sm"
                variant="primary"
                icon={<Plus size={13} />}
                onClick={() => {
                  saveResource(toResource(s));
                  remove(s.id);
                }}
              >
                Lägg till
              </Button>
              <Button size="sm" icon={<Pencil size={13} />} onClick={() => setEditing({ resource: toResource(s), suggestionId: s.id })}>
                Redigera
              </Button>
              <Button size="sm" variant="ghost" icon={<X size={13} />} onClick={() => remove(s.id)}>
                Avvisa
              </Button>
            </div>
          </div>
        ))}
        {suggestions.length > 0 && (
          <p className="flex items-center gap-1 px-1 text-[11px] text-slate-400">
            <Check size={12} /> Tillagda resurser matchas automatiskt mot registrerade behov.
          </p>
        )}
      </div>

      {editing && (
        <ResourceForm
          isNew
          initial={editing.resource}
          facilities={facilities}
          onClose={() => {
            // Förslaget räknas som hanterat om resursen sparades
            setEditing(null);
          }}
          onSaved={() => remove(editing.suggestionId)}
        />
      )}
    </div>
  );
}
