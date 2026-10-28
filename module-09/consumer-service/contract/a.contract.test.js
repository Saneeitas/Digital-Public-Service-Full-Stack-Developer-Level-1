// Consumer contract tests for provider A, run through the gateway.
// To test another provider, copy this file and change the five lines marked
// CHANGE, and the letter at the start of each test name.
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  loadContract,
  assertMatchesContract,
  callProvider,
} = require("./contract-lib");

const PROVIDER = "a"; // CHANGE: the provider's letter
const CONTRACT = loadContract("contracts/a-openapi.yaml"); // CHANGE: its file
const ROUTE = "/v1/service/citizens/{citizenId}/status"; // CHANGE if different
const KNOWN_ID = "CIT-10000001"; // CHANGE: a citizen the charter says exists
const UNKNOWN_ID = "CIT-99999999"; // CHANGE: a citizen that does not exist
const STATUSES = ["SUBMITTED", "IN_REVIEW", "APPROVED", "REJECTED"];

test("A: a known citizen ID returns 200 and matches the contract", async () => {
  const r = await callProvider(PROVIDER, KNOWN_ID);
  assert.equal(r.status, 200);
  assertMatchesContract(CONTRACT, ROUTE, "get", 200, r.body);
});

test("A: every required field is present, for the citizen asked for", async () => {
  const r = await callProvider(PROVIDER, KNOWN_ID);
  for (const field of ["citizenId", "status", "submittedOn"]) {
    assert.ok(field in r.body, `the field ${field} is missing`);
  }
  assert.equal(r.body.citizenId, KNOWN_ID);
});

test("A: the status and the date use the charter formats", async () => {
  const r = await callProvider(PROVIDER, KNOWN_ID);
  assert.ok(STATUSES.includes(r.body.status), `unexpected status ${r.body.status}`);
  assert.match(r.body.submittedOn, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(!Number.isNaN(Date.parse(r.body.submittedOn)), "not a real date");
});

test("A: only the fields the charter allows are returned", async () => {
  const r = await callProvider(PROVIDER, KNOWN_ID);
  const allowed = ["citizenId", "status", "submittedOn"];
  assert.deepEqual(Object.keys(r.body).sort(), allowed);
});

test("A: an unknown citizen ID returns 404 and the error format", async () => {
  const r = await callProvider(PROVIDER, UNKNOWN_ID);
  assert.equal(r.status, 404);
  assertMatchesContract(CONTRACT, ROUTE, "get", 404, r.body);
  assert.equal(typeof r.body.error.message, "string");
});

test("A: a malformed citizen ID returns 400 and the error format", async () => {
  const r = await callProvider(PROVIDER, "NOT-AN-ID");
  assert.equal(r.status, 400);
  assertMatchesContract(CONTRACT, ROUTE, "get", 400, r.body);
});

test("A: a call without a token is refused with 401", async () => {
  const r = await callProvider(PROVIDER, KNOWN_ID, { token: "" });
  assert.equal(r.status, 401);
  assertMatchesContract(CONTRACT, ROUTE, "get", 401, r.body);
});
