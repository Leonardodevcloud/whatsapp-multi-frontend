// src/components/ui/index.jsx
// Design System — componentes primitivos
import { cn, iniciais } from '../../lib/utils';
import { X, Loader2 } from 'lucide-react';

// ============================================================
// Button
// ============================================================
export function Button({ children, variant = 'primary', size = 'md', loading, className, ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-dark active:scale-[0.98]',
    secondary: 'bg-[var(--color-surface-elevated)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-border)] dark:bg-surface-dark-elevated dark:hover:bg-border-dark',
    ghost: 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)] dark:hover:bg-surface-dark-elevated',
    danger: 'bg-red-500 text-white hover:bg-red-600 active:scale-[0.98]',
  };
  const sizes = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
    icon: 'h-9 w-9 p-0',
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
    </button>
  );
}

// ============================================================
// Badge
// ============================================================
export function Badge({ children, variant = 'default', className }) {
  const variants = {
    default: 'bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)]',
    primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  );
}

// ============================================================
// Avatar
// ============================================================
export function Avatar({ nome, src, online, size = 'md', className }) {
  const sizes = { sm: 'w-7 h-7 text-2xs', md: 'w-9 h-9 text-xs', lg: 'w-12 h-12 text-sm', xl: 'w-16 h-16 text-lg' };
  const dotSizes = { sm: 'w-2 h-2', md: 'w-2.5 h-2.5', lg: 'w-3 h-3', xl: 'w-3.5 h-3.5' };

  return (
    <div className={cn('relative shrink-0', className)}>
      {src ? (
        <img src={src} alt={nome} className={cn('rounded-full object-cover', sizes[size])} />
      ) : (
        <div className={cn('rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center', sizes[size])}>
          {iniciais(nome)}
        </div>
      )}
      {online !== undefined && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-[var(--color-surface)]',
            dotSizes[size],
            online ? 'bg-emerald-500' : 'bg-neutral-400'
          )}
        />
      )}
    </div>
  );
}

// ============================================================
// Input
// ============================================================
export function Input({ label, error, className, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-[var(--color-text-secondary)]">{label}</label>}
      <input
        className={cn(
          'w-full h-10 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text)]',
          'placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary',
          'transition-all duration-150',
          error && 'border-red-500 focus:ring-red-500/40',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ============================================================
// Skeleton Loader
// ============================================================
export function Skeleton({ className }) {
  return (
    <div className={cn('animate-pulse rounded-lg bg-[var(--color-surface-elevated)] dark:bg-surface-dark-elevated', className)} />
  );
}

// ============================================================
// Modal
// ============================================================
export function Modal({ aberto, onFechar, titulo, children, className }) {
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onFechar} />
      <div className={cn(
        'relative bg-[var(--color-surface)] rounded-xl shadow-2xl border border-[var(--color-border)] p-6 animate-slide-up max-h-[90vh] overflow-y-auto',
        'w-full max-w-md mx-4',
        className
      )}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-semibold">{titulo}</h2>
          <button onClick={onFechar} className="p-1 rounded-lg hover:bg-[var(--color-surface-elevated)] transition-colors">
            <X className="w-5 h-5 text-[var(--color-text-muted)]" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ============================================================
// EmptyState
// ============================================================
export function EmptyState({ icone: Icone, titulo, descricao, acao }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icone && (
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Icone className="w-8 h-8 text-primary" />
        </div>
      )}
      <h3 className="text-base font-semibold text-[var(--color-text)] mb-1">{titulo}</h3>
      {descricao && <p className="text-sm text-[var(--color-text-muted)] max-w-xs">{descricao}</p>}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  );
}

// ============================================================
// Toggle Switch
// ============================================================
export function Toggle({ checked, onChange, label }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <div className="relative">
        <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
        <div className={cn('w-10 h-6 rounded-full transition-colors', checked ? 'bg-primary' : 'bg-neutral-300 dark:bg-neutral-600')} />
        <div className={cn('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', checked && 'translate-x-4')} />
      </div>
      {label && <span className="text-sm text-[var(--color-text-secondary)]">{label}</span>}
    </label>
  );
}
