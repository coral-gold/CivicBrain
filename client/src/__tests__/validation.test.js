import { describe, expect, it } from 'vitest';
import { normalizeIndianMobile } from '../lib/phone.js';
import { ageOn, profileSchema, signupSchema, staffLoginSchema } from '../lib/validation.js';

const ok = { fullName: 'Asha Patil', phone: '9876543210', gender: 'FEMALE', dateOfBirth: '1995-04-12', wardNumber: '2' };
const failing = (r) => (r.success ? [] : r.error.issues.map((i) => String(i.path[0])));

describe('profile form (acceptance 7)', () => {
  it('accepts a valid profile and coerces the ward', () => {
    const r = profileSchema.safeParse(ok);
    expect(r.success).toBe(true);
    expect(r.data.wardNumber).toBe(2);
  });

  it('flags phone 5123456789, age 10 and a missing ward together', () => {
    const tenYearsAgo = new Date(Date.now() - 10 * 365.25 * 864e5).toISOString().slice(0, 10);
    const r = profileSchema.safeParse({ ...ok, phone: '5123456789', dateOfBirth: tenYearsAgo, wardNumber: '' });
    expect(failing(r)).toEqual(expect.arrayContaining(['phone', 'dateOfBirth', 'wardNumber']));
  });

  it('accepts +91 / spaces in the phone and any-script names; rejects digits in names', () => {
    expect(profileSchema.safeParse({ ...ok, phone: '+91 98765 43210' }).success).toBe(true);
    expect(profileSchema.safeParse({ ...ok, fullName: 'आशा पाटील' }).success).toBe(true);
    expect(profileSchema.safeParse({ ...ok, fullName: 'Asha 123' }).success).toBe(false);
  });

  it('enforces the 13–120 age range on the birthday boundary', () => {
    expect(ageOn('2000-06-15', new Date('2013-06-14T12:00:00Z'))).toBe(12);
    expect(ageOn('2000-06-15', new Date('2013-06-15T12:00:00Z'))).toBe(13);
    expect(profileSchema.safeParse({ ...ok, dateOfBirth: '1890-01-01' }).success).toBe(false);
  });

  it('requires a gender', () => {
    expect(failing(profileSchema.safeParse({ ...ok, gender: '' }))).toContain('gender');
  });
});

describe('other forms', () => {
  it('signup needs a real name and a valid email', () => {
    expect(failing(signupSchema.safeParse({ name: 'A', email: 'nope' }))).toEqual(expect.arrayContaining(['name', 'email']));
    expect(signupSchema.safeParse({ name: 'Asha Patil', email: 'asha@example.com' }).success).toBe(true);
  });
  it('staff login needs email and password', () => {
    expect(failing(staffLoginSchema.safeParse({ email: 'a@b.in', password: '' }))).toContain('password');
  });
  it('phone normalisation matches the server', () => {
    expect(normalizeIndianMobile('+91 98765-43210')).toBe('9876543210');
    expect(normalizeIndianMobile('5123456789')).toBeNull();
  });
});
