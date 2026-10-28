#!/usr/bin/env node
// TRAINING TOOL — stand-in for the supplied group journey / failure script.
//
//   node journey.js journey.config.json                   full journey
//   node journey.js journey.config.json --down d          failure check
//
// The full journey creates one synthetic citizen and follows it through the
// five services (A birth, D vaccination, B enrolment, C application, E portal).
// The failure check expects you to have stopped one service first. It reuses
// the citizen from the last full journey, so nothing is written to the
// stopped service.
//
// No packages needed: Node 22 only.
const fs = require("fs");
const path = require("path");

const configPath = process.argv[2];
const downIndex = process.argv.indexOf("--down");
const DOWN = downIndex > 0 ? process.argv[downIndex + 1] : null;
if (!configPath || (downIndex > 0 && !/^[a-e]$/.test(DOWN || ""))) {
  console.error("Usage: node journey.js <config.json> [--down <a|b|c|d|e>]");
  process.exit(2);
}
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const URLS = config.services;
const PASSWORD = config.citizenPassword || "journey-pass-123456";
const EVIDENCE_DIR = config.evidenceDir || "evidence";
const STATE_FILE = path.join(EVIDENCE_DIR, "journey-last-citizen.json");

// The charter's dependency map (who consumes whom).
const CONSUMES = { b: ["a", "d"], c: ["a", "b"], d: ["a"], e: ["a", "b", "c", "d"] };
// Optional: the names your teams show citizens, e.g. {"d": "Health"}.
const NAMES = config.serviceNames || {};
const LEAKS = /node_modules|ECONN|fetch failed|TypeError|ReferenceError|\bat .+:\d+:\d+/;

const lines = [];
const MOCKS = new Set(); // services that say /health {"mock": true}
const skipped = new Set();
let failures = 0;
function say(text) {
  console.log(text);
  lines.push(text);
}
function check(ok, label, detail) {
  if (!ok) failures += 1;
  say(`${ok ? "PASS" : "FAIL"}  ${label}${!ok && detail ? `  -> ${detail}` : ""}`);
  return ok;
}

