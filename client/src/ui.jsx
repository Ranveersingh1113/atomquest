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
  bell: 'M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0',
  sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  search: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3',
  plus: 'M12 5v14M5 12h14',
  filter: 'M3 4h18l-7 8v6l-4 2v-8L3 4z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
};
export function Icon({ name, className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICON_PATHS[name] || ICON_PATHS.target} />
    </svg>
  );
}

/* ---------- Surfaces ---------- */
export function Card({ children, className = '', hover = false, accent }) {
  return (
    <div
      className={`relative bg-white rounded-xl border border-paper-200 shadow-[0_1px_2px_rgba(15,23,42,0.03)] ${
        hover ? 'transition-all hover:border-paper-300 hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_10px_24px_-14px_rgba(15,23,42,0.18)]' : ''
      } ${className}`}
    >
      {accent && <span className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full ${accent}`} />}
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5 aq-fade">
      <div>
        <h1 className="text-[22px] font-bold tracking-[-0.022em] text-slate-900 leading-tight">{title}</h1>
        {subtitle && <p className="text-[12.5px] text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function Kbd({ children }) {
  return <span className="kbd">{children}</span>;
}

/* Section divider */
export function Section({ title, hint, right, children }) {
  return (
    <section className="aq-fade">
      {(title || right) && (
        <div className="flex items-end justify-between mb-2.5">
          <div>
            {title && <div className="font-semibold text-slate-900 text-[13.5px] tracking-[-0.005em]">{title}</div>}
            {hint && <div className="text-[11.5px] text-slate-400 mt-0.5">{hint}</div>}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

/* ---------- Button ---------- */
const btnVariants = {
  /* gold — reserved for the ONE primary action per surface */
  primary:
    'bg-brand-500 text-ink-950 border border-brand-500 shadow-[inset_0_-1px_0_rgba(0,0,0,0.08),0_1px_0_rgba(245,166,35,0.20)] hover:bg-brand-400 disabled:bg-brand-200 disabled:text-ink-700 disabled:shadow-none',
  /* dark — secondary default for confirm/save/add actions */
  dark:
    'bg-ink-950 text-white border border-ink-950 hover:bg-ink-800 disabled:opacity-50',
  /* light — quiet secondary, most common */
  secondary:
    'bg-white text-slate-700 border border-paper-300 hover:bg-paper-50 hover:border-slate-400 disabled:opacity-50',
  /* danger / success */
  danger:
    'bg-rose-600 text-white border border-rose-600 hover:bg-rose-700 disabled:bg-rose-300',
  success:
    'bg-emerald-600 text-white border border-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300',
  /* ghost — borderless tertiary */
  ghost:
    'text-slate-600 border border-transparent hover:bg-paper-100 hover:text-slate-900',
};
const btnSizes = {
  xs: 'h-7 px-2.5 text-[11.5px] rounded-md gap-1',
  sm: 'h-8 px-3 text-[12px] rounded-lg gap-1.5',
  md: 'h-9 px-3.5 text-[12.5px] rounded-lg gap-1.5',
};
export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-100 active:scale-[0.985] disabled:cursor-not-allowed disabled:active:scale-100 ${btnSizes[size]} ${btnVariants[variant]} ${className}`}
      {...props}
    >{children}</button>
  );
}

/* ---------- Badge ---------- */
const badgeColors = {
  slate:  'bg-paper-100 text-slate-600 ring-paper-300',
  blue:   'bg-blue-50 text-blue-700 ring-blue-200',
  green:  'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber:  'bg-amber-50 text-amber-700 ring-amber-200',
  rose:   'bg-rose-50 text-rose-700 ring-rose-200',
  indigo: 'bg-brand-50 text-brand-700 ring-brand-200',
};
const dotColors = {
  slate: 'bg-slate-400', blue: 'bg-blue-500', green: 'bg-emerald-500',
  amber: 'bg-amber-500', rose: 'bg-rose-500', indigo: 'bg-brand-500',
};
export function Badge({ color = 'slate', children, dot = false }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-[2px] text-[10.5px] font-semibold uppercase tracking-[0.06em] ring-1 ring-inset ${badgeColors[color]}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[color] || 'bg-current opacity-70'}`} />}
      {children}
    </span>
  );
}

/* StatusDot — tighter than Badge, for dense tables */
export function StatusDot({ color = 'slate', children }) {
  return (
    <span className="inline-flex items-center gap-2 text-[12px] font-medium text-slate-700">
      <span className={`w-1.5 h-1.5 rounded-full ${dotColors[color] || 'bg-slate-400'}`} />
      {children}
    </span>
  );
}

export const sheetStatusBadge = {
  draft:     ['slate', 'Draft'],
  submitted: ['blue',  'Submitted'],
  approved:  ['green', 'Approved'],
  returned:  ['amber', 'Returned'],
};
export const goalStatusBadge = {
  'Not Started': 'slate',
  'On Track':    'amber',
  'Completed':   'green',
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
      {label && <span className="block text-[11.5px] font-semibold text-slate-700 mb-1.5">{label}</span>}
      {children}
      {hint && !error && <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>}
      {error && <span className="block text-[11px] text-rose-600 mt-1">{error}</span>}
    </label>
  );
}
const inputCls =
  'w-full rounded-lg border border-paper-300 bg-white px-3 py-2 text-[13px] text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 disabled:bg-paper-100 disabled:text-slate-500';
export function Input(props)    { return <input className={inputCls} {...props} />; }
export function Textarea(props) { return <textarea className={inputCls} {...props} />; }
export function Select({ children, ...props }) {
  return <select className={inputCls} {...props}>{children}</select>;
}

/* Toolbar — consistent height row for sheet/page actions */
export function Toolbar({ children, className = '' }) {
  return (
    <div className={`flex items-center gap-2 h-10 px-3 bg-paper-50 border-y border-paper-200 ${className}`}>
      {children}
    </div>
  );
}

/* SegmentedControl — quarter picker */
export function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="inline-flex items-center p-[2px] rounded-lg border border-paper-300 bg-white">
      {options.map((opt) => {
        const v = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        const disabled = typeof opt === 'object' && opt.disabled;
        const active = v === value;
        return (
          <button key={v} disabled={disabled} onClick={() => onChange?.(v)}
            className={`px-2.5 h-6 rounded-md text-[11.5px] font-semibold transition-colors num ${
              active ? 'bg-ink-950 text-white'
                     : disabled ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-600 hover:text-slate-900'}`}>
            {label}
          </button>
        );
      })}
    </div>
  );
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
        <div className="flex items-center justify-between border-b border-paper-200 px-5 py-3.5">
          <h3 className="font-semibold text-slate-900 text-[14px] tracking-[-0.005em]">{title}</h3>
          <button onClick={onClose}
            className="w-7 h-7 grid place-items-center rounded-md text-slate-400 hover:bg-paper-100 hover:text-slate-700 text-lg leading-none">×</button>
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
export function ProgressBar({ value, max = 100, height = 6 }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="w-full rounded-full bg-paper-100 overflow-hidden" style={{ height }}>
      <div className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: progressColor(pct) }} />
    </div>
  );
}

