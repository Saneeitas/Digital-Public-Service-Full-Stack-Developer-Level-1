// Tests how this service behaves when a dependency fails. Each test starts its
// own small fake gateway, so no real service has to be stopped.
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const { getStatusFrom } = require("../dependency");

// Words a citizen must never see in a message.
const TECHNICAL = /ECONN|timeout|abort|fetch failed|Error:|stack|undefined/i;

// Starts a fake gateway that answers every request with the given reply.
function fakeGateway(reply) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => reply(req, res));
    server.listen(0, () => {
      resolve({ server, baseUrl: `http://127.0.0.1:${server.address().port}` });
    });
  });
}

async function ask(reply, options = {}) {
  const { server, baseUrl } = await fakeGateway(reply);
  try {
    const settings = { baseUrl, token: "t", ...options };
    return await getStatusFrom("a", "CIT-10000001", settings);
  } finally {
    server.closeAllConnections();
    server.close();
  }
}

const json = (status, text) => (req, res) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(text);
};

test("a good answer is passed on", async () => {
  const body = {
    citizenId: "CIT-10000001",
    status: "APPROVED",
    submittedOn: "2026-10-01",
  };
  const r = await ask(json(200, JSON.stringify(body)));
  assert.deepEqual(r, {
    provider: "a",
    available: true,
    found: true,
    status: "APPROVED",
    submittedOn: "2026-10-01",
  });
});

test("an unknown citizen is not an outage", async () => {
  const r = await ask(json(404, '{"error":{"message":"No record"}}'));
  assert.equal(r.available, true);
  assert.equal(r.found, false);
});

test("a 503 from the gateway gives a clear message", async () => {
  const r = await ask(json(503, '{"error":{"message":"Service unavailable"}}'));
  assert.equal(r.available, false);
  assert.match(r.message, /unavailable right now/i);
  assert.doesNotMatch(r.message, TECHNICAL);
});

test("a slow service is given up on after the timeout", async () => {
  const started = Date.now();
  const r = await ask(() => {}, { timeoutMs: 500 }); // never answers
  assert.ok(Date.now() - started < 3000, "took too long to give up");
  assert.equal(r.available, false);
  assert.doesNotMatch(r.message, TECHNICAL);
});

test("an unreachable gateway gives a clear message", async () => {
  const r = await getStatusFrom("a", "CIT-10000001", {
    baseUrl: "http://127.0.0.1:1",
    token: "t",
  });
  assert.equal(r.available, false);
  assert.doesNotMatch(r.message, TECHNICAL);
});

test("a reply that is not JSON does not crash the service", async () => {
  const r = await ask(json(200, "<html>Bad gateway</html>"));
  assert.equal(r.available, false);
  assert.doesNotMatch(r.message, TECHNICAL);
});

test("a reply with a missing field is not trusted", async () => {
  const r = await ask(json(200, '{"citizenId":"CIT-10000001"}'));
  assert.equal(r.available, false);
});
