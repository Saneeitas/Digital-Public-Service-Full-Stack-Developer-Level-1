#!/bin/bash
# Runs the course's practice services on THIS computer: up to five services
# (A to E) and the training gateway, each service with its own PostgreSQL
# database. It is a stand-in for the provisioned environment. It is used by
# Module 9 (A, B and D) and Modules 10 and 11 (A to E).
#
#   bash tools/local-stack.sh setup a b d      create folders, databases, secrets
#   bash tools/local-stack.sh setup a b c d e  the full set for Modules 10 and 11
#   bash tools/local-stack.sh start            start the gateway and the services
#   bash tools/local-stack.sh status           which ones answer /health
#   bash tools/local-stack.sh reset            put every database back to the starting records
#   bash tools/local-stack.sh stop             stop everything this script started
#
# Everything it creates is in .local-stack/ (ignored by Git). The secrets in
# there are random and made on your computer; none of them is in the repo.
#
# Needs: Node 22, PostgreSQL 16 running, permission to act as the postgres user
# (see tools/create-local-db.sh). Tested on Linux only.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STACK="${STACK_DIR:-$REPO/.local-stack}"
GATEWAY_PORT="${GATEWAY_PORT:-8090}"
BASE_PORT="${BASE_PORT:-3001}"           # A=3001, B=3002, C=3003, D=3004, E=3005
PROVIDER_CODE="$REPO/module-09/provider-service"   # service A
CONSUMER_CODE="$REPO/module-09/consumer-service"   # services B, C, D, E
LEARNER_TOOLS="$REPO/module-10/learner-tools"

