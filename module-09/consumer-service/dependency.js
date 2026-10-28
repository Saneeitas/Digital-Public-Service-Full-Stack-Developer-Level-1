// Asks another administration's service, through the gateway, for the status
// of a citizen. It never throws: whatever goes wrong, the caller gets an
// answer it can show to the citizen.
const NAMES = {
  a: "Registry",
  b: "Education",
  c: "Social Services",
  d: "Health",
};

const DEFAULT_TIMEOUT_MS = 4000;

function unavailable(provider) {
  const name = NAMES[provider] || provider.toUpperCase();
  return {
    provider,
    available: false,
    message:
      `The ${name} service is unavailable right now. ` +
      "Please try again later.",
  };
}

async function getStatusFrom(provider, citizenId, options = {}) {
  const {
    baseUrl = process.env.GATEWAY_URL,
    token = process.env.GATEWAY_TOKEN,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;
  try {
    const id = encodeURIComponent(citizenId);
    const url = `${baseUrl}/v1/${provider}/citizens/${id}/status`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status === 404) {
      return {
        provider,
        available: true,
        found: false,
        message: "No record was found for this citizen ID.",
      };
    }
    if (response.status !== 200) {
      console.error(`Dependency ${provider} answered ${response.status}`);
      return unavailable(provider);
    }
    const body = await response.json();
    if (typeof body.status !== "string" || typeof body.submittedOn !== "string") {
      throw new Error("the response is missing status or submittedOn");
    }
    return {
      provider,
      available: true,
      found: true,
      status: body.status,
      submittedOn: body.submittedOn,
    };
  } catch (error) {
    // The detail goes to the journal for you, never to the citizen.
    console.error(`Dependency ${provider} failed: ${error.message}`);
    return unavailable(provider);
  }
}

module.exports = { getStatusFrom };
