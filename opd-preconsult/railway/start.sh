#!/bin/bash
set -e

echo "=== OPD Pre-Consultation POC — Railway Startup ==="

# -------------------------------------------------------
# 1. Run DB migrations (requires POSTGRES_* env vars)
# -------------------------------------------------------
if [ -n "$POSTGRES_HOST" ]; then
  echo "[startup] Running database migrations..."

  # Wait for postgres to be ready
  for i in $(seq 1 30); do
    if python3 -c "
import psycopg2, os
psycopg2.connect(
  host=os.environ['POSTGRES_HOST'],
  port=os.environ.get('POSTGRES_PORT','5432'),
  dbname=os.environ.get('POSTGRES_DB','opd_preconsult'),
  user=os.environ.get('POSTGRES_USER','opd_user'),
  password=os.environ.get('POSTGRES_PASSWORD',''),
).close()
print('connected')
" 2>/dev/null; then
      echo "[startup] PostgreSQL is ready"
      break
    fi
    echo "[startup] Waiting for PostgreSQL... ($i/30)"
    sleep 2
  done

  # Run each migration file
  for f in /app/db/migrations/*.sql; do
    echo "[startup] Running migration: $(basename $f)"
    python3 -c "
import psycopg2, os, sys
conn = psycopg2.connect(
  host=os.environ['POSTGRES_HOST'],
  port=os.environ.get('POSTGRES_PORT','5432'),
  dbname=os.environ.get('POSTGRES_DB','opd_preconsult'),
  user=os.environ.get('POSTGRES_USER','opd_user'),
  password=os.environ.get('POSTGRES_PASSWORD',''),
)
conn.autocommit = True
with open(sys.argv[1]) as f:
  conn.cursor().execute(f.read())
conn.close()
print(f'  OK: {sys.argv[1]}')
" "$f" 2>&1 || echo "  (migration may already be applied)"
  done

  echo "[startup] Migrations complete"
else
  echo "[startup] WARNING: POSTGRES_HOST not set, skipping migrations"
fi

# -------------------------------------------------------
# 2. Remove default nginx site, configure ours
# -------------------------------------------------------
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default

# -------------------------------------------------------
# 3. Set PORT for Railway (Railway expects app on $PORT)
#    We run nginx on $PORT (default 8080)
# -------------------------------------------------------
RAILWAY_PORT=${PORT:-8080}
sed -i "s/listen 8080/listen $RAILWAY_PORT/" /etc/nginx/sites-available/default
export PORT=$RAILWAY_PORT

echo "[startup] Nginx will listen on port $RAILWAY_PORT"
echo "[startup] Starting all services via supervisord..."

# -------------------------------------------------------
# 4. Start all services
# -------------------------------------------------------
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/app.conf
