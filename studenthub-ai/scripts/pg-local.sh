#!/usr/bin/env bash
#
# Starts/stops a user-space PostgreSQL cluster for local development.
#
# Used by `npm run db:up` / `npm run db:down` as a fallback when Docker is not
# installed. The cluster matches the DATABASE_URL in `backend/.env`:
#   user studenthub, database studenthub_ai, port 5432.
#
# Data lives outside the repo in ~/.local/share/studenthub-postgres, so it
# survives reboots and never shows up in git.

set -euo pipefail

PGBIN=/usr/lib/postgresql/18/bin
DATA_DIR="$HOME/.local/share/studenthub-postgres"
LOG_FILE="$HOME/.local/share/studenthub-postgres.log"
SOCKET_DIR=/tmp

ready() {
  "$PGBIN/pg_isready" -h localhost -p 5432 -q
}

start() {
  if ready; then
    echo "[pg-local] PostgreSQL already running on port 5432"
    return 0
  fi

  if [ ! -d "$DATA_DIR" ]; then
    echo "[pg-local] initialising cluster in $DATA_DIR"
    mkdir -p "$DATA_DIR"
    "$PGBIN/initdb" -D "$DATA_DIR" -U studenthub -A trust -E UTF8 >/dev/null
  fi

  echo "[pg-local] starting PostgreSQL (socket in $SOCKET_DIR)"
  "$PGBIN/pg_ctl" -D "$DATA_DIR" -l "$LOG_FILE" \
    -o "-p 5432 -k $SOCKET_DIR" start

  if ! "$PGBIN/psql" -h localhost -p 5432 -U studenthub -d postgres -tAc \
    "SELECT 1 FROM pg_database WHERE datname = 'studenthub_ai'" | grep -q 1; then
    echo "[pg-local] creating database studenthub_ai"
    "$PGBIN/createdb" -h localhost -p 5432 -U studenthub studenthub_ai
  fi
  echo "[pg-local] ready: postgresql://studenthub@localhost:5432/studenthub_ai"
}

stop() {
  if [ -d "$DATA_DIR" ]; then
    "$PGBIN/pg_ctl" -D "$DATA_DIR" stop || true
  fi
  echo "[pg-local] stopped"
}

case "${1:-start}" in
  start) start ;;
  stop) stop ;;
  status)
    if ready; then echo "[pg-local] running"; else echo "[pg-local] not running"; fi
    ;;
  *)
    echo "Usage: $0 {start|stop|status}" >&2
    exit 1
    ;;
esac