/* ScoreBar — tiny inline progress + numeric label, for tables */
export function ScoreBar({ value, width = 64 }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="inline-flex items-center gap-2 num">
      <div className="rounded-full bg-paper-100 overflow-hidden" style={{ width, height: 4 }}>
        <div className="h-full" style={{ width: `${pct}%`, background: progressColor(pct) }} />
      </div>
      <span className="text-[11.5px] font-semibold" style={{ color: progressColor(pct), minWidth: 32, textAlign: 'right' }}>
        {Math.round(pct)}%
      </span>
    </div>
  );
}

/* Circular progress ring */
export function Ring({ value, size = 64, stroke = 7, label, sublabel }) {
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
        <div className="font-bold text-slate-900 num" style={{ fontSize: size * 0.26 }}>
          {label ?? `${Math.round(pct)}%`}
        </div>
        {sublabel && <div className="text-[8.5px] uppercase tracking-[0.14em] font-bold text-slate-400 mt-0.5">{sublabel}</div>}
      </div>
    </div>
  );
}

/* ---------- Stat (numeric-led, no boxed icon by default) ---------- */
const statTones = {
  brand:   'text-brand-600',
  emerald: 'text-emerald-600',
  amber:   'text-amber-600',
  sky:     'text-sky-600',
  rose:    'text-rose-600',
  slate:   'text-slate-500',
};
export function Stat({ label, value, sub, icon, tone = 'slate' }) {
  return (
    <Card className="p-3.5" hover>
      <div className="flex items-start justify-between gap-2">
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</div>
        {icon && (
          <span className={`shrink-0 ${statTones[tone]}`}>
            <Icon name={icon} className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
      <div className="text-[26px] font-bold mt-1.5 text-slate-900 tracking-[-0.026em] leading-none num">{value}</div>
      {sub && <div className="text-[11.5px] text-slate-500 mt-1.5">{sub}</div>}
    </Card>
  );
}

/* ---------- States ---------- */
export function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 rounded-full border-[3px] border-paper-200 border-t-brand-600 animate-spin" />
    </div>
  );
}

export function EmptyState({ title, hint, action, icon = 'spark' }) {
  return (
    <Card className="p-10 text-center">
      <span className="mx-auto mb-3 grid place-items-center w-11 h-11 rounded-xl bg-brand-50 text-brand-500">
        <Icon name={icon} className="w-5 h-5" />
      </span>
      <p className="text-slate-900 font-semibold text-[14px]">{title}</p>
      {hint && <p className="text-[12.5px] text-slate-500 mt-1 max-w-sm mx-auto">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </Card>
  );
}

export function Banner({ tone = 'info', children }) {
  const tones = {
    info:    ['bg-blue-50 text-blue-800 border-blue-200', 'doc'],
    warn:    ['bg-amber-50 text-amber-800 border-amber-200', 'alert'],
    error:   ['bg-rose-50 text-rose-800 border-rose-200', 'alert'],
    success: ['bg-emerald-50 text-emerald-800 border-emerald-200', 'check'],
  };
  const [cls, icon] = tones[tone];
  return (
    <div className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-[12.5px] ${cls}`}>
      <Icon name={icon} className="w-4 h-4 mt-px shrink-0" />
      <div className="min-w-0 leading-relaxed">{children}</div>
    </div>
  );
}

export const UOM_LABELS = {
  numeric_min: 'Numeric — higher is better',
  numeric_max: 'Numeric — lower is better',
  percent:     'Percentage (%)',
  timeline:    'Timeline (date-based)',
  zero:        'Zero-based',
};
