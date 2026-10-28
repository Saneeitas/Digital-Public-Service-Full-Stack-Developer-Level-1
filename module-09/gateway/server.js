// TRAINING TOOL — stand-in for the training gateway.
// Behaviour: consumer token check (401), allowed-pairs check (403),
// forwarding with the provider's own service token, 503 when a provider is
// down or too slow, and a JSON-lines call log.
//   node server.js gateway.config.json
const http = require("http");
const fs = require("fs");
const crypto = require("crypto");

const config = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const TIMEOUT = config.upstreamTimeoutMs || 3000;

function send(res, status, body, extra = {}) {
  res.writeHead(status, { "Content-Type": "application/json", ...extra });
  res.end(JSON.stringify(body));
}

function logCall(entry) {
  fs.appendFileSync(config.logFile, JSON.stringify(entry) + "\n");
}

const server = http.createServer(async (req, res) => {
  const started = Date.now();
  const callId = crypto.randomUUID().slice(0, 8);
  const headers = { "X-Gateway-Call-Id": callId };
  const match = /^\/v1\/([a-z])\/citizens\/([^/]+)\/status$/.exec(req.url.split("?")[0]);
  let consumer = "-";
  let provider = match ? match[1] : "-";

  const finish = (status, body, extra = {}) => {
    send(res, status, body, { ...headers, ...extra });
    logCall({
      time: new Date().toISOString(),
      callId,
      consumer,
      provider,
      method: req.method,
      path: req.url,
      status,
      ms: Date.now() - started,
    });
  };

  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  consumer = config.consumers[token] || "-";
  if (consumer === "-") {
    return finish(401, { error: { message: "Authentication required" } }, {
      "WWW-Authenticate": "Bearer",
    });
  }
  if (req.method !== "GET" || !match || !config.providers[provider]) {
    return finish(404, { error: { message: "Unknown service or route" } });
  }
  if (!(config.allowed[consumer] || []).includes(provider)) {
    return finish(403, { error: { message: "This team may not call that service" } });
  }

  const target = config.providers[provider];
  try {
    const upstream = await fetch(
      `${target.baseUrl}/v1/service/citizens/${match[2]}/status`,
      {
        headers: { Authorization: `Bearer ${target.serviceToken}` },
        signal: AbortSignal.timeout(TIMEOUT),
      },
    );
    const text = await upstream.text();
    if (upstream.status >= 500) throw new Error(`upstream ${upstream.status}`);
    res.writeHead(upstream.status, {
      "Content-Type": "application/json",
      ...headers,
    });
    res.end(text);
    logCall({
      time: new Date().toISOString(),
      callId,
      consumer,
      provider,
      method: req.method,
      path: req.url,
      status: upstream.status,
      ms: Date.now() - started,
    });
  } catch (error) {
    finish(503, { error: { message: "Service temporarily unavailable" } });
  }
});

server.listen(config.port, () =>
  console.log(`Training gateway on port ${config.port}`),
);
