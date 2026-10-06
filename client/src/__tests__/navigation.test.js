import { describe, expect, it } from 'vitest';
import { safeNext } from '../lib/navigation.js';

describe('safeNext (acceptance 13)', () => {
  it.each(['https://evil.com', '//evil.com', '/\\evil.com', 'javascript:alert(1)', 'http:evil.com', '/a\nb', '', 'evil.com', '/\\/evil.com'])(
    'ignores %j',
    (bad) => {
      expect(safeNext(bad)).toBe('/dashboard');
    },
  );
  it('ignores non-strings and uses the given fallback', () => {
    expect(safeNext(null)).toBe('/dashboard');
    expect(safeNext(undefined, '/staff/queue')).toBe('/staff/queue');
  });
  it('keeps same-site relative paths', () => {
    expect(safeNext('/complaints/12?x=1')).toBe('/complaints/12?x=1');
    expect(safeNext('/dashboard')).toBe('/dashboard');
  });
});
