const tone = {
  neutral: 'bg-white text-ink border-line',
  civic: 'bg-civic-soft text-civic-dark border-civic/30',
  signal: 'bg-signal/15 text-ink border-signal',
  danger: 'bg-danger/10 text-danger border-danger/40',
  ok: 'bg-ok/10 text-ok border-ok/40',
};

export default function Badge({ tone: t = 'neutral', children }) {
  return <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tone[t]}`}>{children}</span>;
}
