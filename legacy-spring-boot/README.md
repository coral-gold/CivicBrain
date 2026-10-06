# CivicBrain

AI-powered municipal decision-support and resource-optimisation platform (Pimpri Chinchwad University,
Major Project-I, Group A1). Citizens report civic problems; officers get AI-assisted decisions on what to
fix first, what it needs and how to schedule it. **CivicBrain recommends; the officer decides.**

## Status

| Milestone | State |
|---|---|
| M1 – Auth (citizen email-OTP, staff password, JWT cookie, profile, staff accounts) | ✅ rebuilt from SRS §5.1 |
| M2 – Wards (GeoJSON/PostGIS), categories, complaint submission with images + GPS, citizen list/timeline, me-too, confirm/reopen | ✅ |
| M3 – AI service | ⏳ `AiClient` seam + async pipeline hook exist; complaints stay `SUBMITTED` |
| M4–M7 | ⏳ |

## Easiest way to run it (no coding needed)

1. Install **Docker Desktop** (free): https://www.docker.com/products/docker-desktop — then open it and wait until it says it is running.
2. Download this project (green **Code** button on GitHub → **Download ZIP**, then unzip it).
3. Start it:
   * **Windows:** double-click `start.bat`
   * **Mac / Linux:** open a terminal in the folder and run `./start.sh`
4. The first start takes a few minutes. When it finishes, your browser opens **http://localhost:3000**.

**Try it as a citizen**
1. Click **Sign up**, enter any name and email (it can be fake, e.g. `me@test.com`).
2. Open the **email inbox** at **http://localhost:8025** — the 6-digit login code is in the newest email. Type it in.
3. Fill the registration form (any 10-digit number starting 6–9, e.g. `9876543210`; ward 1, 2 or 3).
4. Click **Report an issue** → add a photo → tap the map (or allow location) → describe the problem → submit.

**Try it as staff** — go to http://localhost:3000/admin/login
| Role | Email | Password |
|---|---|---|
| Officer (Ward 1) | `officer@civicbrain.demo` | `Officer!Demo2026` |
| Admin (all wards) | `admin@civicbrain.demo` | `Admin!Demo2026x` |

> Complaints made outside the 3 demo wards (they are near Pimpri-Chinchwad) are still accepted; they are
> filed under the ward you chose in your profile and flagged ⚑. Officers only see their own ward; the admin sees all.

**Stop it:** run `docker compose down` (add `-v` to also erase all data).

These logins and secrets are public demo values — fine on your own computer, never on a public server.

## No Docker on your PC? Use GitHub Codespaces (free, runs in the browser)

1. Open the repository on GitHub and sign in.
2. Click the green **Code** button → **Codespaces** tab → the **…** menu → **New with options**.
3. Choose the branch `claude/wonderful-ramanujan-3drd0r`, then **Create codespace**.
4. When the VS Code page opens, click the **Terminal** tab at the bottom, type `./run-without-docker.sh` and press Enter.
   Wait 5–10 minutes (first time only). It prints "CivicBrain is running" when ready.
5. When the bottom panel's **Ports** tab lists **3000** and **8025**, click the 🌐 globe next to **3000** to open the app,
   and the globe next to **8025** to open the email inbox that shows your login codes.
6. Same demo logins as above. When finished, stop the codespace (Code → Codespaces → ⋯ → Stop) to save free hours.

## For developers

```bash
docker compose up -d db mailpit      # just the database and mail catcher
# backend: see .env.example for the variables, then
cd backend && mvn spring-boot:run
# frontend
cd frontend && cp .env.example .env.local && npm install && npm run dev
```

## Tests

```bash
# backend – needs a PostGIS database; defaults to localhost:5432/civicbrain_test (civic/civic),
# override with TEST_DB_URL / TEST_DB_USER / TEST_DB_PASSWORD. The schema is wiped on every run.
cd backend && mvn test

cd frontend && npm run typecheck && npm run lint && npm test
```

## Layout

See SRS §4. Backend is package-by-feature under `com.civicbrain`; DB changes are Flyway-only
(`V1` auth, `V2` wards/categories, `V3` complaints) – never edit an applied migration.

## Security notes

* Session = signed JWT in an `HttpOnly; SameSite=Lax` cookie (`Secure` when `COOKIE_SECURE=true`). The backend
  re-reads the account on every request, so disabling a user takes effect immediately.
* CSRF: no token; protection relies on `SameSite=Lax`, JSON/multipart-only writes and no state change on GET.
* Uploads: magic-byte validation, ≤ 5 MB, decompression-bomb guard, always re-encoded to JPEG (drops EXIF/GPS),
  random keys outside the web root, served only through short-lived HMAC-signed URLs.
* Rate limits (OTP, admin login, 10 complaints/day) are in-memory – move to Redis before running >1 API instance.
