// Helpers for consumer contract tests. They read the provider's OpenAPI file
// and call the provider through the gateway.
// Needs:  npm install --save-dev yaml ajv ajv-formats
const fs = require("fs");
const path = require("path");
const assert = require("node:assert/strict");
const YAML = require("yaml");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);

// Reads one OpenAPI file and keeps it ready for checking responses.
function loadContract(file) {
  const doc = YAML.parse(fs.readFileSync(file, "utf8"));
  const key = path.resolve(file);
  ajv.addSchema(doc, key);
  return { doc, key };
}

function pointer(doc, ref) {
  const unescape = (part) => part.replace(/~1/g, "/").replace(/~0/g, "~");
  return ref
    .slice(2)
    .split("/")
    .reduce((node, part) => node[unescape(part)], doc);
}

// Makes the local references (#/components/...) point into the right file.
function qualify(node, key) {
  if (Array.isArray(node)) return node.map((item) => qualify(item, key));
  if (node && typeof node === "object") {
    const copy = {};
    for (const [name, value] of Object.entries(node)) {
      const local = name === "$ref" && value.startsWith("#");
      copy[name] = local ? key + value : qualify(value, key);
    }
    return copy;
  }
  return node;
}

// Fails unless the body matches what the contract says the response looks like.
function assertMatchesContract(contract, route, method, status, body) {
  const operation = contract.doc.paths?.[route]?.[method];
  let response = operation?.responses?.[String(status)];
  assert.ok(
    response,
    `The contract does not describe a ${status} response for ` +
      `${method.toUpperCase()} ${route}`,
  );
  if (response.$ref) response = pointer(contract.doc, response.$ref);
  const schema = response.content?.["application/json"]?.schema;
  assert.ok(schema, `The contract has no JSON body for the ${status} response`);
  const validate = ajv.compile(qualify(schema, contract.key));
  assert.ok(
    validate(body),
    `The ${status} response does not match the contract: ` +
      ajv.errorsText(validate.errors),
  );
}

function note(line) {
  fs.mkdirSync("evidence", { recursive: true });
  fs.appendFileSync("evidence/gateway-calls.txt", line + "\n");
}

async function get(url, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const signal = AbortSignal.timeout(8000);
  const response = await fetch(url, { headers, signal });
  const text = await response.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch (error) {
    // the body was not JSON; body stays null
  }
  return { status: response.status, body, headers: response.headers };
}

// Calls a provider through the gateway, with your team's gateway token.
async function callProvider(provider, citizenId, options = {}) {
  const { token = process.env.GATEWAY_TOKEN } = options;
  if (!process.env.GATEWAY_URL || token === undefined) {
    throw new Error("GATEWAY_URL and GATEWAY_TOKEN must be set in your .env file");
  }
  const base = `${process.env.GATEWAY_URL}/v1/${provider}`;
  const result = await get(`${base}/citizens/${citizenId}/status`, token);
  const callId = result.headers.get("x-gateway-call-id") || "-";
  const when = new Date().toISOString();
  note(`${when} ${provider} ${citizenId} -> ${result.status} call ${callId}`);
  return result;
}

// For a provider team: calls your own service directly, with its own token.
async function callOwnService(citizenId, options = {}) {
  const { token = process.env.SERVICE_TOKEN } = options;
  const base = process.env.OWN_URL || "http://localhost:3000";
  return get(`${base}/v1/service/citizens/${citizenId}/status`, token);
}

module.exports = {
  loadContract,
  assertMatchesContract,
  callProvider,
  callOwnService,
};
