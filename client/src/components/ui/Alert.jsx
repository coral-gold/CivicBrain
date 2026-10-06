const tone = {
  error: 'border-danger bg-danger/5 text-danger',
  success: 'border-ok bg-ok/5 text-ok',
  info: 'border-line bg-white text-ink',
  warning: 'border-signal bg-signal/10 text-ink',
};

/** Errors use role="alert" so screen readers announce them (SRS §8.3). */
export default function Alert({ kind = 'info', children, className = '' }) {
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`rounded-md border-l-4 px-4 py-3 text-sm ${tone[kind]} ${className}`}>
      {children}
    </div>
  );
}
