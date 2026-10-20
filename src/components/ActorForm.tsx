import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, ArrowLeft, Crosshair, MapPin, Save } from 'lucide-react';
import type { ActorType, Municipality } from '../types';
import { ACTOR_TYPE_LABELS, COUNTY_BOUNDS, EMPLOYEE_RANGES, INDUSTRIES, MUNICIPALITIES } from '../data/taxonomy';
import { useApp, type Editor } from '../state/AppContext';
import { nearestPlace } from '../services/dataStore';
import { formatKm } from '../services/distanceCalculator';
import { Button, Field } from './ui';

/** Redigeringspanel för aktör och arbetsställe. Position sätts genom kartklick eller genom att dra markören. */
export default function ActorForm({ editor }: { editor: Editor }) {
  if (editor.kind === 'actor-create' || editor.kind === 'actor-edit') {
    return <ActorEditor key={editor.kind === 'actor-edit' ? editor.actorId : 'new'} actorId={editor.kind === 'actor-edit' ? editor.actorId : null} />;
  }
  return (
    <FacilityEditor
      key={editor.kind === 'facility-edit' ? editor.facilityId : `new-${editor.actorId}`}
      facilityId={editor.kind === 'facility-edit' ? editor.facilityId : null}
      actorId={editor.kind === 'facility-create' ? editor.actorId : null}
    />
  );
}

function useEscapeToClose(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[role="dialog"]')) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
}

