import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/** Messages "sent" during tests, so tests can read the OTP without a mail server. */
export const outbox = [];

let transport;
function getTransport() {
  if (!transport) {
    transport =
      env.SMTP_HOST && env.SMTP_USER
        ? nodemailer.createTransport({
            host: env.SMTP_HOST,
            port: env.SMTP_PORT,
            secure: env.SMTP_PORT === 465,
            auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
          })
        : nodemailer.createTransport({ jsonTransport: true }); // dev without SMTP: nothing leaves the machine
  }
  return transport;
}

/**
 * Sends an email; failures are logged (without the body) and never thrown into the request flow.
 * @param {{ to: string, subject: string, text: string, meta?: object }} msg `meta` is kept only in the test outbox
 */
export async function sendMail(msg) {
  if (env.NODE_ENV === 'test') {
    outbox.push({ ...msg });
    return;
  }
  try {
    await getTransport().sendMail({ from: env.MAIL_FROM, to: msg.to, subject: msg.subject, text: msg.text });
  } catch (e) {
    logger.error({ subject: msg.subject, error: e?.code ?? e?.message }, 'Failed to send email');
  }
}
