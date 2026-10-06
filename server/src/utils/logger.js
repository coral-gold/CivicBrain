import pino from 'pino';

// Secrets never belong in logs (SRS §8.1): redact anything that could carry a token or password.
export const logger = pino({
  level: process.env.NODE_ENV === 'test' ? 'silent' : (process.env.LOG_LEVEL ?? 'info'),
  redact: ['req.headers.cookie', 'req.headers.authorization', '*.password', '*.passwordHash', '*.otp', '*.token'],
  ...(process.env.NODE_ENV === 'production' ? {} : { transport: { target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname' } } }),
});
