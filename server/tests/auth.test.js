import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { AuditLog } from '../src/models/AuditLog.js';
import { Citizen } from '../src/models/Citizen.js';
import { Otp } from '../src/models/Otp.js';
import { Staff } from '../src/models/Staff.js';
import { OTP_MAX_PER_HOUR } from '../src/modules/auth/otp.service.js';
import {
  client,
  cookieFor,
  createActiveCitizen,
  createStaff,
  lastOtp,
  mailsTo,
  resetDb,
  signUp,
  skipCooldown,
  startDb,
  stopDb,
  STRONG_PW,
  validProfile,
} from './helpers.js';

jest.setTimeout(60000);
beforeAll(startDb);
afterAll(stopDb);
beforeEach(resetDb);

const wrongCode = (real) => (real === '000000' ? '111111' : '000000');

describe('M1 acceptance 1 – signup', () => {
  test('valid name + email: code is emailed, works once, account is PROFILE_PENDING, cookie is httpOnly/lax', async () => {
    const c = client();
    const res = await c.post('/api/auth/signup/request-otp').send({ name: 'Asha Patil', email: 'Asha@Example.com' }).expect(200);
    expect(res.body).toEqual({ message: expect.any(String), resendAfterSeconds: 60, expiresInSeconds: 300 });
    const code = lastOtp('asha@example.com');
    expect(code).toMatch(/^\d{6}$/);

    const ok = await c.post('/api/auth/signup/verify').send({ email: 'asha@example.com', otp: code }).expect(200);
    expect(ok.body.user).toMatchObject({
      email: 'asha@example.com',
      fullName: 'Asha Patil',
      role: 'CITIZEN',
      status: 'PROFILE_PENDING',
      profileComplete: false,
    });
    const cookie = ok.headers['set-cookie'].join(';');
    expect(cookie).toMatch(/cb_session=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);

    const again = await client().post('/api/auth/signup/verify').send({ email: 'asha@example.com', otp: code }).expect(400);
    expect(again.body.code).toBe('OTP_INVALID'); // single use
  });

  test('the OTP is stored only as an HMAC hash', async () => {
    const c = client();
    await c.post('/api/auth/signup/request-otp').send({ name: 'Asha Patil', email: 'asha@example.com' });
    const row = await Otp.findOne({ email: 'asha@example.com' });
    expect(row.codeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(row.codeHash).not.toContain(lastOtp('asha@example.com'));
    expect(JSON.stringify(row.toObject())).not.toContain(lastOtp('asha@example.com'));
  });

  test('validation errors name the field', async () => {
    const res = await client().post('/api/auth/signup/request-otp').send({ name: 'A', email: 'nope' }).expect(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.fieldErrors).toHaveProperty('name');
    expect(res.body.fieldErrors).toHaveProperty('email');
  });
});

describe('M1 acceptance 2–4 – OTP rules', () => {
  test('2: five wrong codes lock the OTP; the right code is rejected afterwards', async () => {
    const c = client();
    await c.post('/api/auth/signup/request-otp').send({ name: 'Asha Patil', email: 'asha@example.com' });
    const code = lastOtp('asha@example.com');
    for (let i = 0; i < 4; i++) {
      const r = await c
        .post('/api/auth/signup/verify')
        .send({ email: 'asha@example.com', otp: wrongCode(code) })
        .expect(400);
      expect(r.body.code).toBe('OTP_INCORRECT');
    }
    const fifth = await c
      .post('/api/auth/signup/verify')
      .send({ email: 'asha@example.com', otp: wrongCode(code) })
      .expect(429);
    expect(fifth.body.code).toBe('OTP_LOCKED');
    const after = await c.post('/api/auth/signup/verify').send({ email: 'asha@example.com', otp: code });
    expect(after.body.code).toBe('OTP_LOCKED');
    expect(await Citizen.countDocuments()).toBe(0);
  });

  test('3: a code older than 5 minutes is OTP_EXPIRED', async () => {
    const c = client();
    await c.post('/api/auth/signup/request-otp').send({ name: 'Asha Patil', email: 'asha@example.com' });
    await Otp.updateMany({}, { expiresAt: new Date(Date.now() - 1000) });
    const r = await c
      .post('/api/auth/signup/verify')
      .send({ email: 'asha@example.com', otp: lastOtp('asha@example.com') })
      .expect(400);
    expect(r.body.code).toBe('OTP_EXPIRED');
  });

  test('4: resending within 60 s is 429 OTP_COOLDOWN with retryAfterSeconds', async () => {
    const c = client();
    await c.post('/api/auth/signup/request-otp').send({ name: 'Asha Patil', email: 'asha@example.com' }).expect(200);
    const r = await c.post('/api/auth/signup/request-otp').send({ name: 'Asha Patil', email: 'asha@example.com' }).expect(429);
    expect(r.body.code).toBe('OTP_COOLDOWN');
    expect(r.body.retryAfterSeconds).toBeGreaterThan(0);
    expect(r.body.retryAfterSeconds).toBeLessThanOrEqual(60);
    expect(r.headers['retry-after']).toBeDefined();
  });

  test('a new code invalidates the previous one', async () => {
    const c = client();
    await c.post('/api/auth/signup/request-otp').send({ name: 'Asha Patil', email: 'asha@example.com' });
    const first = lastOtp('asha@example.com');
    await skipCooldown();
    await c.post('/api/auth/signup/request-otp').send({ name: 'Asha Patil', email: 'asha@example.com' }).expect(200);
    const second = lastOtp('asha@example.com');
    const r = await c.post('/api/auth/signup/verify').send({ email: 'asha@example.com', otp: first === second ? wrongCode(second) : first });
    expect(['OTP_INCORRECT']).toContain(r.body.code);
    await c.post('/api/auth/signup/verify').send({ email: 'asha@example.com', otp: second }).expect(200);
  });

  test('at most 5 codes per hour per email', async () => {
    const c = client();
    for (let i = 0; i < OTP_MAX_PER_HOUR; i++) {
      await c.post('/api/auth/signup/request-otp').send({ name: 'Asha Patil', email: 'asha@example.com' }).expect(200);
      await skipCooldown();
    }
    const r = await c.post('/api/auth/signup/request-otp').send({ name: 'Asha Patil', email: 'asha@example.com' }).expect(429);
    expect(r.body.code).toBe('RATE_LIMITED');
    expect(r.body.retryAfterSeconds).toBeGreaterThan(0);
  });

  test('SIGNUP and LOGIN codes are not interchangeable', async () => {
    await createActiveCitizen('known@example.com');
    const c = client();
    await c.post('/api/auth/login/request-otp').send({ email: 'known@example.com' }).expect(200);
    const loginCode = lastOtp('known@example.com');
    const r = await c.post('/api/auth/signup/verify').send({ email: 'known@example.com', otp: loginCode }).expect(400);
    expect(r.body.code).toBe('OTP_INVALID');
    await c.post('/api/auth/login/verify').send({ email: 'known@example.com', otp: loginCode }).expect(200);
  });
});

describe('M1 acceptance 5–6 – no account enumeration', () => {
  test('5: signup with a registered email gives the same response and sends an "already registered" mail, no code', async () => {
    await createActiveCitizen('exists@example.com');
    const fresh = await client().post('/api/auth/signup/request-otp').send({ name: 'Asha Patil', email: 'new@example.com' }).expect(200);
    const existing = await client().post('/api/auth/signup/request-otp').send({ name: 'Asha Patil', email: 'exists@example.com' }).expect(200);
    expect(existing.body).toEqual(fresh.body);
    expect(mailsTo('exists@example.com').map((m) => m.subject)).toEqual(['You already have a CivicBrain account']);
    expect(lastOtp('exists@example.com')).toBeUndefined();
  });

  test('6: login with an unknown email gives the same response, sends nothing, and limits behave the same', async () => {
    await createActiveCitizen('known@example.com');
    const known = await client().post('/api/auth/login/request-otp').send({ email: 'known@example.com' }).expect(200);
    const c = client();
    const unknown = await c.post('/api/auth/login/request-otp').send({ email: 'ghost@example.com' }).expect(200);
    expect(unknown.body).toEqual(known.body);
    expect(mailsTo('ghost@example.com')).toHaveLength(0);
    const again = await c.post('/api/auth/login/request-otp').send({ email: 'ghost@example.com' }).expect(429);
    expect(again.body.code).toBe('OTP_COOLDOWN'); // same cooldown as a real address
    const bad = await c.post('/api/auth/login/verify').send({ email: 'ghost@example.com', otp: '123456' }).expect(400);
    expect(bad.body.code).toBe('OTP_INVALID');
  });

  test('passwordless login issues a session', async () => {
    await createActiveCitizen('known@example.com');
    const c = client();
    await c.post('/api/auth/login/request-otp').send({ email: 'Known@Example.com' }).expect(200);
    const r = await c
      .post('/api/auth/login/verify')
      .send({ email: 'known@example.com', otp: lastOtp('known@example.com') })
      .expect(200);
    expect(r.body.user).toMatchObject({ role: 'CITIZEN', profileComplete: true });
    const me = await c.get('/api/auth/me').expect(200);
    expect(me.body.user.email).toBe('known@example.com');
  });

  test('a suspended citizen cannot log in', async () => {
    const cit = await createActiveCitizen('known@example.com');
    await Citizen.updateOne({ _id: cit._id }, { status: 'SUSPENDED' });
    const c = client();
    await c.post('/api/auth/login/request-otp').send({ email: 'known@example.com' });
    const r = await c
      .post('/api/auth/login/verify')
      .send({ email: 'known@example.com', otp: lastOtp('known@example.com') })
      .expect(403);
    expect(r.body.code).toBe('ACCOUNT_SUSPENDED');
  });
});

describe('M1 acceptance 7–9 – profile', () => {
  test('7: bad phone, age 10 and no ward give field errors on all three', async () => {
    const c = client();
    await signUp(c);
    const tenYearsAgo = new Date(Date.now() - 10 * 365.25 * 864e5).toISOString().slice(0, 10);
    const r = await c
      .put('/api/citizen/profile')
      .send(validProfile({ phone: '5123456789', dateOfBirth: tenYearsAgo, wardNumber: undefined }))
      .expect(400);
    expect(r.body.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(r.body.fieldErrors)).toEqual(expect.arrayContaining(['phone', 'dateOfBirth', 'wardNumber']));
  });

  test('a ward that does not exist is rejected', async () => {
    const c = client();
    await signUp(c);
    const r = await c
      .put('/api/citizen/profile')
      .send(validProfile({ wardNumber: 99 }))
      .expect(400);
    expect(r.body.fieldErrors).toHaveProperty('wardNumber');
  });

  test('valid profile activates the account, normalises the phone and refreshes the cookie', async () => {
    const c = client();
    await signUp(c);
    const r = await c
      .put('/api/citizen/profile')
      .send(validProfile({ phone: '+91 98765-43210' }))
      .expect(200);
    expect(r.body.user).toMatchObject({ status: 'ACTIVE', profileComplete: true, phone: '9876543210', wardNumber: 2, dateOfBirth: '1995-04-12' });
    expect(r.headers['set-cookie'].join(';')).toMatch(/cb_session=/);
    expect(await AuditLog.countDocuments({ event: 'PROFILE_COMPLETE' })).toBe(1);
    // the new cookie says pc:true, and /me agrees
    expect((await c.get('/api/auth/me').expect(200)).body.user.profileComplete).toBe(true);
  });

  test('8: a phone number used by another citizen is 409 PHONE_IN_USE under the phone field', async () => {
    await createActiveCitizen('other@example.com', '9876543210');
    const c = client();
    await signUp(c);
    const r = await c.put('/api/citizen/profile').send(validProfile()).expect(409);
    expect(r.body.code).toBe('PHONE_IN_USE');
    expect(r.body.fieldErrors).toHaveProperty('phone');
  });

  test('9 (server side): citizen APIs other than the profile need a completed profile', async () => {
    const c = client();
    await signUp(c);
    const me = await c.get('/api/auth/me').expect(200);
    expect(me.body.user.profileComplete).toBe(false);
    const r = await c.get('/api/citizen/complaints').expect(403); // route is guarded before it exists (M2)
    expect(r.body.code).toBe('FORBIDDEN');
  });
});

describe('M1 acceptance 10–12 – roles, lockout, tampering', () => {
  test('10: a citizen session cannot use staff APIs; anonymous gets 401', async () => {
    const c = client();
    await signUp(c);
    expect((await c.get('/api/staff/complaints').expect(403)).body.code).toBe('FORBIDDEN');
    expect((await client().get('/api/staff/complaints').expect(401)).body.code).toBe('UNAUTHENTICATED');
  });

  test('staff can use staff APIs but not the citizen profile route', async () => {
    await createStaff();
    const c = client();
    await c.post('/api/auth/staff/login').send({ email: 'officer@example.com', password: STRONG_PW }).expect(200);
    await c.get('/api/staff/complaints').expect(200);
    await c.put('/api/citizen/profile').send(validProfile()).expect(403);
  });

  test('11: five wrong staff passwords lock the account (423) even for the right password; unlocks after the window', async () => {
    await createStaff({ role: 'ADMIN', email: 'boss@example.com' });
    const c = client();
    const bad = await c.post('/api/auth/staff/login').send({ email: 'boss@example.com', password: 'Wrong-Pass-123!' }).expect(401);
    const unknown = await client().post('/api/auth/staff/login').send({ email: 'nobody@example.com', password: 'Wrong-Pass-123!' }).expect(401);
    expect(bad.body).toEqual(unknown.body); // same error for unknown email and wrong password
    expect(bad.body.code).toBe('INVALID_CREDENTIALS');
    for (let i = 0; i < 4; i++) await c.post('/api/auth/staff/login').send({ email: 'boss@example.com', password: 'Wrong-Pass-123!' }).expect(401);
    const locked = await c.post('/api/auth/staff/login').send({ email: 'boss@example.com', password: STRONG_PW }).expect(423);
    expect(locked.body.code).toBe('ACCOUNT_LOCKED');
    expect(locked.body.retryAfterSeconds).toBeGreaterThan(0);
    await Staff.updateOne({ email: 'boss@example.com' }, { lockedUntil: new Date(Date.now() - 1000) });
    await c.post('/api/auth/staff/login').send({ email: 'boss@example.com', password: STRONG_PW }).expect(200);
  });

  test('staff login is limited to 10 attempts / 15 min per IP', async () => {
    const c = client();
    for (let i = 0; i < 10; i++)
      await c
        .post('/api/auth/staff/login')
        .send({ email: `x${i}@example.com`, password: 'Wrong-Pass-123!' })
        .expect(401);
    const r = await c.post('/api/auth/staff/login').send({ email: 'x@example.com', password: 'Wrong-Pass-123!' }).expect(429);
    expect(r.body.code).toBe('RATE_LIMITED');
    await client().post('/api/auth/staff/login').send({ email: 'x@example.com', password: 'Wrong-Pass-123!' }).expect(401); // other IP unaffected
  });

  test('a disabled staff account cannot log in and loses an existing session at once', async () => {
    const s = await createStaff();
    const c = client();
    await c.post('/api/auth/staff/login').send({ email: 'officer@example.com', password: STRONG_PW }).expect(200);
    await Staff.updateOne({ _id: s._id }, { enabled: false });
    expect((await c.get('/api/auth/me').expect(401)).body.code).toBe('SESSION_INVALID');
    expect((await client().post('/api/auth/staff/login').send({ email: 'officer@example.com', password: STRONG_PW }).expect(403)).body.code).toBe(
      'ACCOUNT_SUSPENDED',
    );
  });

  test('12: a tampered / forged cookie is treated as logged out', async () => {
    const cit = await createActiveCitizen('known@example.com');
    const forged = await client()
      .get('/api/auth/me')
      .set('Cookie', cookieFor(cit._id, 'CITIZEN', 'x'.repeat(40)))
      .expect(401);
    expect(forged.body.code).toBe('SESSION_INVALID');
    expect(forged.headers['set-cookie'].join(';')).toMatch(/cb_session=;/);
    await client().get('/api/auth/me').set('Cookie', 'cb_session=garbage.token.value').expect(401);
    await client().get('/api/auth/me').expect(401);
  });

  test('a token claiming a staff role for a citizen id gains nothing (role comes from the database)', async () => {
    const cit = await createActiveCitizen('known@example.com');
    await client().get('/api/staff/complaints').set('Cookie', cookieFor(cit._id, 'ADMIN')).expect(401);
  });

  test('a suspended citizen is signed out on /me and the cookie is cleared', async () => {
    const c = client();
    const u = await signUp(c);
    await Citizen.updateOne({ _id: u.id }, { status: 'SUSPENDED' });
    const r = await c.get('/api/auth/me').expect(401);
    expect(r.body.code).toBe('SESSION_INVALID');
    expect(r.headers['set-cookie'].join(';')).toMatch(/cb_session=;/);
  });

  test('logout clears the cookie', async () => {
    const c = client();
    await signUp(c);
    const r = await c.post('/api/auth/logout').send({}).expect(200);
    expect(r.headers['set-cookie'].join(';')).toMatch(/cb_session=;/);
    await c.get('/api/auth/me').expect(401);
  });
});

describe('hardening (SRS §8.1)', () => {
  test('audit log records auth events with IP and user agent', async () => {
    const c = client();
    await c.post('/api/auth/signup/request-otp').set('User-Agent', 'jest-agent').send({ name: 'Asha Patil', email: 'asha@example.com' });
    await c.post('/api/auth/signup/verify').send({ email: 'asha@example.com', otp: wrongCode(lastOtp('asha@example.com')) });
    await createStaff();
    await c.post('/api/auth/staff/login').send({ email: 'officer@example.com', password: 'Wrong-Pass-123!' });
    const events = (await AuditLog.find().lean()).map((e) => e.event);
    expect(events).toEqual(expect.arrayContaining(['OTP_SENT', 'OTP_VERIFY_FAIL', 'STAFF_LOGIN_FAIL']));
    const sent = await AuditLog.findOne({ event: 'OTP_SENT' }).lean();
    expect(sent.ip).toBe(c.ip);
    expect(sent.userAgent).toBe('jest-agent');
    expect(JSON.stringify(await AuditLog.find().lean())).not.toContain(lastOtp('asha@example.com'));
  });

  test('NoSQL operator injection is rejected', async () => {
    const c = client();
    const r = await c
      .post('/api/auth/login/request-otp')
      .send({ email: { $ne: null } })
      .expect(400);
    expect(r.body.code).toBe('VALIDATION_ERROR');
    await c
      .post('/api/auth/staff/login')
      .send({ email: 'a@example.com', password: { $gt: '' } })
      .expect(400);
    await c.post('/api/auth/staff/login').send({ 'a.b': 1, email: 'a@example.com', password: 'x' }).expect(400);
  });

  test('mutating requests must be JSON or multipart', async () => {
    const r = await client().post('/api/auth/logout').type('form').send('a=1').expect(415);
    expect(r.body.code).toBe('VALIDATION_ERROR');
    await client().post('/api/auth/logout').send({}).expect(200);
  });

  test('malformed JSON, unknown routes and oversized bodies return the standard error shape', async () => {
    const c = client();
    expect((await c.post('/api/auth/login/request-otp').set('Content-Type', 'application/json').send('{bad').expect(400)).body.code).toBe('VALIDATION_ERROR');
    expect((await c.get('/api/nope').expect(404)).body.code).toBe('NOT_FOUND');
    await c
      .post('/api/auth/login/request-otp')
      .send({ email: `${'a'.repeat(200000)}@x.com` })
      .expect(413);
  });

  test('responses never contain password hashes', async () => {
    await createStaff();
    const c = client();
    const r = await c.post('/api/auth/staff/login').send({ email: 'officer@example.com', password: STRONG_PW }).expect(200);
    expect(JSON.stringify(r.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
    expect(JSON.stringify((await c.get('/api/auth/me')).body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  test('security headers are set', async () => {
    const r = await client().get('/api/health').expect(200);
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['content-security-policy']).toBeDefined();
    expect(r.headers['x-powered-by']).toBeUndefined();
  });

  test('public config lists the seeded wards', async () => {
    const r = await client().get('/api/public/config').expect(200);
    expect(r.body.wards).toHaveLength(5);
    expect(r.body).toMatchObject({ otpResendSeconds: 60, otpTtlSeconds: 300 });
  });

  test('the wards are real 2dsphere polygons', async () => {
    const hit = await mongoose.model('Ward').findOne({ boundary: { $geoIntersects: { $geometry: { type: 'Point', coordinates: [73.77, 18.62] } } } });
    expect(hit.name).toBe('Akurdi');
  });
});
