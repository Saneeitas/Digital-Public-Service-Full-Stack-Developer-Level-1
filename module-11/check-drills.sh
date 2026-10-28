#!/bin/bash
# Checks for the three live-change drills in Module 11, Part D.
#
#   bash check-drills.sh 1 before     look: what the service says today
#   bash check-drills.sh 1 after      check: it says the new words (restart first!)
#   bash check-drills.sh 2 before|after
#   bash check-drills.sh 3 before|after
#
# Point it at your service with BASE_URL (default http://localhost:3000).
# It sends only synthetic data. Drill 2 makes up a new citizen ID each run,
# because registering the same citizen twice answers 409.
BASE="${BASE_URL:-http://localhost:3000}"
DRILL="${1:?drill number 1, 2 or 3}"
PHASE="${2:?before or after}"
[[ "$PHASE" == before || "$PHASE" == after ]] || { echo "Say before or after."; exit 2; }
FAILED=0

expect() { # label expected actual
  if [ "$2" = "$3" ]; then echo "PASS  $1: $3"; else echo "FAIL  $1: expected $2, got $3"; FAILED=1; fi
}
expect_in() { # label expected-text body
  if [[ "$3" == *"$2"* ]]; then echo "PASS  $1: found $2"; else echo "FAIL  $1: expected $2 in: $3"; FAILED=1; fi
}
rand_id() { printf 'CIT-9%07d' $(( (RANDOM * 32768 + RANDOM) % 10000000 )); }
register() { # citizenId password -> prints the HTTP status
  curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/v1/auth/register" \
    -H 'Content-Type: application/json' -d "{\"citizenId\":\"$1\",\"password\":\"$2\"}"
}

case "$DRILL" in
  1)
    body="$(curl -s "$BASE/v1/records/999999")"; echo "$body"
    if [ "$PHASE" = before ]; then expect_in "message" "Record not found" "$body"; else expect_in "message" "No such record" "$body"; fi
    ;;
  2)
    thirteen="$(register "$(rand_id)" "thirteen-char")"
    fourteen="$(register "$(rand_id)" "fourteen-chars")"
    if [ "$PHASE" = before ]; then expect "13 characters" 201 "$thirteen"; else expect "13 characters" 400 "$thirteen"; fi
    expect "14 characters" 201 "$fourteen"
    ;;
  3)
    body="$(curl -s -X POST "$BASE/v1/records" -H 'Content-Type: application/json' -d '{"citizenId":"bad"}')"; echo "$body"
    if [ "$PHASE" = before ]; then expect_in "message" '"message":"Invalid request body"' "$body"; else expect_in "message" '"message":"The request is not valid"' "$body"; fi
    expect_in "fields list" '"field":"citizenId"' "$body"
    ;;
  *) echo "Drill 1, 2 or 3."; exit 2;;
esac
[ "$FAILED" -eq 0 ] && echo "OK" || echo "Something is not as expected."
exit "$FAILED"
