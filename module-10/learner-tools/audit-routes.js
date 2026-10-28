// Day 18 - lists every route in server.js and shows which ones answer
// without any login. It only sends requests that cannot change data:
// an empty body, and an id that does not exist.
//   node audit-routes.js            (service already started)
//   BASE_URL=http://localhost:3000/v1 node audit-routes.js   (another address)
const fs = require("fs");
// Accepts the same BASE_URL as run-gates.sh (with or without /v1 at the end).
const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/v1\/?$/, "");

const source = fs.readFileSync("server.js", "utf8");
const pattern = /\b(router|app)\.(get|post|put|delete)\(\s*"(\/[^"]*)"/g;
const routes = [];
for (const [, owner, method, path] of source.matchAll(pattern)) {
  routes.push({ method: method.toUpperCase(), path: (owner === "router" ? "/v1" : "") + path });
}

const EXPECTED_OPEN = ["/health", "/v1/auth/register", "/v1/auth/login"];

(async () => {
  console.log("METHOD  ROUTE                                   ANSWER  VERDICT");
  for (const { method, path } of routes) {
    const url = BASE + path
      .replace(/:citizenId/g, "CIT-00000000")
      .replace(/:id/g, "2147483647");
    const options = { method, headers: {} };
    if (method === "POST" || method === "PUT") {
      options.headers["Content-Type"] = "application/json";
      options.body = "{}";
    }
    let status;
    try {
      status = (await fetch(url, options)).status;
    } catch {
      status = "none";
    }
    let verdict = "protected";
    if (status === "none") {
      verdict = "no answer: is the service running?";
    } else if (status !== 401 && status !== 403) {
      verdict = EXPECTED_OPEN.includes(path) ? "open, by design" : "OPEN: decide";
    }
    console.log(`${method.padEnd(7)} ${path.padEnd(39)} ${String(status).padEnd(7)} ${verdict}`);
  }
})();
