#!/usr/bin/env bash
# Start Optyamazone buyer + seller Next.js in dev mode under PM2 (hot reload).
# Only touches this repo’s PM2 app names and listeners that belong to frontend-buyer / frontend-seller.
#
# Usage: ./scripts/pm2-dev-frontend.sh
# Optional: OPTY_BUYER_PORT=3120 OPTY_SELLER_PORT=3121 ./scripts/pm2-dev-frontend.sh
# Optional: OPTY_PM2_SAVE=0 to skip `pm2 save` (default: save so resurrect can restore these apps)
# Optional: OPTY_DEV_BIND=0.0.0.0 if you truly need LAN access without nginx (not recommended on shared hosts)

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ROOT_REAL="$(readlink -f "$ROOT")"
cd "$ROOT"

export OPTY_BUYER_PORT="${OPTY_BUYER_PORT:-3120}"
export OPTY_SELLER_PORT="${OPTY_SELLER_PORT:-3121}"
export OPTY_DEV_BIND="${OPTY_DEV_BIND:-127.0.0.1}"

# Stop only TCP listeners on $port whose process cwd is one of our two frontends.
# Never uses fuser -k on the whole port (that could kill unrelated services).
safe_free_opty_port() {
  local port=$1
  local pids
  pids=$(lsof -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
  for pid in $pids; do
    local cwd
    cwd=$(readlink -f "/proc/$pid/cwd" 2>/dev/null || echo "")
    case "$cwd" in
      "$ROOT_REAL/frontend-buyer"|"$ROOT_REAL/frontend-seller")
        kill "$pid" 2>/dev/null || true
        ;;
      *)
        echo "WARN: port $port is in use by PID $pid (cwd=$cwd), not under optyamazone frontends — not killing it." >&2
        ;;
    esac
  done
}

safe_free_opty_port "$OPTY_BUYER_PORT"
safe_free_opty_port "$OPTY_SELLER_PORT"
sleep 2

if lsof -iTCP:"$OPTY_BUYER_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "ERROR: port $OPTY_BUYER_PORT is still in use. Resolve the conflict or set OPTY_BUYER_PORT." >&2
  exit 1
fi
if lsof -iTCP:"$OPTY_SELLER_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "ERROR: port $OPTY_SELLER_PORT is still in use. Resolve the conflict or set OPTY_SELLER_PORT." >&2
  exit 1
fi

# Only delete our named processes (does not affect other PM2 apps on this server)
pm2 delete opty-buyer-dev 2>/dev/null || true
pm2 delete opty-seller-dev 2>/dev/null || true

pm2 start ecosystem.dev.config.cjs

if [[ "${OPTY_PM2_SAVE:-1}" != "0" ]]; then
  pm2 save 2>/dev/null || true
fi

echo "Started opty-buyer-dev (127.0.0.1:$OPTY_BUYER_PORT) and opty-seller-dev (127.0.0.1:$OPTY_SELLER_PORT)."
echo "Nginx → buyer/seller hostnames should proxy to those ports as already configured."
