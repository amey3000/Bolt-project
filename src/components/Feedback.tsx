import { Loader2, type LucideIcon } from 'lucide-react';

export function Spinner({ className = '', size = 20 }: { className?: string; size?: number }) {
  return (
    <Loader2 className={`animate-spin text-brand-500 ${className}`} size={size} />
  );
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Spinner size={28} />
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
        <Icon size={22} className="text-slate-400" />
      </div>
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
