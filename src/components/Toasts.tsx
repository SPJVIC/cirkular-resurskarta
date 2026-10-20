import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { useApp } from '../state/AppContext';

export default function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[3000] flex w-[min(92vw,460px)] -translate-x-1/2 flex-col gap-2">
      {toasts.map((t) => {
        const Icon = t.tone === 'error' ? XCircle : t.tone === 'info' ? Info : CheckCircle2;
        const color = t.tone === 'error' ? 'text-red-500' : t.tone === 'info' ? 'text-sky-500' : 'text-emerald-500';
        return (
          <div key={t.id} role="status" className="pointer-events-auto flex items-start gap-2.5 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-xl">
            <Icon size={18} className={`mt-px shrink-0 ${color}`} />
            <span>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
