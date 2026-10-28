// Lab 7.1 - repeatable checks for login and protected routes.
// Run with the server started:  node --env-file=.env check-auth.js
const jwt = require("jsonwebtoken");
const { pool } = require("./db");

const BASE = process.env.BASE_URL || "http://localhost:3000/v1";
const ANA = { citizenId: "CIT-90000101", password: "training-pass-one" };
const BEN = { citizenId: "CIT-90000102", password: "training-pass-two" };

let failures = 0;

async function call(method, path, { body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (error) {
    // not JSON; json stays null
  }
  return { status: response.status, json, headers: response.headers };
}

function check(name, actual, expected) {
  const passed = JSON.stringify(actual) === JSON.stringify(expected);
  if (!passed) failures++;
  console.log(`${passed ? "PASS" : "FAIL"}  ${name}`);
  if (!passed) {
    console.log(`      expected: ${JSON.stringify(expected)}`);
    console.log(`      actual:   ${JSON.stringify(actual)}`);
  }
}

async function main() {
  // Accounts. A repeat run finds them already there (409), which is fine.
  for (const person of [ANA, BEN]) {
    const r = await call("POST", "/auth/register", { body: person });
    check(
      `register ${person.citizenId} (201, or 409 on a repeat run)`,
      [201, 409].includes(r.status),
      true,
    );
  }
  let r = await call("POST", "/auth/register", {
    body: { citizenId: "CIT-90000103", password: "short" },
  });
  check("short password is refused with 400", r.status, 400);
  check(
    "the refusal does not echo the password",
    JSON.stringify(r.json).includes("short"),
    false,
  );
  r = await call("POST", "/auth/register", { body: ANA });
  check("registering the same citizen again returns 409", r.status, 409);

  // Passwords are stored as bcrypt hashes. A new account is made on every run.
  const fresh = {
    citizenId: `CIT-91${String(Date.now()).slice(-6)}`,
    password: "fresh-account-pass",
  };
  r = await call("POST", "/auth/register", { body: fresh });
  check("a new account is created with 201", r.status, 201);
  const stored = await pool.query(
    "SELECT password_hash FROM accounts WHERE citizen_id = $1",
    [fresh.citizenId],
  );
  const hash = stored.rows[0].password_hash;
  check("stored value is a bcrypt hash", /^\$2[aby]\$12\$/.test(hash), true);
  check("stored value is not the password", hash.includes(fresh.password), false);

  // Login.
  r = await call("POST", "/auth/login", { body: ANA });
  check("login with the right password returns 200", r.status, 200);
  const anaToken = r.json.token;
  r = await call("POST", "/auth/login", { body: BEN });
  const benToken = r.json.token;
  r = await call("POST", "/auth/login", {
    body: { citizenId: ANA.citizenId, password: "wrong-password-here" },
  });
  check("wrong password returns 401", r.status, 401);
  const wrongPasswordBody = r.json;
  r = await call("POST", "/auth/login", {
    body: { citizenId: "CIT-90009999", password: "wrong-password-here" },
  });
  check("unknown citizen returns 401", r.status, 401);
  check("both refusals give the same message", r.json, wrongPasswordBody);
  r = await call("POST", "/auth/login", {
    body: { citizenId: "CIT-90009999", password: "throwaway-text" },
  });
  check("unknown citizen with the dummy text still returns 401", r.status, 401);

  // Protected routes: no token, bad tokens.
  r = await call("GET", "/me/records");
  check("no token returns 401", r.status, 401);
  check(
    "401 carries WWW-Authenticate: Bearer",
    r.headers.get("www-authenticate"),
    "Bearer",
  );
  r = await call("GET", "/me/records", { token: "not.a.token" });
  check("garbage token returns 401", r.status, 401);
  const secret = process.env.JWT_SECRET;
  const expired = jwt.sign({ sub: ANA.citizenId }, secret, { expiresIn: -60 });
  r = await call("GET", "/me/records", { token: expired });
  check("expired token returns 401", r.status, 401);
  const wrongKey = jwt.sign({ sub: ANA.citizenId }, "x".repeat(40));
  r = await call("GET", "/me/records", { token: wrongKey });
  check("token signed with another key returns 401", r.status, 401);
  const unsigned = jwt.sign({ sub: ANA.citizenId }, "", { algorithm: "none" });
  r = await call("GET", "/me/records", { token: unsigned });
  check("token with no signature returns 401", r.status, 401);

  // Authorisation: each citizen sees only their own records.
  const own = await call("POST", "/records", {
    body: { citizenId: ANA.citizenId, status: "SUBMITTED" },
  });
  const anaRecordId = own.json.id;
  r = await call("GET", "/me/records", { token: anaToken });
  check("Ana's list returns 200", r.status, 200);
  check(
    "Ana's list has only Ana's records",
    r.json.every((x) => x.citizenId === ANA.citizenId),
    true,
  );
  check(
    "Ana's list includes the new record",
    r.json.some((x) => x.id === anaRecordId),
    true,
  );
  r = await call("GET", `/me/records/${anaRecordId}`, { token: anaToken });
  check("Ana can read her own record", r.status, 200);
  r = await call("GET", `/me/records/${anaRecordId}`, { token: benToken });
  check("Ben is refused Ana's record with 403", r.status, 403);
  r = await call("GET", "/me/records/99999999", { token: benToken });
  check("a record that does not exist returns 404", r.status, 404);

  await call("DELETE", `/records/${anaRecordId}`);
  console.log(
    failures === 0 ? "\nAll checks passed" : `\n${failures} check(s) failed`,
  );
  process.exitCode = failures === 0 ? 0 : 1;
}

main()
  .catch((error) => {
    console.error("Could not run the checks:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
