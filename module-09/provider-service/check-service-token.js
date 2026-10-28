// Lab 7.2 - checks for the routes that other administrations call.
// Run with the server started:  node --env-file=.env check-service-token.js
const BASE = process.env.BASE_URL || "http://localhost:3000/v1";
const SERVICE_TOKEN = process.env.SERVICE_TOKEN;

let failures = 0;

async function call(path, authorization) {
  const headers = {};
  if (authorization) headers.Authorization = authorization;
  const response = await fetch(BASE + path, { headers });
  let json = null;
  try {
    json = await response.json();
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
  if (!SERVICE_TOKEN) throw new Error("SERVICE_TOKEN is not set");
  const route = "/service/records/1/status";

  let r = await call(route);
  check("no Authorization header returns 401", r.status, 401);
  check(
    "401 carries WWW-Authenticate: Bearer",
    r.headers.get("www-authenticate"),
    "Bearer",
  );
  r = await call(route, "Bearer wrong-token");
  check("wrong token returns 401", r.status, 401);
  r = await call(route, `Bearer ${SERVICE_TOKEN}x`);
  check("token with a character added returns 401", r.status, 401);
  r = await call(route, `Basic ${SERVICE_TOKEN}`);
  check("right token with the wrong scheme returns 401", r.status, 401);
  r = await call(route, SERVICE_TOKEN);
  check("right token with no scheme returns 401", r.status, 401);

  r = await call(route, `Bearer ${SERVICE_TOKEN}`);
  check("right token returns 200", r.status, 200);
  check("the reply holds only id and status", Object.keys(r.json).sort(), [
    "id",
    "status",
  ]);
  r = await call("/service/records/99999999/status", `Bearer ${SERVICE_TOKEN}`);
  check("an unknown record returns 404", r.status, 404);
  r = await call("/service/records/abc/status", `Bearer ${SERVICE_TOKEN}`);
  check("a bad id returns 404", r.status, 404);

  r = await call("/me/records", `Bearer ${SERVICE_TOKEN}`);
  check("the service token does not open citizen routes", r.status, 401);

  console.log(
    failures === 0 ? "\nAll checks passed" : `\n${failures} check(s) failed`,
  );
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error("Could not run the checks:", error.message);
  process.exitCode = 1;
});
