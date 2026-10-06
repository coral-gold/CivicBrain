import { z } from 'zod';

const bool = (def = 'false') =>
  z
    .enum(['true', 'false'])
    .default(def)
    .transform((v) => v === 'true');

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
    // "memory" = in-process MongoDB with data kept in server/.data (development only, zero set-up).
    MONGO_URI: z.string().min(1).default('memory'),
    JWT_SECRET: z.string({ required_error: 'JWT_SECRET is required' }).min(32, 'JWT_SECRET must be at least 32 characters'),
    OTP_PEPPER: z.string({ required_error: 'OTP_PEPPER is required' }).min(32, 'OTP_PEPPER must be at least 32 characters'),
    COOKIE_NAME: z.string().min(1).default('cb_session'),
    OTP_DEV_LOG: bool('false'),
    TRUST_PROXY: bool('false'),
    SMTP_HOST: z.string().default(''),
    SMTP_PORT: z.coerce.number().int().default(587),
    SMTP_USER: z.string().default(''),
    SMTP_PASS: z.string().default(''),
    MAIL_FROM: z.string().default('CivicBrain <no-reply@civicbrain.local>'),
    ADMIN_SEED_EMAIL: z.string().default(''),
    ADMIN_SEED_PASSWORD: z.string().default(''),
  })
  .superRefine((e, ctx) => {
    if (e.NODE_ENV === 'production') {
      if (e.OTP_DEV_LOG) ctx.addIssue({ code: 'custom', path: ['OTP_DEV_LOG'], message: 'OTP_DEV_LOG must be false in production' });
      if (e.MONGO_URI === 'memory') ctx.addIssue({ code: 'custom', path: ['MONGO_URI'], message: 'MONGO_URI=memory is for development only' });
      if (!e.SMTP_HOST || !e.SMTP_USER) ctx.addIssue({ code: 'custom', path: ['SMTP_HOST'], message: 'SMTP settings are required in production' });
    }
  });

/**
 * Validates environment variables. Throws a readable Error listing every problem, so the app refuses to
 * start with missing or weak secrets (SRS §8.1).
 * @param {Record<string, string | undefined>} [source]
 */
export function loadEnv(source = process.env) {
  const r = schema.safeParse(source);
  if (!r.success) {
    const lines = r.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${lines.join('\n')}\nSee server/.env.example (run "npm run setup" to generate one).`);
  }
  return Object.freeze(r.data);
}

export const env = loadEnv();
