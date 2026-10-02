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

## Run locally

```bash
cp .env.example .env            # fill the three secrets (openssl rand -base64 48) and the seed admin
docker compose up -d            # PostGIS on :5432, Mailpit on :1025 (UI at http://localhost:8025)

# backend (Java 17+, Maven)
cd backend && set -a && . ../.env && set +a && mvn spring-boot:run     # http://localhost:8080

# frontend (Node 20+)
cd frontend && cp .env.example .env.local   # same JWT_SECRET as the backend
npm install && npm run dev                  # http://localhost:3000
```

OTP emails appear in Mailpit. Sign in as staff at `/admin/login` with the seeded SUPER_ADMIN, upload ward
boundaries at `/admin/settings/wards` (GeoJSON FeatureCollection with `properties.number` + `properties.name`),
and create officers with `POST /api/admin/staff`.

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
