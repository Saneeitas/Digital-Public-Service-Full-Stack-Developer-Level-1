#!/usr/bin/env node
// TRAINING TOOL — stand-in for the supplied reference mock.
// Stands in for ONE late provider so other teams can keep working:
//   SERVICE_TOKEN=<that team's service token> node reference-mock.js 3004
// It stores records in memory only, accepts the journey's POST /v1/records,
// answers the charter route, and says {"mock": true} on /health so the
// journey script can never count it as a delivered service.
const http = require("http");

const PORT = Number(process.argv[2]) || 3999;
const TOKEN = process.env.SERVICE_TOKEN;
if (!TOKEN) {
  console.error("Set SERVICE_TOKEN to the token the gateway holds for this provider.");
  process.exit(2);
}
const STATUSES = ["SUBMITTED", "IN_REVIEW", "APPROVED", "REJECTED"];
const records = []; // { citizenId, status, submittedOn }

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

http.createServer((req, res) => {
  const path = req.url.split("?")[0];
  if (req.method === "GET" && path === "/health") {
    return send(res, 200, { status: "ok", mock: true });
  }
  if (req.method === "POST" && path === "/v1/records") {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      let body = {};
      try {
        body = JSON.parse(raw);
      } catch {
        /* handled below */
      }
      if (!/^CIT-\d{8}$/.test(body.citizenId) || !STATUSES.includes(body.status)) {
        return send(res, 400, { error: { message: "Invalid request body" } });
      }
      const record = {
        citizenId: body.citizenId,
        status: body.status,
        submittedOn: new Date().toISOString().slice(0, 10),
      };
      records.push(record);
      send(res, 201, record);
    });
    return;
  }
  const match = /^\/v1\/service\/citizens\/([^/]+)\/status$/.exec(path);
  if (req.method === "GET" && match) {
    if (req.headers.authorization !== `Bearer ${TOKEN}`) {
      return send(res, 401, { error: { message: "Authentication required" } });
    }
    if (!/^CIT-\d{8}$/.test(match[1])) {
      return send(res, 400, { error: { message: "Invalid citizen ID" } });
    }
    const found = records.filter((r) => r.citizenId === match[1]).pop();
    if (!found) return send(res, 404, { error: { message: "No record for this citizen ID" } });
    return send(res, 200, found);
  }
  send(res, 404, { error: { message: "Not found" } });
}).listen(PORT, () => console.log(`MOCK provider on port ${PORT}`));
