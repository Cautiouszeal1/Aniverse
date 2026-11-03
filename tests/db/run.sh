#!/usr/bin/env bash
# Runs migrations + DB tests against a throwaway local Postgres database.
# Usage: PGURL=postgres://... tests/db/run.sh   (defaults to local socket)
set -euo pipefail
DIR="$(cd "$(dirname "$0")/../.." && pwd)"
DB="aniverse_test_$$"
createdb "$DB"
trap 'dropdb --if-exists "$DB"' EXIT
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/tests/db/supabase-stub.sql"
for f in "$DIR"/supabase/migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f"; done
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/tests/db/ledger.test.sql"
