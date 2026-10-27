import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, LogIn, LogOut, MapPin, Plus, UserPlus, XCircle } from 'lucide-react';
import { useAuth } from '../state/AuthContext';
import { useApp } from '../state/AppContext';
import { Badge, Button, Field } from '../components/ui';

type Mode = 'login' | 'register';

export default function AccountPage() {
  const { account } = useAuth();
  return <div className="mx-auto max-w-md px-4 py-8">{account ? <AccountStatus /> : <AuthForms />}</div>;
}

function AuthForms() {
  const { login, register } = useAuth();
  const { notify } = useApp();
  const [mode, setMode] = useState<Mode>('login');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', organisation: '', password: '', message: '' });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const res = mode === 'login' ? login(form.email, form.password) : register(form);
    if (!res.ok) return setError(res.error);
    setError('');
    notify(mode === 'login' ? `Inloggad som ${res.value.name}` : 'Ansökan skickad – en administratör granskar den', mode === 'login' ? 'success' : 'info');
  };

  return (
    <div className="card p-6">
      <div className="mb-5 flex rounded-lg bg-slate-100 p-1 text-sm">
        {(['login', 'register'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError('');
            }}
            className={`flex-1 rounded-md py-1.5 font-medium transition ${mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
          >
            {m === 'login' ? 'Logga in' : 'Registrera konto'}
          </button>
        ))}
      </div>

      <p className="mb-4 text-sm text-slate-500">
        {mode === 'login'
          ? 'Alla kan se och söka på kartan. Logga in för att registrera och uppdatera din egen verksamhet.'
          : 'Ansök om ett konto för att lägga till din verksamhet med resurser och behov. En administratör godkänner kontot innan du kan redigera.'}
      </p>

      <form onSubmit={submit} className="space-y-3">
        {mode === 'register' && (
          <>
            <Field label="Namn">
              <input className="input" value={form.name} onChange={set('name')} autoComplete="name" />
            </Field>
            <Field label="Organisation">
              <input className="input" value={form.organisation} onChange={set('organisation')} autoComplete="organization" />
            </Field>
          </>
        )}
        <Field label="E-post">
          <input className="input" type="email" value={form.email} onChange={set('email')} autoComplete="email" />
        </Field>
        <Field label="Lösenord" hint={mode === 'register' ? 'Minst 6 tecken' : undefined}>
          <input className="input" type="password" value={form.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </Field>
        {mode === 'register' && (
          <Field label="Meddelande till administratören (valfritt)">
            <textarea className="input min-h-[72px]" value={form.message} onChange={set('message')} placeholder="T.ex. vilka resurser eller behov ni har" />
          </Field>
        )}
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Button type="submit" variant="primary" className="w-full" icon={mode === 'login' ? <LogIn size={16} /> : <UserPlus size={16} />}>
          {mode === 'login' ? 'Logga in' : 'Skicka ansökan'}
        </Button>
      </form>

      <p className="mt-4 text-[11px] leading-relaxed text-slate-400">Demo: konton sparas bara i den här webbläsaren och är inte skyddade. Använd inte ett riktigt lösenord.</p>
    </div>
  );
}

function AccountStatus() {
  const { account, logout } = useAuth();
  const { index, ownActorId, canCreate, isAdmin, selectActor, setEditor, setDraft } = useApp();
  const navigate = useNavigate();
  if (!account) return null;
  const actor = ownActorId ? index.actorById.get(ownActorId) : undefined;

  const status = {
    pending: {
      icon: <Clock size={18} className="text-amber-600" />,
      text: 'Din ansökan väntar på godkännande. Du kan se och söka på kartan under tiden.',
      cls: 'bg-amber-50 text-amber-800',
    },
    approved: {
      icon: <CheckCircle2 size={18} className="text-emerald-600" />,
      text: isAdmin ? 'Du är administratör och kan redigera alla aktörer.' : 'Ditt konto är godkänt.',
      cls: 'bg-emerald-50 text-emerald-800',
    },
    rejected: {
      icon: <XCircle size={18} className="text-red-600" />,
      text: 'Ditt konto har inte godkänts. Kontakta Science Park Jönköping vid frågor.',
      cls: 'bg-red-50 text-red-800',
    },
  }[account.status];

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-900">{account.name}</h1>
          <div className="text-sm text-slate-500">
            {account.organisation} · {account.email}
          </div>
        </div>
        {isAdmin && <Badge className="bg-slate-900 text-white">Admin</Badge>}
      </div>

      <div className={`mt-4 flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-sm ${status.cls}`}>
        <span className="mt-0.5 shrink-0">{status.icon}</span>
        {status.text}
      </div>

      {account.status === 'approved' && !isAdmin && (
        <div className="mt-5">
          <div className="section-title mb-2">Din verksamhet</div>
          {actor ? (
            <Button
              className="w-full"
              icon={<MapPin size={15} />}
              onClick={() => {
                selectActor(actor.id);
                navigate('/');
              }}
            >
              Visa och redigera {actor.name}
            </Button>
          ) : (
            canCreate && (
              <Button
                variant="primary"
                className="w-full"
                icon={<Plus size={15} />}
                onClick={() => {
                  selectActor(null);
                  setDraft(null);
                  setEditor({ kind: 'actor-create' });
                  navigate('/');
                }}
              >
                Lägg till din verksamhet på kartan
              </Button>
            )
          )}
        </div>
      )}

      <Button className="mt-5 w-full" variant="ghost" icon={<LogOut size={15} />} onClick={logout}>
        Logga ut
      </Button>
    </div>
  );
}
