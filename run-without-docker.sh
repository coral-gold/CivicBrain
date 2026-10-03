#!/bin/bash
# Runs CivicBrain WITHOUT Docker on Linux / GitHub Codespaces.
#   ./run-without-docker.sh          start everything (first time: 5-10 min)
#   ./run-without-docker.sh stop     stop everything
# Demo values only – never use these secrets on a public server.
set -e
cd "$(dirname "$0")"
ROOT="$(pwd)"; RUN="$ROOT/.run"; mkdir -p "$RUN"
SUDO=""; [ "$(id -u)" != 0 ] && SUDO="sudo"

pgsu() { if [ "$(id -u)" = 0 ]; then su postgres -c "psql $(printf '%q ' "$@")"; else sudo -u postgres psql "$@"; fi; }
stop_all() {
  for f in "$RUN"/*.pid; do [ -f "$f" ] && kill "$(cat "$f")" 2>/dev/null || true; rm -f "$f"; done
}
if [ "$1" = "stop" ]; then stop_all; echo "Stopped."; exit 0; fi
stop_all

if ! command -v apt-get >/dev/null 2>&1; then
  echo "This system has no apt-get (Codespaces 'recovery mode'?)."
  echo "Fix: press Ctrl+Shift+P, run 'Codespaces: Rebuild Container', wait, then run this script again."
  exit 1
fi
echo "[1/6] Installing required tools (Java, Maven, Node, PostgreSQL + PostGIS)..."
# GitHub's base image ships a Yarn apt source with an expired key; it breaks "apt-get update" and we don't need Yarn.
$SUDO rm -f /etc/apt/sources.list.d/yarn.list
$SUDO apt-get update -qq || echo "(some package sources could not be refreshed – continuing)"
PKGS="postgresql postgis curl"
command -v java >/dev/null || PKGS="$PKGS openjdk-17-jdk"
command -v mvn  >/dev/null || PKGS="$PKGS maven"
command -v node >/dev/null || PKGS="$PKGS nodejs npm"
$SUDO env DEBIAN_FRONTEND=noninteractive apt-get install -y -qq $PKGS >/dev/null

echo "[2/6] Starting the database..."
$SUDO service postgresql start >/dev/null
for i in $(seq 1 30); do pgsu -qc "select 1" >/dev/null 2>&1 && break; sleep 1; done
pgsu -qtc "select 1 from pg_roles where rolname='civic'" | grep -q 1 || \
  pgsu -qc "create user civic superuser password 'civic'"
pgsu -qtc "select 1 from pg_database where datname='civicbrain'" | grep -q 1 || \
  pgsu -qc "create database civicbrain owner civic"

echo "[3/6] Starting the email inbox (Mailpit)..."
if [ ! -x "$RUN/mailpit" ]; then
  ARCH=$(uname -m); [ "$ARCH" = "aarch64" ] && ARCH=arm64 || ARCH=amd64
  curl -fsSL "https://github.com/axllent/mailpit/releases/latest/download/mailpit-linux-$ARCH.tar.gz" | tar -xz -C "$RUN" mailpit
fi
nohup "$RUN/mailpit" > "$RUN/mailpit.log" 2>&1 & echo $! > "$RUN/mailpit.pid"

echo "[4/6] Building the backend..."
(cd backend && mvn -q -B -DskipTests package)

export DB_URL=jdbc:postgresql://localhost:5432/civicbrain DB_USER=civic DB_PASSWORD=civic
export JWT_SECRET=demo-only-jwt-secret-change-me-0123456789abcdef
export OTP_HMAC_SECRET=demo-only-otp-secret-change-me-0123456789abcdef
export MEDIA_SIGNING_SECRET=demo-only-media-secret-change-me-0123456789ab
export COOKIE_SECURE=false DEMO_DATA=true SMTP_HOST=localhost SMTP_PORT=1025
export SEED_ADMIN_EMAIL=admin@civicbrain.demo SEED_ADMIN_PASSWORD='Admin!Demo2026x'
export STORAGE_DIR="$RUN/uploads"
nohup java -jar backend/target/civicbrain-backend-*.jar > "$RUN/backend.log" 2>&1 & echo $! > "$RUN/backend.pid"

echo "[5/6] Building the website (the slow step on first run)..."
cd frontend
npm ci --no-audit --no-fund >/dev/null
SKIP_CHECKS=1 NEXT_TELEMETRY_DISABLED=1 BACKEND_URL=http://localhost:8080 npm run build >/dev/null
BACKEND_URL=http://localhost:8080 nohup ./node_modules/.bin/next start -p 3000 > "$RUN/frontend.log" 2>&1 & echo $! > "$RUN/frontend.pid"
cd "$ROOT"

echo "[6/6] Waiting for the app to be ready..."
for i in $(seq 1 90); do
  curl -fs http://localhost:3000/api/public/config >/dev/null 2>&1 && READY=1 && break
  sleep 2
done
if [ -z "$READY" ]; then echo "The app did not start. See the logs in $RUN (backend.log / frontend.log)."; tail -20 "$RUN/backend.log"; exit 1; fi
cat <<MSG

CivicBrain is running.
  App:          port 3000   (Codespaces: Ports tab -> globe icon on 3000)
  Email inbox:  port 8025   (your login codes appear here)
  Staff logins: officer@civicbrain.demo / Officer!Demo2026   |   admin@civicbrain.demo / Admin!Demo2026x
  Stop:         ./run-without-docker.sh stop
MSG
