import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Building2, GitMerge, Map as MapIcon, Recycle, RotateCcw } from 'lucide-react';
import { useApp } from '../state/AppContext';
import { DEMO_LABEL } from '../data/taxonomy';
import { Button, ConfirmDialog } from './ui';

const NAV = [
  { to: '/', label: 'Karta', icon: MapIcon },
  { to: '/matchningar', label: 'Matchningar', icon: GitMerge },
  { to: '/aktorer', label: 'Aktörer', icon: Building2 },
];

export default function Header() {
  const { resetData } = useApp();
  const [confirm, setConfirm] = useState(false);
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
          {NAV.map(({ to, label, icon: Icon }) => (
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
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200 md:inline">
            {DEMO_LABEL}
          </span>
          <Button size="sm" variant="ghost" icon={<RotateCcw size={14} />} onClick={() => setConfirm(true)}>
            <span className="hidden sm:inline">Återställ demonstrationsdata</span>
            <span className="sm:hidden">Återställ</span>
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={confirm}
        title="Återställ demonstrationsdata?"
        message="Alla ändringar du har gjort (nya aktörer, resurser, behov och redigeringar) tas bort och den ursprungliga demonstrationsdatan laddas in igen."
        confirmLabel="Återställ"
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          resetData();
          setConfirm(false);
        }}
      />
    </header>
  );
}