function ActorEditor({ actorId }: { actorId: string | null }) {
  const { index, draft, setDraft, setEditor, createActor, updateActor, selectActor } = useApp();
  const actor = actorId ? index.actorById.get(actorId) : undefined;
  const facility = actorId ? index.facilitiesByActor.get(actorId)?.[0] : undefined;

  const [name, setName] = useState(actor?.name ?? '');
  const [actorType, setActorType] = useState<ActorType>(actor?.actorType ?? 'company');
  const [industry, setIndustry] = useState(actor?.industry ?? INDUSTRIES[0]);
  const [description, setDescription] = useState(actor?.description ?? '');
  const [municipality, setMunicipality] = useState<Municipality>(actor?.municipality ?? 'Jönköping');
  const [municipalityTouched, setMunicipalityTouched] = useState(!!actor);
  const [employeeRange, setEmployeeRange] = useState(actor?.employeeRange ?? EMPLOYEE_RANGES[1]);
  const [facilityName, setFacilityName] = useState(facility?.name ?? '');
  const [processes, setProcesses] = useState(facility?.processes.join(', ') ?? '');
  const [submitted, setSubmitted] = useState(false);

  // Vid redigering startar utkastmarkören på arbetsställets nuvarande position
  useEffect(() => {
    setDraft(facility ? { latitude: facility.latitude, longitude: facility.longitude } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const near = useMemo(() => (draft ? nearestPlace(draft.latitude, draft.longitude) : null), [draft]);
  useEffect(() => {
    if (near && !municipalityTouched) setMunicipality(near.place.municipality);
  }, [near, municipalityTouched]);

  const close = () => {
    setEditor(null);
    setDraft(null);
  };
  useEscapeToClose(close);

  const errors = {
    name: !name.trim() ? 'Ange ett namn' : null,
    location: !draft ? 'Placera aktören på kartan' : null,
  };
  const valid = !errors.name && !errors.location;

  const save = () => {
    setSubmitted(true);
    if (!valid || !draft) return;
    const actorInput = { name: name.trim(), actorType, industry, description: description.trim(), municipality, employeeRange };
    const facilityInput = {
      name: facilityName.trim() || `${name.trim()} – huvudanläggning`,
      latitude: draft.latitude,
      longitude: draft.longitude,
      processes: splitList(processes),
    };
    if (actor && facility) {
      updateActor(actor.id, actorInput, { id: facility.id, patch: facilityInput });
      selectActor(actor.id);
    } else {
      const id = createActor(actorInput, facilityInput);
      selectActor(id);
    }
    close();
  };

  return (
    <EditorShell
      title={actor ? 'Redigera aktör' : 'Lägg till aktör'}
      subtitle={actor ? actor.name : 'Ny aktör registreras som användarregistrerad i demosystemet'}
      onCancel={close}
      onSave={save}
      saveLabel={actor ? 'Spara ändringar' : 'Lägg till på kartan'}
    >
      <LocationBox near={near} error={submitted ? errors.location : null} hint={actor ? 'Dra markören eller klicka på kartan för att flytta aktören.' : undefined} />

      <Field label="Namn *">
        <input className={`input ${submitted && errors.name ? '!border-red-400' : ''}`} value={name} onChange={(e) => setName(e.target.value)} placeholder="t.ex. Exempelbolaget AB" autoFocus />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Aktörstyp">
          <select className="input" value={actorType} onChange={(e) => setActorType(e.target.value as ActorType)}>
            {(Object.keys(ACTOR_TYPE_LABELS) as ActorType[]).map((t) => (
              <option key={t} value={t}>
                {ACTOR_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Antal anställda">
          <select className="input" value={employeeRange} onChange={(e) => setEmployeeRange(e.target.value)}>
            {EMPLOYEE_RANGES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Bransch">
          <select className="input" value={industry} onChange={(e) => setIndustry(e.target.value)}>
            {INDUSTRIES.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </select>
        </Field>
        <Field label="Kommun" hint={!municipalityTouched && near ? 'Förifylld utifrån position' : undefined}>
          <select
            className="input"
            value={municipality}
            onChange={(e) => {
              setMunicipality(e.target.value as Municipality);
              setMunicipalityTouched(true);
            }}
          >
            {MUNICIPALITIES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Verksamhetsbeskrivning" hint="Används av funktionen Identifiera potentiella resurser.">
        <textarea className="input min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="t.ex. Sågverk med torkprocess…" />
      </Field>
      <div className="border-t border-slate-100 pt-4">
        <div className="section-title mb-3">Arbetsställe</div>
        <div className="space-y-3">
          <Field label="Namn på arbetsställe">
            <input className="input" value={facilityName} onChange={(e) => setFacilityName(e.target.value)} placeholder="t.ex. Fabriken Huskvarna" />
          </Field>
          <Field label="Produktionsprocesser" hint="Separera med kommatecken, t.ex. sågning, torkning">
            <input className="input" value={processes} onChange={(e) => setProcesses(e.target.value)} />
          </Field>
        </div>
      </div>
    </EditorShell>
  );
}

function FacilityEditor({ facilityId, actorId }: { facilityId: string | null; actorId: string | null }) {
  const { index, draft, setDraft, setEditor, addFacility, updateFacility } = useApp();
  const facility = facilityId ? index.facilityById.get(facilityId) : undefined;
  const owner = index.actorById.get(facility?.actorId ?? actorId ?? '');
  const [name, setName] = useState(facility?.name ?? '');
  const [processes, setProcesses] = useState(facility?.processes.join(', ') ?? '');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setDraft(facility ? { latitude: facility.latitude, longitude: facility.longitude } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const near = useMemo(() => (draft ? nearestPlace(draft.latitude, draft.longitude) : null), [draft]);

  const close = () => {
    setEditor(null);
    setDraft(null);
  };
  useEscapeToClose(close);

  const save = () => {
    setSubmitted(true);
    if (!draft || !name.trim() || !owner) return;
    const input = { name: name.trim(), latitude: draft.latitude, longitude: draft.longitude, processes: splitList(processes) };
    if (facility) updateFacility(facility.id, input);
    else addFacility(owner.id, input);
    close();
  };

  return (
    <EditorShell title={facility ? 'Redigera arbetsställe' : 'Nytt arbetsställe'} subtitle={owner?.name} onCancel={close} onSave={save} saveLabel="Spara arbetsställe">
      <LocationBox near={near} error={submitted && !draft ? 'Placera arbetsstället på kartan' : null} />
      <Field label="Namn *">
        <input className={`input ${submitted && !name.trim() ? '!border-red-400' : ''}`} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Field>
      <Field label="Produktionsprocesser" hint="Separera med kommatecken">
        <input className="input" value={processes} onChange={(e) => setProcesses(e.target.value)} />
      </Field>
    </EditorShell>
  );
}

function EditorShell({
  title,
  subtitle,
  children,
  onCancel,
  onSave,
  saveLabel,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onCancel: () => void;
  onSave: () => void;
  saveLabel: string;
}) {
  return (
    <form
      className="flex h-full flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <div className="border-b border-slate-100 px-5 py-4">
        <button type="button" onClick={onCancel} className="mb-2 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
          <ArrowLeft size={14} /> Avbryt (Esc)
        </button>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">{children}</div>
      <div className="flex gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
        <Button onClick={onCancel} className="flex-1">
          Avbryt
        </Button>
        <Button variant="primary" type="submit" icon={<Save size={15} />} className="flex-[2]">
          {saveLabel}
        </Button>
      </div>
    </form>
  );
}

function LocationBox({ near, error, hint }: { near: ReturnType<typeof nearestPlace> | null; error: string | null; hint?: string }) {
  const { draft, setDraft } = useApp();
  const outside =
    draft &&
    (draft.latitude < COUNTY_BOUNDS.south || draft.latitude > COUNTY_BOUNDS.north || draft.longitude < COUNTY_BOUNDS.west || draft.longitude > COUNTY_BOUNDS.east);

  if (!draft) {
    return (
      <div className={`flex items-start gap-3 rounded-xl border-2 border-dashed p-4 ${error ? 'border-red-300 bg-red-50' : 'border-violet-300 bg-violet-50'}`}>
        <Crosshair size={20} className={`mt-0.5 shrink-0 ${error ? 'text-red-500' : 'text-violet-600'}`} />
        <div>
          <div className={`text-sm font-medium ${error ? 'text-red-700' : 'text-violet-800'}`}>Klicka på kartan för att välja position</div>
          <div className="text-xs text-violet-700/80">Markören kan sedan dras för att finjustera läget.</div>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3">
      <div className="flex items-center gap-2 text-sm font-medium text-violet-800">
        <MapPin size={16} />
        {near ? `Nära ${near.place.name} (${formatKm(near.km)})` : 'Vald position'}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[10px] font-medium uppercase tracking-wide text-violet-700/70">Latitud</span>
          <input
            className="input !py-1 font-mono text-xs"
            type="number"
            step="0.0001"
            value={draft.latitude}
            onChange={(e) => e.target.value && setDraft({ ...draft, latitude: Number(e.target.value) })}
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-medium uppercase tracking-wide text-violet-700/70">Longitud</span>
          <input
            className="input !py-1 font-mono text-xs"
            type="number"
            step="0.0001"
            value={draft.longitude}
            onChange={(e) => e.target.value && setDraft({ ...draft, longitude: Number(e.target.value) })}
          />
        </label>
      </div>
      <p className="mt-2 text-[11px] text-violet-700/80">{hint ?? 'Klicka på kartan eller dra markören för att ändra position.'}</p>
      {outside && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-700">
          <AlertTriangle size={13} /> Positionen ligger utanför Jönköpings län.
        </p>
      )}
    </div>
  );
}

function splitList(s: string) {
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}
