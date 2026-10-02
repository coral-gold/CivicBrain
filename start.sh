#!/bin/bash
# Double-click friendly launcher for Mac/Linux:  ./start.sh
cd "$(dirname "$0")"
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed. Install Docker Desktop from https://www.docker.com/products/docker-desktop and try again."
  exit 1
fi
echo "Starting CivicBrain (first time takes a few minutes)..."
docker compose up --build -d || { echo "Could not start. Is Docker Desktop open and running?"; exit 1; }
echo "Waiting for the app to be ready..."
for i in $(seq 1 90); do
  curl -fs http://localhost:3000/api/public/config >/dev/null 2>&1 && break
  sleep 2
done
cat <<MSG

CivicBrain is running.
  App:            http://localhost:3000
  Email inbox:    http://localhost:8025   (your login codes appear here)
  Staff login:    http://localhost:3000/admin/login
      Officer:    officer@civicbrain.demo / Officer!Demo2026
      Admin:      admin@civicbrain.demo   / Admin!Demo2026x
To stop:  docker compose down
MSG
(command -v open >/dev/null && open http://localhost:3000) || (command -v xdg-open >/dev/null && xdg-open http://localhost:3000) || true
