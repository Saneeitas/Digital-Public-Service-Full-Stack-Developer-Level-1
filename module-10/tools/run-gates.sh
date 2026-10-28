#!/bin/bash
# TRAINING TOOL — stand-in for the supplied common gate runner.
# Re-runs the earlier gate scripts a team service already has, and writes the
# result to evidence/gates-<time>.txt. Run it in the team's app folder with the
# service already started:
#
#   BASE_URL=http://localhost:3000/v1 bash run-gates.sh
#
# PASS    the script ran and passed
# FAIL    the script ran and something failed (or it timed out)
# MISSING the script is not in the folder: that gate is NOT passed
# MANUAL  cannot be run by a script here: the trainer checks it by hand
BASE_URL="${BASE_URL:-http://localhost:3000/v1}"
HEALTH_URL="${BASE_URL%/v1}/health"
LIMITER=""
command -v timeout >/dev/null 2>&1 && LIMITER="timeout 120"
mkdir -p evidence
STAMP=$(date +%Y-%m-%d-%H%M)
OUT="evidence/gates-$STAMP.txt"
RAW="evidence/gates-$STAMP-detail.txt"
: > "$OUT"; : > "$RAW"
PASS=0; FAIL=0; MISSING=0; MANUAL=0

report() { # status module title
  printf '%-8s %-4s %s\n' "$1" "$2" "$3" | tee -a "$OUT"
  case "$1" in PASS) PASS=$((PASS+1));; FAIL) FAIL=$((FAIL+1));;
    MISSING) MISSING=$((MISSING+1));; MANUAL) MANUAL=$((MANUAL+1));; esac
}

run() { # module title command...
  local module="$1" title="$2"; shift 2
  echo "=== $module $title: $*" >> "$RAW"
  if $LIMITER "$@" >> "$RAW" 2>&1; then report PASS "$module" "$title"
  else report FAIL "$module" "$title"; fi
}

if [ ! -f .env ]; then echo "Run this in your app folder (no .env here)."; exit 2; fi
export BASE_URL

echo "Gate re-run $(date '+%Y-%m-%d %H:%M')  service: $BASE_URL" | tee -a "$OUT"
echo | tee -a "$OUT"

report MANUAL M3 "Accessibility: keyboard, NVDA and axe on the form"

TV=$(find . -name test-validation.js -not -path '*/node_modules/*' | head -n 1)
if [ -n "$TV" ]; then
  run M4 "Form validation tests" bash -c "cd '$(dirname "$TV")' && node test-validation.js"
else report MISSING M4 "Form validation tests (test-validation.js not found)"; fi

if grep -q '"test"' package.json 2>/dev/null; then
  run M5 "API test suite (npm test)" npm test
else report MISSING M5 "API test suite (no test script in package.json)"; fi

if [ -f check-api.js ]; then
  run M6 "API behaviour checks" node --env-file=.env check-api.js
else report MISSING M6 "API behaviour checks (check-api.js not found)"; fi
report MANUAL M6 "Transaction integrity: needs the failure hook (trainer runs it)"

if [ -f check-auth.js ]; then
  run M7 "Login and record ownership checks" node --env-file=.env check-auth.js
else report MISSING M7 "Login checks (check-auth.js not found)"; fi
if [ -f check-service-token.js ]; then
  run M7 "Service-token checks" node --env-file=.env check-service-token.js
else report MISSING M7 "Service-token checks (check-service-token.js not found)"; fi

case "$(uname -s)" in
  Linux)
    if [ "$(stat -c %a .env)" = "600" ]; then report PASS M8 ".env permissions are 600"
    else report FAIL M8 ".env permissions are not 600"; fi ;;
  *) report MANUAL M8 ".env permissions: check on the VM, not on this computer" ;;
esac
if [ "$(curl -s -o /dev/null -m 5 -w '%{http_code}' "$HEALTH_URL")" = "200" ]; then
  report PASS M8 "/health answers 200"
else report FAIL M8 "/health does not answer 200"; fi
LEAKED=""
for name in JWT_SECRET SERVICE_TOKEN PGPASSWORD GATEWAY_TOKEN; do
  value=$(grep "^$name=" .env | cut -d= -f2-)
  [ -z "$value" ] && continue
  hits=$(grep -r -l -F -- "$value" evidence 2>/dev/null)
  if [ -n "$hits" ]; then LEAKED=yes; echo "$name: $hits" >> "$RAW.leaks"; fi
done
if [ -z "$LEAKED" ]; then report PASS M8 "No secret value appears in evidence/"
else report FAIL M8 "A secret value appears in evidence/ (see $RAW.leaks)"; fi
report MANUAL M8 "Recovery after kill and reboot (trainer watches recover-test.sh)"

if grep -q '"contract"' package.json 2>/dev/null; then
  run M9 "Consumer contract tests (npm run contract)" npm run contract
else report MISSING M9 "Contract tests (no contract script; Team A: provider tests)"; fi

echo | tee -a "$OUT"
echo "PASS $PASS   FAIL $FAIL   MISSING $MISSING   MANUAL $MANUAL" | tee -a "$OUT"
echo "Detail: $RAW" | tee -a "$OUT"
[ "$FAIL" -eq 0 ] && [ "$MISSING" -eq 0 ]