port_of() { echo $(( BASE_PORT + $(printf '%d' "'$1") - 97 )); }
deps_of() { case "$1" in b) echo "a d";; c) echo "a b";; d) echo "a";; e) echo "a b c d";; *) echo "";; esac; }
secret() { head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n'; }
env_value() { grep "^$2=" "$1/.env" | head -n 1 | cut -d= -f2-; }
installed() { [ -f "$STACK/letters" ] && cat "$STACK/letters"; }
has() { installed | tr ' ' '\n' | grep -qx "$1"; }

cmd_setup() {
  [ "$#" -ge 1 ] || { echo "Give the letters, for example: setup a b d"; exit 2; }
  for l in "$@"; do [[ "$l" =~ ^[a-e]$ ]] || { echo "Letters a to e only."; exit 2; }; done
  command -v node >/dev/null || { echo "Node is not installed."; exit 1; }
  if [ -d "$STACK" ]; then echo "$STACK already exists. Run '$0 clean' first to start again."; exit 1; fi
  mkdir -p "$STACK"
  LETTERS="$(printf '%s\n' "$@" | sort -u | tr '\n' ' ' | sed 's/ $//')"

  echo "Installing packages once (shared by all services)..."
  mkdir -p "$STACK/shared"
  cp "$CONSUMER_CODE/package.json" "$CONSUMER_CODE/package-lock.json" "$STACK/shared/"
  (cd "$STACK/shared" && npm ci --silent)

  for l in $LETTERS; do
    dir="$STACK/$l"; mkdir -p "$dir"
    code="$CONSUMER_CODE"; [ "$l" = a ] && code="$PROVIDER_CODE"
    (cd "$code" && tar cf - --exclude=node_modules --exclude=.env --exclude=.env.admin --exclude=evidence .) | (cd "$dir" && tar xf -)
    ln -s ../shared/node_modules "$dir/node_modules"
    if [ "$l" = e ] && [ -d "$LEARNER_TOOLS" ]; then
      cp "$LEARNER_TOOLS/status.html" "$LEARNER_TOOLS/status.js" "$dir/public/" 2>/dev/null || true
    fi
    echo "--- service ${l^^}"
    (cd "$dir" && bash "$REPO/tools/create-local-db.sh" "stk$l")
  done

  # Gateway: one token per consumer, each provider's own service token.
  node - "$STACK" "$GATEWAY_PORT" "$BASE_PORT" $LETTERS <<'NODE'
const fs = require("fs");
const crypto = require("crypto");
const [stack, gwPort, basePort, ...letters] = process.argv.slice(2);
const DEPS = { b: ["a", "d"], c: ["a", "b"], d: ["a"], e: ["a", "b", "c", "d"] };
const portOf = (l) => Number(basePort) + l.charCodeAt(0) - 97;
const envValue = (l, key) => {
  const line = fs.readFileSync(`${stack}/${l}/.env`, "utf8").split("\n").find((x) => x.startsWith(key + "="));
  return line.slice(key.length + 1);
};
const gw = {
  port: Number(gwPort), upstreamTimeoutMs: 3000, logFile: `${stack}/gateway-calls.log`,
  providers: {}, consumers: {}, allowed: {},
};
const tokens = {};
for (const l of letters) {
  if (l !== "e") gw.providers[l] = { baseUrl: `http://127.0.0.1:${portOf(l)}`, serviceToken: envValue(l, "SERVICE_TOKEN") };
  if (DEPS[l]) {
    tokens[l] = crypto.randomBytes(24).toString("hex");
    gw.consumers[tokens[l]] = l;
    gw.allowed[l] = DEPS[l].filter((p) => letters.includes(p));
  }
}
fs.writeFileSync(`${stack}/gateway.config.json`, JSON.stringify(gw, null, 2), { mode: 0o600 });
for (const l of letters) {
  let extra = `PORT=${portOf(l)}\nOWN_URL=http://127.0.0.1:${portOf(l)}\n`;
  if (DEPS[l]) {
    extra += `GATEWAY_URL=http://127.0.0.1:${gwPort}\nGATEWAY_TOKEN=${tokens[l]}\n`;
    extra += `DEPENDENCIES=${gw.allowed[l].join(",")}\n`;
  }
  fs.appendFileSync(`${stack}/${l}/.env`, extra);
}
const journey = {
  services: Object.fromEntries(letters.map((l) => [l, `http://127.0.0.1:${portOf(l)}`])),
  serviceNames: { a: "Registry", b: "Education", c: "Social Services", d: "Health" },
  evidenceDir: `${stack}/evidence`, gatewayLog: `${stack}/gateway-calls.log`,
};
fs.writeFileSync(`${stack}/journey.config.json`, JSON.stringify(journey, null, 2));
NODE
  chmod 600 "$STACK/gateway.config.json"
  echo "$LETTERS" > "$STACK/letters"
  echo
  echo "Set up services: ${LETTERS^^}. Now run: bash tools/local-stack.sh start"
}

wait_health() { # url
  for _ in $(seq 1 60); do
    curl -sf -o /dev/null -m 2 "$1" && return 0
    sleep 0.25
  done
  return 1
}

cmd_start() {
  [ -f "$STACK/letters" ] || { echo "Run setup first."; exit 1; }
  mkdir -p "$STACK/logs"
  for port in $GATEWAY_PORT $(for l in $(installed); do port_of "$l"; done); do
    if curl -s -o /dev/null -m 1 "http://127.0.0.1:$port/"; then
      echo "Something is already listening on port $port. Stop it first (is an earlier stack still running?)."; exit 1
    fi
  done
  if [ -f "$STACK/gateway.pid" ] && kill -0 "$(cat "$STACK/gateway.pid")" 2>/dev/null; then
    echo "Already running. Use stop first."; exit 1
  fi
  (cd "$STACK"; nohup node "$REPO/module-09/gateway/server.js" "$STACK/gateway.config.json" \
    > "$STACK/logs/gateway.log" 2>&1 & echo $! > "$STACK/gateway.pid")
  for l in $(installed); do
    (cd "$STACK/$l"; nohup node --env-file=.env server.js > "$STACK/logs/$l.log" 2>&1 & echo $! > "$STACK/$l.pid")
  done
  fail=0
  for l in $(installed); do
    if wait_health "http://127.0.0.1:$(port_of "$l")/health"; then echo "service ${l^^}  http://127.0.0.1:$(port_of "$l")  up"
    else echo "service ${l^^}  DID NOT START (see $STACK/logs/$l.log)"; fail=1; fi
  done
  echo "gateway     http://127.0.0.1:$GATEWAY_PORT"
  return $fail
}

cmd_stop() {
  for f in "$STACK"/*.pid; do
    [ -e "$f" ] || continue
    pid="$(cat "$f")"
    kill "$pid" 2>/dev/null && echo "stopped $(basename "$f" .pid)" || true
    rm -f "$f"
  done
}

cmd_stop_one() { # letter: used for the failure drills in Modules 10 and 11
  [ -f "$STACK/$1.pid" ] || { echo "$1 is not running."; exit 1; }
  kill "$(cat "$STACK/$1.pid")" && rm -f "$STACK/$1.pid" && echo "stopped ${1^^}"
}

cmd_start_one() {
  has "$1" || { echo "$1 was not set up."; exit 1; }
  [ -f "$STACK/$1.pid" ] && kill -0 "$(cat "$STACK/$1.pid")" 2>/dev/null && { echo "$1 already running."; exit 1; }
  (cd "$STACK/$1"; nohup node --env-file=.env server.js > "$STACK/logs/$1.log" 2>&1 & echo $! > "$STACK/$1.pid")
  wait_health "http://127.0.0.1:$(port_of "$1")/health" && echo "service ${1^^} up" || { echo "service ${1^^} did not start"; exit 1; }
}

cmd_status() {
  [ -f "$STACK/letters" ] || { echo "Nothing set up."; exit 1; }
  for l in $(installed); do
    code="$(curl -s -o /dev/null -m 2 -w '%{http_code}' "http://127.0.0.1:$(port_of "$l")/health" || true)"
    echo "service ${l^^}  /health -> ${code:-none}"
  done
}

cmd_reset() {
  for l in $(installed); do (cd "$STACK/$l" && bash "$REPO/tools/reset-data.sh"); done
  rm -rf "$STACK/evidence" "$STACK/gateway-calls.log"
}

cmd_clean() {
  cmd_stop
  for l in $(installed 2>/dev/null || true); do
    super() { if [ -n "${PSQL_SUPER:-}" ]; then $PSQL_SUPER "$@"; elif command -v sudo >/dev/null && sudo -n -u postgres true 2>/dev/null; then sudo -n -u postgres psql "$@"; elif [ "$(id -u)" = 0 ] && command -v runuser >/dev/null; then runuser -u postgres -- psql "$@"; else psql -U postgres -h 127.0.0.1 "$@"; fi; }
    super -q -c "DROP DATABASE IF EXISTS stk${l}db" -c "DROP ROLE IF EXISTS stk${l}_app" -c "DROP ROLE IF EXISTS stk${l}_admin" 2>/dev/null || true
  done
  rm -rf "$STACK"
  echo "Removed the practice stack and its databases."
}

case "${1:-}" in
  setup) shift; cmd_setup "$@";;
  start) cmd_start;;
  stop) cmd_stop;;
  status) cmd_status;;
  reset) cmd_reset;;
  clean) cmd_clean;;
  stop-one) cmd_stop_one "${2:?letter}";;
  start-one) cmd_start_one "${2:?letter}";;
  *) sed -n 2,18p "$0"; exit 2;;
esac
