import { useState } from 'react';
import type { Availability, Facility, Need, PropertyTag, Quality, Resource, ResourceCategory, ResourceStatus, Unit, VerificationStatus } from '../types';
import {
  AVAILABILITY_LABELS,
  CATEGORIES,
  CATEGORY_LABELS,
  DEFAULT_UNIT,
  QUALITY_LABELS,
  RESOURCE_STATUS_LABELS,
  TAG_LABELS,
  TAGS,
  UNITS,
  VERIFICATION_LABELS,
} from '../data/taxonomy';
import { useApp } from '../state/AppContext';
import { Button, Field, Modal } from './ui';

/** Formulär för att skapa eller redigera en resurs (restström). */
export function ResourceForm({
  initial,
  facilities,
  onClose,
  onSaved,
  isNew,
}: {
  initial: Resource;
  facilities: Facility[];
  onClose: () => void;
  onSaved?: () => void;
  isNew: boolean;
}) {
  const { saveResource } = useApp();
  const [r, setR] = useState<Resource>(initial);
  const [submitted, setSubmitted] = useState(false);
  const set = <K extends keyof Resource>(k: K, v: Resource[K]) => setR((prev) => ({ ...prev, [k]: v }));

  const save = () => {
    setSubmitted(true);
    if (!r.material.trim()) return;
    saveResource({ ...r, material: r.material.trim(), temperatureC: r.category === 'waste_heat' ? r.temperatureC ?? null : undefined });
    onSaved?.();
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? 'Ny resurs' : 'Redigera resurs'}
      subtitle="Tillgänglig restström eller resurs från ett arbetsställe"
      footer={
        <>
          <Button onClick={onClose}>Avbryt</Button>
          <Button variant="primary" onClick={save}>
            Spara resurs
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FacilitySelect facilities={facilities} value={r.facilityId} onChange={(v) => set('facilityId', v)} />
        <CategorySelect
          value={r.category}
          onChange={(c) => setR((p) => ({ ...p, category: c, unit: DEFAULT_UNIT[c] }))}
        />
        <Field label="Material *">
          <input className={`input ${submitted && !r.material.trim() ? '!border-red-400' : ''}`} value={r.material} onChange={(e) => set('material', e.target.value)} placeholder="t.ex. Obehandlat furuspill" />
        </Field>
        <QuantityInput label="Mängd" value={r.quantity} unit={r.unit} onValue={(v) => set('quantity', v)} onUnit={(u) => set('unit', u)} />
        <div className="sm:col-span-2">
          <Field label="Beskrivning">
            <textarea className="input min-h-[60px]" value={r.description} onChange={(e) => set('description', e.target.value)} />
          </Field>
        </div>
        <Field label="Kvalitet">
          <select className="input" value={r.quality} onChange={(e) => set('quality', e.target.value as Quality)}>
            {Object.entries(QUALITY_LABELS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tillgänglighet">
          <select className="input" value={r.availability} onChange={(e) => set('availability', e.target.value as Availability)}>
            {Object.entries(AVAILABILITY_LABELS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Resursstatus">
          <select className="input" value={r.status} onChange={(e) => set('status', e.target.value as ResourceStatus)}>
            {Object.entries(RESOURCE_STATUS_LABELS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <VerificationSelect value={r.verificationStatus} onChange={(v) => set('verificationStatus', v)} />
        {r.category === 'waste_heat' && (
          <Field label="Temperatur (°C)">
            <input className="input" type="number" value={r.temperatureC ?? ''} onChange={(e) => set('temperatureC', e.target.value === '' ? null : Number(e.target.value))} />
          </Field>
        )}
        <div className="sm:col-span-2">
          <TagPicker label="Egenskaper (klassificering)" value={r.classification} onChange={(v) => set('classification', v)} />
        </div>
      </div>
    </Modal>
  );
}

/** Formulär för att registrera eller redigera ett behov. */
export function NeedForm({ initial, facilities, onClose, isNew }: { initial: Need; facilities: Facility[]; onClose: () => void; isNew: boolean }) {
  const { saveNeed } = useApp();
  const [n, setN] = useState<Need>(initial);
  const [submitted, setSubmitted] = useState(false);
  const set = <K extends keyof Need>(k: K, v: Need[K]) => setN((prev) => ({ ...prev, [k]: v }));

  const save = () => {
    setSubmitted(true);
    if (!n.material.trim()) return;
    saveNeed({ ...n, material: n.material.trim(), minTemperatureC: n.category === 'waste_heat' ? n.minTemperatureC ?? null : undefined });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? 'Nytt behov' : 'Redigera behov'}
      subtitle="Resurs eller råvara som arbetsstället behöver"
      footer={
        <>
          <Button onClick={onClose}>Avbryt</Button>
          <Button variant="primary" onClick={save}>
            Spara behov
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FacilitySelect facilities={facilities} value={n.facilityId} onChange={(v) => set('facilityId', v)} />
        <CategorySelect value={n.category} onChange={(c) => setN((p) => ({ ...p, category: c, unit: DEFAULT_UNIT[c] }))} />
        <Field label="Material/råvara *">
          <input className={`input ${submitted && !n.material.trim() ? '!border-red-400' : ''}`} value={n.material} onChange={(e) => set('material', e.target.value)} placeholder="t.ex. Torrt sågspån" />
        </Field>
        <QuantityInput label="Behov (mängd)" value={n.requiredQuantity} unit={n.unit} onValue={(v) => set('requiredQuantity', v)} onUnit={(u) => set('unit', u)} />
        <div className="sm:col-span-2">
          <Field label="Beskrivning">
            <textarea className="input min-h-[60px]" value={n.description} onChange={(e) => set('description', e.target.value)} />
          </Field>
        </div>
        <VerificationSelect value={n.verificationStatus} onChange={(v) => set('verificationStatus', v)} />
        <Field label="Max transportavstånd (km)" hint="Valfritt">
          <input className="input" type="number" value={n.maxDistanceKm ?? ''} onChange={(e) => set('maxDistanceKm', e.target.value === '' ? null : Number(e.target.value))} />
        </Field>
        {n.category === 'waste_heat' && (
          <Field label="Lägsta temperatur (°C)">
            <input className="input" type="number" value={n.minTemperatureC ?? ''} onChange={(e) => set('minTemperatureC', e.target.value === '' ? null : Number(e.target.value))} />
          </Field>
        )}
        <div className="sm:col-span-2">
          <TagPicker label="Tekniska krav" value={n.technicalRequirements} onChange={(v) => set('technicalRequirements', v)} />
        </div>
      </div>
    </Modal>
  );
}

// ----- Delade fält -----

function FacilitySelect({ facilities, value, onChange }: { facilities: Facility[]; value: string; onChange: (v: string) => void }) {
  return (
    <Field label="Arbetsställe">
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {facilities.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

function CategorySelect({ value, onChange }: { value: ResourceCategory; onChange: (c: ResourceCategory) => void }) {
  return (
    <Field label="Resurskategori">
      <select className="input" value={value} onChange={(e) => onChange(e.target.value as ResourceCategory)}>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {CATEGORY_LABELS[c]}
          </option>
        ))}
      </select>
    </Field>
  );
}

function VerificationSelect({ value, onChange }: { value: VerificationStatus; onChange: (v: VerificationStatus) => void }) {
  return (
    <Field label="Verifieringsstatus">
      <select className="input" value={value} onChange={(e) => onChange(e.target.value as VerificationStatus)}>
        {Object.entries(VERIFICATION_LABELS).map(([k, l]) => (
          <option key={k} value={k}>
            {l}
          </option>
        ))}
      </select>
    </Field>
  );
}

function QuantityInput({ label, value, unit, onValue, onUnit }: { label: string; value: number | null; unit: Unit; onValue: (v: number | null) => void; onUnit: (u: Unit) => void }) {
  return (
    <Field label={label} hint="Lämna tomt om okänt – flaggas då som osäkerhet">
      <div className="flex gap-2">
        <input className="input" type="number" min={0} value={value ?? ''} onChange={(e) => onValue(e.target.value === '' ? null : Number(e.target.value))} placeholder="Okänd" />
        <select className="input !w-28 shrink-0" value={unit} onChange={(e) => onUnit(e.target.value as Unit)}>
          {UNITS.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
      </div>
    </Field>
  );
}

function TagPicker({ label, value, onChange }: { label: string; value: PropertyTag[]; onChange: (v: PropertyTag[]) => void }) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {TAGS.map((t) => {
          const on = value.includes(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => onChange(on ? value.filter((x) => x !== t) : [...value, t])}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition ${on ? 'bg-emerald-600 text-white ring-emerald-600' : 'bg-white text-slate-600 ring-slate-200 hover:ring-slate-300'}`}
              aria-pressed={on}
            >
              {TAG_LABELS[t]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
