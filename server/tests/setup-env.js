// Runs before every test file: environment for the app under test.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-test-jwt-secret-0123456789';
process.env.OTP_PEPPER = 'test-otp-pepper-test-otp-pepper-0123456789';
process.env.TRUST_PROXY = 'true'; // lets each test pick its own client IP via X-Forwarded-For
process.env.OTP_DEV_LOG = 'false';
process.env.ADMIN_SEED_EMAIL = 'seed.admin@example.com';
process.env.ADMIN_SEED_PASSWORD = 'Str0ng!Passw0rd#';
process.env.MONGO_URI = 'mongodb://unused';
