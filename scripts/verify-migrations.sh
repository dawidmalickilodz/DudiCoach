#!/usr/bin/env bash
# Migration replay + SQL/security verification for the athlete session
# outcome schema (PR1, Lane C).
#
# Phases:
#   1. Clean replay: all migrations applied to a fresh local Supabase DB,
#      then schema/ACL/RLS security assertions + full behavior matrix.
#   2a. Upgrade pre-check: a pre-outcome DB (all migrations except the
#       outcome pair and anything newer) seeded with a legacy row that is
#       valid under the legacy rule but fails the new POSIX trim rule MUST
#       reject the migration.
#   2b. Upgrade replay: a pre-outcome DB with valid legacy data plus the
#       production Cloud legacy ACL fixture (anon/authenticated full DML),
#       upgraded by the outcome migrations, then the remaining newer
#       migrations applied in chronological order (same as production,
#       including the 20260820100000 grant-hardening migration), then
#       security + behavior + upgrade assertions.
#
# Usage: bash scripts/verify-migrations.sh
# Requires: Docker engine running, supabase CLI resolvable via npx.

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

SUPABASE="npx --yes supabase@2.114.0"

if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker engine is not running" >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q '^supabase_db_'; then
  echo "Starting local Supabase stack..."
  # Clear stale stack state that can hold project ports on reused runners.
  $SUPABASE stop --no-backup >/dev/null 2>&1 || true
  $SUPABASE start
fi

PROJECT_ID="$(sed -n 's/^project_id = "\(.*\)"/\1/p' supabase/config.toml)"
CONTAINER="supabase_db_${PROJECT_ID}"

run_sql() {
  docker exec -i "${CONTAINER}" psql -U postgres -d postgres -X -q \
    -v ON_ERROR_STOP=1 < "$1" >/dev/null
}

MIG_DIR="supabase/migrations"
OUTCOME_A="${MIG_DIR}/20260727120000_athlete_session_outcome_schema.sql"
OUTCOME_B="${MIG_DIR}/20260727120001_athlete_session_outcome_validate.sql"
# Migrations that chronologically follow the outcome pair. In production they
# are applied AFTER the outcome migrations, so they must be moved aside in the
# upgrade phases to recreate the true pre-outcome state.
NEWER_MIGRATIONS=""
for f in "${MIG_DIR}"/20*.sql; do
  if [[ "$(basename "${f}")" > "$(basename "${OUTCOME_B}")" ]]; then
    NEWER_MIGRATIONS="${NEWER_MIGRATIONS} ${f}"
  fi
done
TMP="$(mktemp -d)"
mkdir -p "${TMP}/moved"
restore_files() {
  local f
  for f in "${TMP}"/moved/*.sql; do
    [ -f "${f}" ] || continue
    mv "${f}" "${MIG_DIR}/"
  done
}
trap 'restore_files; rm -rf "${TMP}"' EXIT
move_aside() {
  mv "${OUTCOME_A}" "${TMP}/moved/"
  mv "${OUTCOME_B}" "${TMP}/moved/"
  local f
  for f in ${NEWER_MIGRATIONS}; do
    mv "${f}" "${TMP}/moved/"
  done
}

echo "== Phase 1: clean replay (all migrations on a fresh DB) =="
$SUPABASE db reset >/dev/null
run_sql tests/sql/fixtures/session-outcome-seed.sql
run_sql tests/sql/fixtures/session-outcome-seed-legacy-valid.sql
run_sql tests/sql/outcome-schema-security.sql
run_sql tests/sql/outcome-schema-behavior.sql
run_sql tests/sql/us014-feedback-rpc-gates.sql
run_sql tests/sql/fixtures/us010-diagnostics-seed.sql
run_sql tests/sql/us010-fms-gates.sql
run_sql tests/sql/fixtures/us013-load-progressions-seed.sql
run_sql tests/sql/us013-load-progressions-gates.sql
echo "   clean replay: PASS"

echo "== Phase 2a: upgrade pre-check rejects invalid legacy rows =="
move_aside
$SUPABASE db reset >/dev/null
run_sql tests/sql/fixtures/session-outcome-seed.sql
run_sql tests/sql/fixtures/session-outcome-seed-legacy-invalid.sql
set +e
docker exec -i "${CONTAINER}" psql -U postgres -d postgres -X -q \
  -v ON_ERROR_STOP=1 < "${TMP}/moved/$(basename "${OUTCOME_A}")" >/dev/null 2>"${TMP}/err.log"
status=$?
set -e
if [ "${status}" -eq 0 ] || ! grep -q 'invalid row' "${TMP}/err.log"; then
  echo "   FAIL: pre-check did not reject whitespace-only legacy feedback" >&2
  cat "${TMP}/err.log" >&2
  exit 1
fi
echo "   upgrade pre-check rejection: PASS"

echo "== Phase 2b: upgrade replay on a pre-outcome DB with legacy data =="
$SUPABASE db reset >/dev/null
run_sql tests/sql/fixtures/session-outcome-seed.sql
run_sql tests/sql/fixtures/session-outcome-seed-legacy-valid.sql
run_sql tests/sql/fixtures/cloud-legacy-acl.sql
run_sql "${TMP}/moved/$(basename "${OUTCOME_A}")"
run_sql "${TMP}/moved/$(basename "${OUTCOME_B}")"
for f in ${NEWER_MIGRATIONS}; do
  run_sql "${TMP}/moved/$(basename "${f}")"
done
run_sql tests/sql/outcome-schema-security.sql
run_sql tests/sql/outcome-schema-behavior.sql
run_sql tests/sql/outcome-upgrade-replay.sql
run_sql tests/sql/us014-feedback-rpc-gates.sql
run_sql tests/sql/fixtures/us010-diagnostics-seed.sql
run_sql tests/sql/us010-fms-gates.sql
run_sql tests/sql/fixtures/us013-load-progressions-seed.sql
run_sql tests/sql/us013-load-progressions-gates.sql
restore_files
echo "   upgrade replay: PASS"

echo "MIGRATION VERIFICATION: ALL PASS"