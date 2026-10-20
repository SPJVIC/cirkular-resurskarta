import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { X } from 'lucide-react';
import type { MarkerKind, MatchStatus, VerificationStatus } from '../types';
import { MARKER_COLORS, MATCH_STATUS_LABELS, VERIFICATION_LABELS } from '../data/taxonomy';
import { scoreColor } from './scoreColor';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
  secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-white text-red-600 border border-red-200 hover:bg-red-50',
  subtle: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  icon,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md'; icon?: ReactNode }) {
  const sz = size === 'sm' ? 'px-2.5 py-1.5 text-xs gap-1.5' : 'px-3.5 py-2 text-sm gap-2';
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${sz} ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

export function Badge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}>{children}</span>
  );
}

const VERIFICATION_STYLE: Record<VerificationStatus, string> = {
  verified: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  self_reported: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  unverified: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
};

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  return <Badge className={VERIFICATION_STYLE[status]}>{VERIFICATION_LABELS[status]}</Badge>;
}

const STATUS_STYLE: Record<MatchStatus, string> = {
  potential: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  needs_verification: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  rejected: 'bg-red-50 text-red-700 ring-1 ring-red-200',
};

export function MatchStatusBadge({ status }: { status: MatchStatus }) {
  return <Badge className={STATUS_STYLE[status]}>{MATCH_STATUS_LABELS[status]}</Badge>;
}

export function ScorePill({ score, rejected = false }: { score: number; rejected?: boolean }) {
  return (
    <span
      className="inline-flex items-baseline gap-0.5 rounded-lg px-2 py-1 text-sm font-semibold text-white"
      style={{ background: scoreColor(score, rejected) }}
      title="Indikativ matchningspotential (0–100) – inte sannolikhet för lyckat samarbete"
    >
      {score}
      <span className="text-[10px] font-normal opacity-80">/100</span>
    </span>
  );
}

export function MarkerDot({ kind, size = 10 }: { kind: MarkerKind; size?: number }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full ring-2 ring-white"
      style={{ width: size, height: size, background: MARKER_COLORS[kind], boxShadow: '0 0 0 1px rgba(0,0,0,.08)' }}
    />
  );
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'max-w-2xl',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className={`flex max-h-[92vh] w-full ${width} flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {subtitle && <div className="mt-0.5 text-sm text-slate-500">{subtitle}</div>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Stäng">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      width="max-w-md"
      footer={
        <>
          <Button onClick={onCancel}>Avbryt</Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm text-slate-600">{message}</div>
    </Modal>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-3 rounded-full bg-slate-100 p-3 text-slate-400">{icon}</div>
      <div className="text-sm font-medium text-slate-700">{title}</div>
      {children && <div className="mt-1 text-sm text-slate-500">{children}</div>}
    </div>
  );
}
