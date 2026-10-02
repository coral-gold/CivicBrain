#!/bin/bash
# Double-click friendly launcher for Mac/Linux:  ./start.sh
cd "$(dirname "$0")"
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed. Install Docker Desktop from https://www.docker.com/products/docker-desktop and try again."
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running. Open Docker Desktop, wait until it is ready, then run this again."
  exit 1
fi
echo "Starting CivicBrain. The FIRST time can take 5-20 minutes; later starts take under a minute."
docker compose up --build -d || { echo "Something went wrong while building. Please send a screenshot of this window."; exit 1; }
echo "Waiting for the app to be ready..."
for i in $(seq 1 90); do
  curl -fs http://localhost:3000/api/public/config >/dev/null 2>&1 && break
  sleep 2
  if [ "$i" = 90 ]; then echo "The app did not become ready:"; docker compose ps; docker compose logs --tail 25; exit 1; fi
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
