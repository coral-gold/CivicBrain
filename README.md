# CivicBrain (prototype)

Citizens report civic problems (roads, water, garbage, drainage, streetlights); municipal officers get a ranked,
explainable queue of what to fix first. **CivicBrain recommends; the officer decides.**
Stack: React + Vite · Node.js + Express · MongoDB. Specification: `SRS.md` (v2.0).

## Status

| Milestone | State |
|---|---|
| **M1** – Auth: citizen email-OTP signup/login, registration details, staff password login, sessions, guards, seed (super admin + 5 wards) | ✅ done and tested |
| M2 – Report wizard, duplicates / "Me too", my complaints, timeline | ⏳ |
| M3 – Rule-based engines, officer queue, action plans | ⏳ |
| M4 – Map, heatmap, route plan, analytics | ⏳ |
| M5 – Super-admin settings, emails, demo seed data, deploy | ⏳ |

## Run it (no technical knowledge needed)

1. Install **Node.js** (the "LTS" button on https://nodejs.org) and restart your computer if the installer asks.
2. Get the project: on GitHub click **Code → Download ZIP**, then unzip it.
3. Start it:
   * **Windows:** double-click **`start.bat`**
   * **Mac / Linux:** open a terminal in the folder and run **`./start.sh`**
4. First time only: it installs things and downloads a small built-in database (about 100 MB) — a few minutes.
   Your browser opens **http://localhost:5173** by itself. Keep the black window open while you use the app.

**Try it as a citizen:** Sign up with any name and email → the 6-digit code is **printed in the black window**
(look for `[DEV ONLY] OTP for …`) → type it in → fill the registration form (phone: any 10 digits starting 6–9,
e.g. `9876543210`; pick a ward) → you land on your dashboard.

**Try it as staff:** http://localhost:5173/staff/login → `admin@civicbrain.local` / `Change.Me.Str0ng!`

To stop: close the black window (or press `Ctrl+C`). Your data is kept in `server/.data`; delete that folder to start fresh.

### No installation: GitHub Codespaces
Open the repository on GitHub → **Code → Codespaces → New with options**, choose the branch, **Create codespace**. When it
opens, click **Terminal**, type `npm run demo` and press Enter. When "CivicBrain API listening" appears, open the **Ports**
tab and click the globe next to **5173**. Login codes appear in that same terminal.

## For developers

```bash
npm install
npm run setup     # creates server/.env with random secrets (once)
npm run seed      # 5 demo wards + super admin from ADMIN_SEED_* (safe to repeat)
npm run dev       # API on :5000, Vite on :5173 (proxies /api)
npm test          # server (Jest + supertest + mongodb-memory-server) and client (Vitest)
npm run lint
npm run build     # client → client/dist (Express serves it when present)
```

* `MONGO_URI=memory` (default in development) runs MongoDB inside the server process with files in `server/.data`.
  Use a real database with `MONGO_URI=mongodb://…` (`docker compose up -d` starts one).
* `OTP_DEV_LOG=true` prints OTPs in the server console; the server **refuses to start in production** with it on, with weak
  secrets, with `MONGO_URI=memory`, or without SMTP settings.
* Email goes through SMTP (Brevo in production). With no SMTP configured in development nothing is sent.

## Security notes (SRS §8.1)

Session = signed JWT in an `httpOnly; SameSite=Lax` cookie (`Secure` in production), never in browser storage; the account is
re-read from the database on every request, so disabling a user takes effect immediately. OTPs are stored only as HMAC hashes
(5-minute expiry, single use, 5 attempts, 60 s resend cooldown, 5 sends/hour). Staff accounts lock for 15 minutes after 5 wrong
passwords. Unknown and known emails get identical responses (no account enumeration). Mutating requests must be JSON or
multipart; `$`/`.` keys are rejected; every auth event is audit-logged with IP and user agent.
Rate limits are in memory — fine for one instance, move to a shared store before scaling out.
