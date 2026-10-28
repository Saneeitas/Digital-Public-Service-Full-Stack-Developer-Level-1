#!/bin/bash
# Creates a local PostgreSQL database for one service, the way the course's
# provisioned environment has it: an admin account that owns the tables and
# an application account that may only read and write rows.
#
# Run it inside the service folder (the one that has a db/ folder):
#   bash ../../tools/create-local-db.sh team1
#
# It writes .env (application account and secrets) and .env.admin (admin
# account, for resetting data). Both are ignored by Git. Never commit them.
# Needs PostgreSQL 16 running on this computer and permission to act as the
# postgres user (sudo, runuser, or PSQL_SUPER="psql -U postgres -h 127.0.0.1").
# Tested on Linux only.
set -euo pipefail

PREFIX="${1:?Give a short name, for example team1}"
[[ "$PREFIX" =~ ^[a-z][a-z0-9]{1,15}$ ]] || { echo "Use letters and digits only."; exit 2; }
ADMIN="${PREFIX}_admin"; APP="${PREFIX}_app"; DB="${PREFIX}db"
HOST="${PGHOST:-127.0.0.1}"; PORT="${PGPORT:-5432}"

[ -d db ] || [ -f setup.sql ] || { echo "Run this inside a service folder (it needs a db/ folder or setup.sql)."; exit 2; }
if [ -e .env ] && [ "${2:-}" != "--force" ]; then
  echo ".env already exists. Add --force to replace it (the database passwords change)."
  exit 1
fi

super() {
  if [ -n "${PSQL_SUPER:-}" ]; then $PSQL_SUPER "$@"
  elif command -v sudo >/dev/null 2>&1 && sudo -n -u postgres true 2>/dev/null; then sudo -n -u postgres psql "$@"
  elif command -v runuser >/dev/null 2>&1 && [ "$(id -u)" = 0 ]; then runuser -u postgres -- psql "$@"
  else psql -U postgres -h "$HOST" -p "$PORT" "$@"; fi
}

secret() { head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n'; }
ADMIN_PW="$(secret)"; APP_PW="$(secret)"

super -v ON_ERROR_STOP=1 -q <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$ADMIN') THEN CREATE ROLE $ADMIN LOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$APP') THEN CREATE ROLE $APP LOGIN; END IF;
END \$\$;
ALTER ROLE $ADMIN PASSWORD '$ADMIN_PW';
ALTER ROLE $APP PASSWORD '$APP_PW';
SQL
super -Atc "SELECT 1 FROM pg_database WHERE datname = '$DB'" | grep -q 1 \
  || super -q -c "CREATE DATABASE $DB OWNER $ADMIN"
super -q -c "REVOKE ALL ON DATABASE $DB FROM PUBLIC" -c "GRANT CONNECT ON DATABASE $DB TO $APP"
super -q -d "$DB" -c "GRANT USAGE ON SCHEMA public TO $APP" -c "ALTER SCHEMA public OWNER TO $ADMIN"

run_sql() { PGOPTIONS="-c client_min_messages=warning" PGPASSWORD="$ADMIN_PW" psql -q -h "$HOST" -p "$PORT" -U "$ADMIN" -d "$DB" \
  -v ON_ERROR_STOP=1 -v app_account="$APP" -f "$1" >/dev/null; }
for f in db/schema.sql db/accounts.sql db/grants.sql db/reset-api-data.sql setup.sql; do
  [ -f "$f" ] && { run_sql "$f"; echo "applied $f"; }
done

cat > .env <<ENV
PGHOST=$HOST
PGPORT=$PORT
PGDATABASE=$DB
PGUSER=$APP
PGPASSWORD=$APP_PW
ENV
[ -f auth.js ] && printf 'JWT_SECRET=%s\nSERVICE_TOKEN=%s\n' "$(secret)$(secret)" "$(secret)$(secret)" >> .env
cat > .env.admin <<ENV
PGHOST=$HOST
PGPORT=$PORT
PGDATABASE=$DB
PGUSER=$ADMIN
PGPASSWORD=$ADMIN_PW
ENV
chmod 600 .env .env.admin
echo "Done. Database $DB, application account $APP. Secrets are in .env (not in Git)."
