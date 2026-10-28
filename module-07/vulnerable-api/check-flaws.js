// Training pack: authorised verification of the six seeded flaws.
// Run with the portal started:  node --env-file=.env check-flaws.js
const fs = require("fs");
const { spawnSync } = require("child_process");
const { Pool } = require("pg");

const BASE = process.env.BASE_URL || "http://localhost:4000";
const SERVER_FILE = process.env.SERVER_FILE || "server.js";
const OLD_SECRET = "training-secret-123";
const ONE = { citizenId: "CIT-70000001", password: "Training-Pass-One" };
const TWO = { citizenId: "CIT-70000002", password: "Training-Pass-Two" };

const pool = new Pool();

async function call(method, path, { body, rawBody, token } = {}) {
  const headers = {};
  if (body !== undefined || rawBody !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(BASE + path, {
    method,
    headers,
    body: rawBody !== undefined ? rawBody : body && JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (error) {
    // not JSON; json stays null
  }
  return { status: response.status, json, text };
}

async function login(person) {
  const r = await call("POST", "/login", { body: person });
  return r.status === 200 ? r.json.token : null;
}

async function columnsOf(table) {
  const result = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = $1",
    [table],
  );
  return result.rows.map((row) => row.column_name);
}

async function flaw1(tokenOne) {
  const q = (status) => `/records/search?status=${encodeURIComponent(status)}`;
  const attack = await call("GET", q("x' OR 1=1 --"), { token: tokenOne });
  const normal = await call("GET", q("SUBMITTED"), { token: tokenOne });
  const leaked = Array.isArray(attack.json)
    ? attack.json.some((row) => row.citizen_id !== ONE.citizenId)
    : false;
  const working = Array.isArray(normal.json) && normal.json.length === 1;
  return !leaked && working;
}

async function flaw2() {
  const columns = await columnsOf("portal_users");
  if (!columns.includes("password_hash")) return false;
  const result = await pool.query("SELECT password_hash FROM portal_users");
  const allHashed = result.rows.every((row) =>
    /^\$2[aby]\$/.test(row.password_hash),
  );
  return allHashed && (await login(ONE)) !== null;
}

function flaw3() {
  const sources = fs
    .readdirSync(".")
    .filter((f) => f.endsWith(".js") && f !== "check-flaws.js");
  const stillInSource = sources.some((f) =>
    fs.readFileSync(f, "utf8").includes(OLD_SECRET),
  );
  const ignore = fs.existsSync(".gitignore")
    ? fs.readFileSync(".gitignore", "utf8")
    : "";
  const envIgnored = ignore.split(/\r?\n/).some((line) => line.trim() === ".env");
  const run = spawnSync(process.execPath, [SERVER_FILE], {
    env: { ...process.env, JWT_SECRET: "", PORT: "4999" },
    timeout: 4000,
    encoding: "utf8",
  });
  const refusesToStart = run.status !== null && run.status !== 0;
  return !stillInSource && envIgnored && refusesToStart;
}

async function flaw4(tokenOne, tokenTwo) {
  const own = await pool.query(
    "SELECT id FROM portal_records WHERE citizen_id = $1",
    [ONE.citizenId],
  );
  const id = own.rows[0].id;
  const asOwner = await call("GET", `/records/${id}`, { token: tokenOne });
  const asOther = await call("GET", `/records/${id}`, { token: tokenTwo });
  return asOwner.status === 200 && asOther.status === 403;
}

async function flaw5() {
  const r = await call("POST", "/login", { rawBody: "{ this is not json" });
  const leaks = /node_modules|\.js:\d+|"stack"|\n\s+at\s|SyntaxError/.test(
    r.text,
  );
  return r.status === 400 && !leaks;
}

async function flaw6() {
  const columns = await columnsOf("portal_users");
  const collected =
    columns.includes("phone") || columns.includes("mother_maiden_name");
  const person = {
    citizenId: `CIT-71${String(Date.now()).slice(-6)}`,
    password: "Another-Training-Pass",
    phone: "08000000099",
    motherMaidenName: "Test Mother",
  };
  const created = await call("POST", "/register", { body: person });
  const token = await login(person);
  const me = token ? await call("GET", "/me", { token }) : { text: "" };
  const exposed = /phone|mother|password/i.test(me.text);
  return created.status === 201 && token !== null && !collected && !exposed;
}

async function main() {
  const tokenOne = await login(ONE);
  const tokenTwo = await login(TWO);
  if (!tokenOne || !tokenTwo) {
    throw new Error("Could not log in as the two training citizens");
  }
  const results = [
    ["1  SQL injection in search", await flaw1(tokenOne)],
    ["2  Plain-text passwords", await flaw2()],
    ["3  Hard-coded secret", flaw3()],
    ["4  Missing record-level authorisation", await flaw4(tokenOne, tokenTwo)],
    ["5  Leaked stack traces", await flaw5()],
    ["6  Unnecessary data collection", await flaw6()],
  ];
  for (const [name, fixed] of results) {
    console.log(`Flaw ${name.padEnd(40)} ${fixed ? "FIXED" : "STILL PRESENT"}`);
  }
  const fixedCount = results.filter(([, fixed]) => fixed).length;
  console.log(`\n${fixedCount} of 6 flaws fixed`);
  process.exitCode = fixedCount === 6 ? 0 : 1;
}

main()
  .catch((error) => {
    console.error("Could not run the verification:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
