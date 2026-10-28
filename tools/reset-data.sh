#!/bin/bash
# Puts the service's tables back to the Module 5 starting records.
# Run inside the service folder, after create-local-db.sh. It deletes data.
set -euo pipefail
[ -f .env.admin ] && [ -f db/reset-api-data.sql ] || { echo "Run inside a service folder set up by create-local-db.sh."; exit 2; }
set -a; . ./.env.admin; set +a
psql -q -v ON_ERROR_STOP=1 -f db/reset-api-data.sql && echo "Data reset."
