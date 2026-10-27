import { NavLink } from 'react-router-dom';
import { Building2, GitMerge, LogIn, Map as MapIcon, Recycle, ShieldCheck, UserRound } from 'lucide-react';
import { useApp } from '../state/AppContext';
import { useAuth } from '../state/AuthContext';
import { DEMO_LABEL } from '../data/taxonomy';

const NAV = [
  { to: '/', label: 'Karta', icon: MapIcon },
  { to: '/matchningar', label: 'Matchningar', icon: GitMerge },
  { to: '/aktorer', label: 'Aktörer', icon: Building2 },
];

export default function Header() {
  const { isAdmin } = useApp();
  const { account, accounts } = useAuth();
  const pending = isAdmin ? accounts.filter((a) => a.status === 'pending').length : 0;
  const nav = isAdmin ? [...NAV, { to: '/admin', label: 'Admin', icon: ShieldCheck }] : NAV;
  return (
    <header className="z-[1100] border-b border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 lg:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Recycle size={18} />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold text-slate-900">Cirkulär Resurskarta</div>
            <div className="text-[11px] text-slate-500">Jönköpings län · AIT-04</div>
          </div>
        </div>
        <nav className="order-3 flex w-full gap-1 sm:order-none sm:w-auto">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition sm:flex-none ${
                  isActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <Icon size={16} />
              {label}
              {to === '/admin' && pending > 0 && <span className="rounded-full bg-amber-500 px-1.5 text-[10px] font-semibold text-white">{pending}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200 md:inline">
            {DEMO_LABEL}
          </span>
          <NavLink
            to="/konto"
            className={({ isActive }) =>
              `flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${isActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'}`
            }
          >
            {account ? <UserRound size={14} /> : <LogIn size={14} />}
            <span className="max-w-[140px] truncate">{account ? account.name : 'Logga in'}</span>
            {account?.status === 'pending' && <span className="rounded-full bg-amber-100 px-1.5 text-[10px] text-amber-700">väntar</span>}
          </NavLink>
        </div>
      </div>
    </header>
  );
}
