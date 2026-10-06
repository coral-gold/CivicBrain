import { loadEnv } from '../src/config/env.js';
import { ageOn, profileSchema } from '../src/modules/auth/auth.schemas.js';
import { isStrongPassword } from '../src/utils/password.js';
import { maskPhone, normalizeIndianMobile } from '../src/utils/phone.js';

const base = { JWT_SECRET: 'a'.repeat(32), OTP_PEPPER: 'b'.repeat(32) };

describe('environment validation', () => {
  test('refuses to start without strong secrets', () => {
    expect(() => loadEnv({})).toThrow(/JWT_SECRET/);
    expect(() => loadEnv({ ...base, JWT_SECRET: 'short' })).toThrow(/at least 32/);
    expect(() => loadEnv({ ...base, OTP_PEPPER: undefined })).toThrow(/OTP_PEPPER/);
  });
  test('accepts a minimal valid configuration and applies defaults', () => {
    const e = loadEnv(base);
    expect(e).toMatchObject({ PORT: 5000, COOKIE_NAME: 'cb_session', OTP_DEV_LOG: false, MONGO_URI: 'memory' });
  });
  test('production forbids OTP_DEV_LOG, in-memory DB and missing SMTP', () => {
    expect(() => loadEnv({ ...base, NODE_ENV: 'production', OTP_DEV_LOG: 'true', MONGO_URI: 'mongodb://x', SMTP_HOST: 'h', SMTP_USER: 'u' })).toThrow(
      /OTP_DEV_LOG/,
    );
    expect(() => loadEnv({ ...base, NODE_ENV: 'production', MONGO_URI: 'memory', SMTP_HOST: 'h', SMTP_USER: 'u' })).toThrow(/MONGO_URI/);
    expect(() => loadEnv({ ...base, NODE_ENV: 'production', MONGO_URI: 'mongodb://x' })).toThrow(/SMTP/);
    expect(() => loadEnv({ ...base, NODE_ENV: 'production', MONGO_URI: 'mongodb://x', SMTP_HOST: 'h', SMTP_USER: 'u' })).not.toThrow();
  });
});

describe('phone normalisation (FR-A6)', () => {
  test.each([
    ['9876543210', '9876543210'],
    ['+91 98765 43210', '9876543210'],
    ['+919876543210', '9876543210'],
    ['09876543210', '9876543210'],
    ['98765-43210', '9876543210'],
  ])('%s → %s', (input, out) => expect(normalizeIndianMobile(input)).toBe(out));
  test.each(['5123456789', '98765', '98765432101', 'abcdefghij', '', null])('rejects %p', (input) => expect(normalizeIndianMobile(input)).toBeNull());
  test('masks as 98xxxxxx10', () => expect(maskPhone('9876543210')).toBe('98xxxxxx10'));
});

describe('staff password policy (FR-A13)', () => {
  test.each(['Str0ng!Passw0rd#', 'Aa1!aaaaaaaa'])('accepts %s', (p) => expect(isStrongPassword(p)).toBe(true));
  test.each(['short1A!', 'alllowercase123!', 'ALLUPPERCASE123!', 'NoDigitsHere!!!', 'NoSymbolsHere123', null])('rejects %p', (p) =>
    expect(isStrongPassword(p)).toBe(false),
  );
});

describe('profile schema', () => {
  const ok = { fullName: 'Åsa Nöel-Patil', phone: '9876543210', gender: 'OTHER', dateOfBirth: '1990-02-28', wardNumber: '3' };
  test('accepts names in any script and coerces the ward', () => {
    expect(profileSchema.safeParse(ok).data.wardNumber).toBe(3);
    expect(profileSchema.safeParse({ ...ok, fullName: 'आशा पाटील' }).success).toBe(true);
  });
  test('rejects digits in names, bad dates, under-13 and over-120', () => {
    expect(profileSchema.safeParse({ ...ok, fullName: 'Asha 123' }).success).toBe(false);
    expect(profileSchema.safeParse({ ...ok, dateOfBirth: '2020-01-01' }).success).toBe(false);
    expect(profileSchema.safeParse({ ...ok, dateOfBirth: '1800-01-01' }).success).toBe(false);
    expect(profileSchema.safeParse({ ...ok, dateOfBirth: '2025-02-30' }).success).toBe(false);
    expect(profileSchema.safeParse({ ...ok, dateOfBirth: '2999-01-01' }).success).toBe(false);
  });
  test('age is counted in whole years', () => {
    expect(ageOn(new Date('2000-06-15T00:00:00Z'), new Date('2013-06-14T12:00:00Z'))).toBe(12);
    expect(ageOn(new Date('2000-06-15T00:00:00Z'), new Date('2013-06-15T12:00:00Z'))).toBe(13);
  });
});
