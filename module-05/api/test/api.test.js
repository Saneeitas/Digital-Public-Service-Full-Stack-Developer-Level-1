// Stand-in for the supplied Module 5 test suite: happy path, malformed input
// and leak checks, reported separately. It starts the server on a spare port.
const { test, before, after, describe } = require("node:test");
const assert = require("node:assert");
const { spawn } = require("node:child_process");
const path = require("node:path");

const PORT = 3900 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}/v1`;
let server;

async function call(method, route, body, rawBody) {
  const options = { method, headers: {} };
  if (body !== undefined || rawBody !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = rawBody !== undefined ? rawBody : JSON.stringify(body);
  }
  const response = await fetch(BASE + route, options);
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not JSON */
  }
  return { status: response.status, json, text };
}

before(async () => {
  server = spawn("node", ["server.js"], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, PORT: String(PORT) },
    stdio: "ignore",
  });
  for (let i = 0; i < 50; i += 1) {
    try {
      await fetch(`${BASE}/records`);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error("The server did not start");
});

after(() => server.kill());

describe("happy path", () => {
  test("GET /records lists records", async () => {
    const r = await call("GET", "/records");
    assert.strictEqual(r.status, 200);
    assert.ok(Array.isArray(r.json) && r.json.length >= 2);
  });

  test("POST creates, GET reads, PUT updates, DELETE removes", async () => {
    const body = { citizenId: "CIT-20000001", status: "SUBMITTED" };
    const created = await call("POST", "/records", body);
    assert.strictEqual(created.status, 201);
    const id = created.json.id;
    assert.strictEqual((await call("GET", `/records/${id}`)).status, 200);
    const updated = await call("PUT", `/records/${id}`, { ...body, status: "APPROVED" });
    assert.strictEqual(updated.status, 200);
    assert.strictEqual(updated.json.status, "APPROVED");
    assert.strictEqual((await call("DELETE", `/records/${id}`)).status, 200);
    assert.strictEqual((await call("GET", `/records/${id}`)).status, 404);
  });
});

describe("malformed input", () => {
  test("a bad citizenId and status are refused with field messages", async () => {
    const r = await call("POST", "/records", { citizenId: "bad", status: "NOPE" });
    assert.strictEqual(r.status, 400);
    assert.ok(Array.isArray(r.json.error.fields) && r.json.error.fields.length === 2);
  });

  test("a body that is not JSON is refused with 400", async () => {
    const r = await call("POST", "/records", undefined, "{not json");
    assert.strictEqual(r.status, 400);
    assert.strictEqual(r.json.error.message, "Request body is not valid JSON");
  });

  test("an unknown id and an unknown route return 404 in the agreed format", async () => {
    const a = await call("GET", "/records/999999");
    const b = await call("GET", "/nothing-here");
    assert.strictEqual(a.status, 404);
    assert.strictEqual(b.status, 404);
    assert.ok(a.json.error.message && b.json.error.message);
  });
});

describe("leak checks", () => {
  const LEAK = /node_modules|\.js:\d+|\bat .+\(|C:\\|\/home\//;

  test("error answers never contain a stack trace or a file path", async () => {
    const answers = [
      await call("POST", "/records", undefined, "{not json"),
      await call("GET", "/records/abc"),
      await call("GET", "/nothing-here"),
    ];
    for (const a of answers) assert.ok(!LEAK.test(a.text), a.text);
  });

  test("the server does not announce that it is Express", async () => {
    const response = await fetch(`${BASE}/records`);
    assert.strictEqual(response.headers.get("x-powered-by"), null);
  });
});
