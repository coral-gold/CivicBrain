import { useCallback, useEffect, useState } from 'react';

/** Counts down from `initial` seconds to 0. `restart(n)` starts again. */
export function useCountdown(initial = 0) {
  const [left, setLeft] = useState(initial);
  useEffect(() => {
    if (left <= 0) return undefined;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  const restart = useCallback((seconds) => setLeft(seconds), []);
  return [left, restart];
}
