import { forwardRef, useId } from 'react';

const base = 'min-h-touch w-full rounded-md border bg-white px-3 py-2 text-base text-ink placeholder:text-ink/40 read-only:bg-paper read-only:text-ink/70';

function FieldShell({ id, label, error, hint, children }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-sm text-ink/70">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const describedBy = (id, error, hint) => (error ? `${id}-err` : hint ? `${id}-hint` : undefined);

/** Labelled input; error text is linked with aria-describedby. Works with react-hook-form's register(). */
export const TextField = forwardRef(function TextField({ label, error, hint, className = '', ...rest }, ref) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <input
        id={id}
        ref={ref}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, error, hint)}
        className={`${base} ${error ? 'border-danger' : 'border-line'} ${className}`}
        {...rest}
      />
    </FieldShell>
  );
});

export const SelectField = forwardRef(function SelectField({ label, error, hint, className = '', children, ...rest }, ref) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <select
        id={id}
        ref={ref}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, error, hint)}
        className={`${base} ${error ? 'border-danger' : 'border-line'} ${className}`}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  );
});
