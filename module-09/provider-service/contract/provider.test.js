// Provider tests: your own service, checked the way a consumer would check it.
// Run with your service started:  node --env-file=.env --test contract/provider.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  loadContract,
  assertMatchesContract,
  callOwnService,
} = require("./contract-lib");

const CONTRACT = loadContract("openapi.yaml");
const ROUTE = "/v1/service/citizens/{citizenId}/status";
const STATUSES = ["SUBMITTED", "IN_REVIEW", "APPROVED", "REJECTED"];

// The shared seed data from the charter: citizen ID and its agreed status.
const SEED = {
  "CIT-10000001": "SUBMITTED",
  "CIT-10000002": "APPROVED",
};

for (const [citizenId, status] of Object.entries(SEED)) {
  test(`seed: ${citizenId} exists with status ${status}`, async () => {
    const r = await callOwnService(citizenId);
    assert.equal(r.status, 200);
    assert.equal(r.body.status, status);
  });
}

test("provider: the answer matches my own OpenAPI file", async () => {
  const r = await callOwnService("CIT-10000001");
  assertMatchesContract(CONTRACT, ROUTE, "get", 200, r.body);
});

test("provider: only the fields the charter allows are returned", async () => {
  const r = await callOwnService("CIT-10000001");
  const allowed = ["citizenId", "status", "submittedOn"];
  assert.deepEqual(Object.keys(r.body).sort(), allowed);
});

test("provider: status and date use the charter formats", async () => {
  const r = await callOwnService("CIT-10000001");
  assert.ok(STATUSES.includes(r.body.status));
  assert.match(r.body.submittedOn, /^\d{4}-\d{2}-\d{2}$/);
});

test("provider: an unknown ID returns 404 and the error format", async () => {
  const r = await callOwnService("CIT-99999999");
  assert.equal(r.status, 404);
  assertMatchesContract(CONTRACT, ROUTE, "get", 404, r.body);
});

test("provider: a malformed ID returns 400 and the error format", async () => {
  const r = await callOwnService("NOT-AN-ID");
  assert.equal(r.status, 400);
  assertMatchesContract(CONTRACT, ROUTE, "get", 400, r.body);
});

test("provider: a call without the service token returns 401", async () => {
  const r = await callOwnService("CIT-10000001", { token: "" });
  assert.equal(r.status, 401);
  assertMatchesContract(CONTRACT, ROUTE, "get", 401, r.body);
});
