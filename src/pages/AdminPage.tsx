import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Check, RotateCcw, ShieldCheck, Trash2, UserX, X } from 'lucide-react';
import type { Account, AccountStatus } from '../types';
import { useAuth } from '../state/AuthContext';
import { useApp } from '../state/AppContext';
import { Badge, Button, ConfirmDialog, EmptyState } from '../components/ui';

const TABS: { status: AccountStatus; label: string }[] = [
  { status: 'pending', label: 'Väntar på godkännande' },
  { status: 'approved', label: 'Godkända' },
  { status: 'rejected', label: 'Avvisade' },
];

export default function AdminPage() {
  const { accounts } = useAuth();
  const { isAdmin, resetData } = useApp();
  const [tab, setTab] = useState<AccountStatus>('pending');
  const [confirmReset, setConfirmReset] = useState(false);
  if (!isAdmin) return <Navigate to="/konto" replace />;

  const rows = accounts.filter((a) => a.status === tab).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            <ShieldCheck size={20} className="text-emerald-600" /> Administration
          </h1>
          <p className="mt-1 text-sm text-slate-500">Godkänn konton och koppla dem till den aktör de får redigera.</p>
        </div>
        <Button size="sm" variant="ghost" icon={<RotateCcw size={14} />} onClick={() => setConfirmReset(true)}>
          Återställ demonstrationsdata
        </Button>
      </div>

      <div className="mt-5 flex gap-1 border-b border-slate-200 text-sm">
        {TABS.map((t) => {
          const n = accounts.filter((a) => a.status === t.status).length;
          return (
            <button
              key={t.status}
              type="button"
              onClick={() => setTab(t.status)}
              className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 font-medium ${tab === t.status ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              {t.label}
              <span className={`rounded-full px-1.5 text-[10px] font-semibold ${t.status === 'pending' && n > 0 ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {n}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 space-y-3">
        {rows.length === 0 ? <EmptyState icon={<Check size={20} />} title="Inga konton här" /> : rows.map((a) => <AccountRow key={a.id} account={a} />)}
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Återställ demonstrationsdata?"
        message="Alla ändringar av aktörer, resurser och behov tas bort och den ursprungliga demonstrationsdatan laddas in igen. Konton påverkas inte."
        confirmLabel="Återställ"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          resetData();
          setConfirmReset(false);
        }}
      />
    </div>
  );
}

function AccountRow({ account }: { account: Account }) {
  const { accounts, account: me, approve, reject, setActor, removeAccount } = useAuth();
  const { data, index, notify } = useApp();
  const [actorId, setActorId] = useState(account.actorId ?? '');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const isSelf = me?.id === account.id;
  const linked = account.actorId ? index.actorById.get(account.actorId) : undefined;
  // Aktörer som redan är kopplade till ett annat konto
  const taken = new Set(accounts.filter((x) => x.id !== account.id && x.actorId).map((x) => x.actorId));
  const actors = [...data.actors].sort((a, b) => a.name.localeCompare(b.name, 'sv'));

  return (
    <div className="card p-4" data-testid="account-row">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-900">{account.name}</span>
            {account.role === 'admin' && <Badge className="bg-slate-900 text-white">Admin</Badge>}
            {isSelf && <Badge className="bg-slate-100 text-slate-600">Du</Badge>}
          </div>
          <div className="text-sm text-slate-500">
            {account.organisation} · {account.email} · registrerad {account.createdAt}
          </div>
          {account.message && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm italic text-slate-600">”{account.message}”</p>}
        </div>
      </div>

      {account.role !== 'admin' && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <select className="input max-w-xs py-1.5 text-xs" value={actorId} onChange={(e) => setActorId(e.target.value)} aria-label="Koppla till aktör">
            <option value="">Ingen aktör – användaren lägger till sin egen</option>
            {actors.map((x) => (
              <option key={x.id} value={x.id} disabled={taken.has(x.id)}>
                {x.name} ({x.municipality}){taken.has(x.id) ? ' – kopplad till annat konto' : ''}
              </option>
            ))}
          </select>

          {account.status === 'pending' && (
            <>
              <Button
                size="sm"
                variant="primary"
                icon={<Check size={14} />}
                onClick={() => {
                  approve(account.id, actorId || null);
                  notify(`${account.name} har godkänts`);
                }}
              >
                Godkänn
              </Button>
              <Button
                size="sm"
                variant="danger"
                icon={<X size={14} />}
                onClick={() => {
                  reject(account.id);
                  notify(`${account.name} har avvisats`, 'info');
                }}
              >
                Avvisa
              </Button>
            </>
          )}

          {account.status === 'approved' && (
            <>
              <Button
                size="sm"
                disabled={(actorId || null) === account.actorId}
                onClick={() => {
                  setActor(account.id, actorId || null);
                  notify('Kopplingen har uppdaterats');
                }}
              >
                Spara koppling
              </Button>
              <Button
                size="sm"
                variant="danger"
                icon={<UserX size={14} />}
                onClick={() => {
                  reject(account.id);
                  notify(`Behörigheten för ${account.name} har återkallats`, 'info');
                }}
              >
                Återkalla
              </Button>
            </>
          )}

          {account.status === 'rejected' && (
            <Button
              size="sm"
              icon={<Check size={14} />}
              onClick={() => {
                approve(account.id, actorId || null);
                notify(`${account.name} har godkänts`);
              }}
            >
              Godkänn ändå
            </Button>
          )}

          <span className="ml-auto text-xs text-slate-400">{linked ? `Redigerar: ${linked.name}` : account.status === 'approved' ? 'Ingen aktör ännu' : ''}</span>
          <Button size="sm" variant="ghost" aria-label="Ta bort konto" title="Ta bort konto" onClick={() => setConfirmRemove(true)}>
            <Trash2 size={14} />
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmRemove}
        title={`Ta bort kontot för ${account.name}?`}
        message="Kontot tas bort. Aktören och dess data ligger kvar på kartan."
        confirmLabel="Ta bort konto"
        onCancel={() => setConfirmRemove(false)}
        onConfirm={() => {
          removeAccount(account.id);
          setConfirmRemove(false);
        }}
      />
    </div>
  );
}
