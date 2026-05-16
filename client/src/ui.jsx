import { useEffect } from 'react';

/* ---------- Icons ---------- */
const ICON_PATHS = {
  target: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 16a4 4 0 100-8 4 4 0 000 8zM12 12h.01',
  check: 'M20 6L9 17l-5-5',
  clock: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2',
  trend: 'M3 17l6-6 4 4 8-8M21 7v6h-6',
  flag: 'M4 22V4M4 4h13l-2 4 2 4H4',
  users: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13A4 4 0 0116 11',
  spark: 'M12 3l1.9 5.8L20 10l-5.8 1.9L12 18l-1.9-6.1L4 10l6.1-1.2L12 3z',
  layers: 'M12 2l9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5',
  lock: 'M5 11h14v10H5V11zM8 11V7a4 4 0 018 0v4',
  doc: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M9 13h6M9 17h6',
  alert: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18.6A1 1 0 002.7 20h18.6a1 1 0 00.9-1.4L13.7 3.9a1 1 0 00-1.7 0z',
  bolt: 'M13 2L3 14h7l-1 8 10-12h-7l1-8z',
  calendar: 'M3 5h18v16H3V5zM3 9h18M8 3v4M16 3v4',
  arrow: 'M5 12h14M13 5l7 7-7 7',
};
export function Icon({ name, className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICON_PATHS[name] || ICON_PATHS.target} />
    </svg>
  );
}

/* ---------- Surfaces ---------- */
export function Card({ children, className = '', hover = false, accent }) {
  return (
    <div
      className={`relative bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ${
        hover ? 'transition-all hover:shadow-[0_2px_4px_rgba(15,23,42,0.06),0_16px_36px_-16px_rgba(15,23,42,0.20)] hover:-translate-y-0.5' : ''
      } ${className}`}
    >
      {accent && (
        <span className={`absolute left-0 top-4 bottom-4 w-1 rounded-full ${accent}`} />
      )}
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-6 aq-fade">
      <div>
        <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

/* ---------- Button ---------- */
const btnVariants = {
  primary: 'bg-brand-500 text-ink-950 shadow-sm shadow-brand-500/30 hover:bg-brand-400 disabled:bg-brand-200 disabled:text-ink-700 disabled:shadow-none',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50',
  danger: 'bg-rose-600 text-white shadow-sm shadow-rose-600/25 hover:bg-rose-700 disabled:bg-rose-300',
  success: 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25 hover:bg-emerald-700 disabled:bg-emerald-300',
  ghost: 'text-slate-600 hover:bg-slate-100',
};
export function Button({ variant = 'primary', className = '', ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100 ${btnVariants[variant]} ${className}`}
      {...props}
    />
  );
}

/* ---------- Badge ---------- */
const badgeColors = {
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  indigo: 'bg-brand-50 text-brand-700 ring-brand-200',
};
export function Badge({ color = 'slate', children, dot = false }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${badgeColors[color]}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}

export const sheetStatusBadge = {
  draft: ['slate', 'Draft'],
  submitted: ['blue', 'Submitted'],
  approved: ['green', 'Approved'],
  returned: ['amber', 'Returned'],
};
export const goalStatusBadge = {
  'Not Started': 'slate',
  'On Track': 'amber',
  'Completed': 'green',
};

/* Accent stripe colour per thrust area (stable hash) */
const ACCENTS = ['bg-brand-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-violet-500', 'bg-teal-500'];
export function accentFor(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}

/* ---------- Form fields ---------- */
export function Field({ label, hint, error, children }) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</span>}
      {children}
      {hint && !error && <span className="block text-xs text-slate-400 mt-1">{hint}</span>}
      {error && <span className="block text-xs text-rose-600 mt-1">{error}</span>}
    </label>
  );
}
const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 disabled:bg-slate-100 disabled:text-slate-500';
export function Input(props) { return <input className={inputCls} {...props} />; }
export function Textarea(props) { return <textarea className={inputCls} {...props} />; }
export function Select({ children, ...props }) {
  return <select className={inputCls} {...props}>{children}</select>;
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    function esc(e) { if (e.key === 'Escape') onClose?.(); }
    if (open) window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full aq-pop ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">{title}</h3>
          <button onClick={onClose}
            className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 text-lg leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Data viz ---------- */
function progressColor(pct) {
  return pct >= 80 ? '#16a34a' : pct >= 50 ? '#f5a623' : pct >= 25 ? '#fb923c' : '#ef4444';
}
export function ProgressBar({ value, max = 100 }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: progressColor(pct) }} />
    </div>
  );
}

/* Circular progress ring */
export function Ring({ value, size = 72, stroke = 8, label, sublabel }) {
  const pct = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = progressColor(pct);
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef0f6" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1)' }} />
      </svg>
      <div className="absolute text-center leading-none">
        <div className="font-extrabold text-slate-900" style={{ fontSize: size * 0.26 }}>
          {label ?? `${Math.round(pct)}%`}
        </div>
        {sublabel && <div className="text-[9px] uppercase tracking-wide text-slate-400 mt-0.5">{sublabel}</div>}
      </div>
    </div>
  );
}

/* ---------- Stat ---------- */
const statTones = {
  brand: 'bg-brand-50 text-brand-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  sky: 'bg-sky-50 text-sky-600',
  rose: 'bg-rose-50 text-rose-600',
  slate: 'bg-slate-100 text-slate-500',
};
export function Stat({ label, value, sub, icon = 'target', tone = 'brand' }) {
  return (
    <Card className="p-4" hover>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
          <div className="text-2xl font-extrabold mt-1.5 text-slate-900 truncate">{value}</div>
          {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
        </div>
        <span className={`shrink-0 grid place-items-center w-10 h-10 rounded-xl ${statTones[tone]}`}>
          <Icon name={icon} className="w-5 h-5" />
        </span>
      </div>
    </Card>
  );
}

/* ---------- States ---------- */
export function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-9 w-9 rounded-full border-[3px] border-slate-200 border-t-brand-600 animate-spin" />
    </div>
  );
}

export function EmptyState({ title, hint, action, icon = 'spark' }) {
  return (
    <Card className="p-12 text-center">
      <span className="mx-auto mb-3 grid place-items-center w-14 h-14 rounded-2xl bg-brand-50 text-brand-500">
        <Icon name={icon} className="w-7 h-7" />
      </span>
      <p className="text-slate-800 font-semibold">{title}</p>
      {hint && <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </Card>
  );
}

export function Banner({ tone = 'info', children }) {
  const tones = {
    info: ['bg-blue-50 text-blue-800 border-blue-200', 'doc'],
    warn: ['bg-amber-50 text-amber-800 border-amber-200', 'alert'],
    error: ['bg-rose-50 text-rose-800 border-rose-200', 'alert'],
    success: ['bg-emerald-50 text-emerald-800 border-emerald-200', 'check'],
  };
  const [cls, icon] = tones[tone];
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${cls}`}>
      <Icon name={icon} className="w-[18px] h-[18px] mt-px shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export const UOM_LABELS = {
  numeric_min: 'Numeric — higher is better',
  numeric_max: 'Numeric — lower is better',
  percent: 'Percentage (%)',
  timeline: 'Timeline (date-based)',
  zero: 'Zero-based',
};
