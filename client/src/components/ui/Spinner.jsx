export default function Spinner({ label = 'Loading…' }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 p-8 text-ink/70">
      <span aria-hidden className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-civic" />
      <span>{label}</span>
    </div>
  );
}