async function call(service, method, route, { body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const response = await fetch(`${URLS[service]}${route}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(9000),
    });
    const text = await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* not JSON */
    }
    return { status: response.status, json, text };
  } catch (error) {
    return { status: 0, json: null, text: "", error: error.message };
  }
}

async function citizenToken(service, citizenId) {
  const credentials = { citizenId, password: PASSWORD };
  await call(service, "POST", "/v1/auth/register", { body: credentials });
  const login = await call(service, "POST", "/v1/auth/login", { body: credentials });
  return login.json && login.json.token;
}

async function dependenciesOf(service, citizenId) {
  if (MOCKS.has(service)) return null;
  const token = await citizenToken(service, citizenId);
  if (!token) return { status: 0, text: "", json: null, error: "could not log in" };
  return call(service, "GET", "/v1/me/dependencies", { token });
}

function byProvider(reply) {
  const map = {};
  for (const item of (reply.json && reply.json.dependencies) || []) {
    map[item.provider] = item;
  }
  return map;
}

function isMock(label, reply) {
  if (reply !== null) return false;
  if (!skipped.has(label)) {
    skipped.add(label);
    say(`SKIP  ${label} is a MOCK: its own dependency calls cannot be checked`);
  }
  return true;
}

function expectFound(label, reply, provider, status) {
  if (isMock(label, reply)) return;
  const item = byProvider(reply)[provider];
  const ok = reply.status === 200 && item && item.available && item.found &&
    item.status === status && /^\d{4}-\d{2}-\d{2}$/.test(item.submittedOn);
  check(ok, `${label} sees ${provider.toUpperCase()} as ${status}`,
    `HTTP ${reply.status}, ${JSON.stringify(item)}`);
}

function expectUnavailable(label, reply, provider) {
  if (isMock(label, reply)) return;
  const item = byProvider(reply)[provider];
  const ok = reply.status === 200 && item && item.available === false &&
    typeof item.message === "string" && item.message.length > 10 &&
    (!NAMES[provider] || item.message.includes(NAMES[provider]));
  check(ok, `${label} shows a clear message for ${provider.toUpperCase()}`,
    `HTTP ${reply.status}, ${JSON.stringify(item)}`);
  if (ok) say(`      citizen sees:\n      "${item.message}"`);
}

function expectNoLeak(label, reply) {
  if (reply === null) return;
  check(!LEAKS.test(reply.text), `${label} reply shows no stack trace or internals`);
}

async function health() {
  const result = {};
  for (const service of Object.keys(URLS)) {
    const reply = await call(service, "GET", "/health");
    result[service] = reply.status === 200;
    if (reply.json && reply.json.mock === true) MOCKS.add(service);
  }
  return result;
}

function randomCitizen() {
  const digits = String(Math.floor(Math.random() * 1e7)).padStart(7, "0");
  return `CIT-9${digits}`;
}

async function seed(service, citizenId, status) {
  const body = { citizenId, status };
  let reply = await call(service, "POST", "/v1/records", { body });
  let note = "";
  if (reply.status === 401) {
    // The team protected the route. Try again as the citizen, once.
    const token = await citizenToken(service, citizenId);
    reply = await call(service, "POST", "/v1/records", { body, token });
    note = " (needed a login)";
  }
  check(reply.status === 201 && reply.json && reply.json.citizenId === citizenId,
    `${service.toUpperCase()} accepted the synthetic record (${status})${note}`,
    `HTTP ${reply.status} ${reply.text.slice(0, 100)}`);
}

async function fullJourney() {
  const up = await health();
  for (const [service, ok] of Object.entries(up)) {
    check(ok, `${service.toUpperCase()} answers /health` +
      (MOCKS.has(service) ? "  (MOCK)" : ""));
  }
  if (Object.values(up).includes(false)) {
    say("\nA service is not running. Start it before the journey.");
    return 2;
  }
  const citizenId = randomCitizen();
  say(`\nSynthetic citizen: ${citizenId}\n`);

  say("1  A registers the birth");
  await seed("a", citizenId, "APPROVED");
  say("2  D checks the child, then records the vaccination");
  expectFound("D", await dependenciesOf("d", citizenId), "a", "APPROVED");
  await seed("d", citizenId, "APPROVED");
  say("3  B checks A and D, then records the enrolment");
  const b = await dependenciesOf("b", citizenId);
  expectFound("B", b, "a", "APPROVED");
  expectFound("B", b, "d", "APPROVED");
  await seed("b", citizenId, "SUBMITTED");
  say("4  C checks A and B, then records the application");
  const c = await dependenciesOf("c", citizenId);
  expectFound("C", c, "a", "APPROVED");
  expectFound("C", c, "b", "SUBMITTED");
  await seed("c", citizenId, "SUBMITTED");
  say("5  E reads all four");
  const e = await dependenciesOf("e", citizenId);
  expectFound("E", e, "a", "APPROVED");
  expectFound("E", e, "b", "SUBMITTED");
  expectFound("E", e, "c", "SUBMITTED");
  expectFound("E", e, "d", "APPROVED");
  for (const [label, reply] of [["B", b], ["C", c], ["E", e]]) {
    expectNoLeak(label, reply);
  }
  if (config.gatewayLog) gatewayEdges(citizenId);
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify({ citizenId }));
  return 0;
}

// The gateway log is optional evidence that the calls really crossed it.
function gatewayEdges(citizenId) {
  say("6  The gateway log shows every dependency used");
  const wanted = [];
  for (const [consumer, providers] of Object.entries(CONSUMES)) {
    if (MOCKS.has(consumer)) continue;
    for (const provider of providers) wanted.push(`${consumer}>${provider}`);
  }
  const seen = new Set();
  for (const line of fs.readFileSync(config.gatewayLog, "utf8").split("\n")) {
    if (!line.includes(citizenId)) continue;
    const entry = JSON.parse(line);
    if (entry.status === 200) seen.add(`${entry.consumer}>${entry.provider}`);
  }
  for (const edge of wanted) {
    check(seen.has(edge),
      `gateway logged a 200 for ${edge.split(">")[0].toUpperCase()} calling ` +
      `${edge.split(">")[1].toUpperCase()}`);
  }
}

async function failureCheck() {
  if (!fs.existsSync(STATE_FILE)) {
    say("No earlier journey found. Run the full journey first.");
    return 2;
  }
  const { citizenId } = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  const gone = await call(DOWN, "GET", "/health");
  if (gone.status === 200) {
    say(`Service ${DOWN.toUpperCase()} is still running. Stop it, then run again.`);
    return 2;
  }
  await health();
  say(`Failure check: ${DOWN.toUpperCase()} is stopped. Citizen ${citizenId}\n`);
  check(true, `${DOWN.toUpperCase()} is not answering (this is the injected failure)`);
  for (const consumer of Object.keys(CONSUMES)) {
    if (consumer === DOWN) continue;
    const reply = await dependenciesOf(consumer, citizenId);
    const label = consumer.toUpperCase();
    if (isMock(label, reply)) continue;
    check(reply.status === 200, `${label} still answers (HTTP 200, not 500)`,
      `HTTP ${reply.status} ${reply.error || ""}`);
    expectNoLeak(label, reply);
    for (const provider of CONSUMES[consumer]) {
      if (provider === DOWN) expectUnavailable(label, reply, provider);
      else {
        const item = byProvider(reply)[provider];
        check(item && item.available && item.found,
          `${label} still sees ${provider.toUpperCase()} normally`);
      }
    }
    if (!CONSUMES[consumer].includes(DOWN)) {
      say(`      (${label} does not depend on ${DOWN.toUpperCase()}, so it must be unaffected)`);
    }
  }
  return 0;
}

(async () => {
  const code = DOWN ? await failureCheck() : await fullJourney();
  const mockNote = MOCKS.size
    ? `\nNOTE  ${[...MOCKS].map((m) => m.toUpperCase()).join(", ")} answered as a MOCK. ` +
      "This result does not count as that service's delivered implementation."
    : "";
  say(failures === 0 && code === 0 ? "\nAll checks passed"
    : code === 2 ? "\nNot run" : `\n${failures} check(s) failed`);
  if (mockNote) say(mockNote);
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
  const name = `journey-${DOWN ? `down-${DOWN}` : "full"}-${stamp}.txt`;
  fs.writeFileSync(path.join(EVIDENCE_DIR, name), lines.join("\n") + "\n");
  process.exit(code !== 0 ? code : failures ? 1 : MOCKS.size ? 3 : 0);
})();
