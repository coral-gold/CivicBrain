// Creates server/.env with fresh random secrets if it does not exist yet (development convenience).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const target = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../server/.env');
if (fs.existsSync(target)) {
  console.log('server/.env already exists – leaving it unchanged.');
} else {
  const secret = () => crypto.randomBytes(48).toString('base64');
  const body = `NODE_ENV=development
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
# "memory" = built-in database, no installation needed (data kept in server/.data). Use a mongodb:// URI for a real one.
MONGO_URI=memory
JWT_SECRET=${secret()}
OTP_PEPPER=${secret()}
COOKIE_NAME=cb_session
OTP_DEV_LOG=true
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
MAIL_FROM="CivicBrain <verified-sender@yourdomain.com>"
ADMIN_SEED_EMAIL=admin@civicbrain.local
ADMIN_SEED_PASSWORD=Change.Me.Str0ng!
`;
  fs.writeFileSync(target, body, { mode: 0o600 });
  console.log('Created server/.env with new random secrets.');
}
