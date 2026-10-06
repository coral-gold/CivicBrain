#!/bin/bash
# Mac / Linux launcher:  ./start.sh
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Install the LTS version from https://nodejs.org and run this again."
  exit 1
fi
if [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  echo "Your Node.js is too old (need 20 or newer). Install the LTS version from https://nodejs.org"
  exit 1
fi
if [ ! -d node_modules ]; then
  echo "First run: installing (a few minutes)..."
  npm install || { echo "Install failed. Please send a screenshot of this window."; exit 1; }
fi
echo
echo "Starting CivicBrain. The first start also downloads a small database (about 100 MB) - please wait."
echo "When you see 'CivicBrain API listening', open http://localhost:5173"
echo "Your login codes are printed in this window (look for [DEV ONLY] OTP)."
(sleep 25; (command -v open >/dev/null && open http://localhost:5173) || (command -v xdg-open >/dev/null && xdg-open http://localhost:5173) || true) &
npm run demo
