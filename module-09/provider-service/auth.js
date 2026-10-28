const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error(
    "JWT_SECRET is missing or shorter than 32 characters. Not starting.",
  );
  process.exit(1);
}

const BCRYPT_ROUNDS = 12;
// A real hash of a throwaway text. Checking against it makes a login for an
// unknown citizen ID take as long as one for a known ID.
const DUMMY_HASH = bcrypt.hashSync("throwaway-text", BCRYPT_ROUNDS);

function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function checkPassword(password, storedHash) {
  const matches = await bcrypt.compare(password, storedHash || DUMMY_HASH);
  return Boolean(storedHash) && matches;
}

function issueToken(citizenId) {
  return jwt.sign({ sub: citizenId }, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "15m",
  });
}

function unauthorised(res) {
  res.set("WWW-Authenticate", "Bearer");
  res.status(401).json({ error: { message: "Authentication required" } });
}

function requireAuth(req, res, next) {
  const [scheme, token] = (req.get("Authorization") || "").split(" ");
  if (scheme !== "Bearer" || !token) return unauthorised(res);
  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string") return unauthorised(res);
    req.user = { citizenId: payload.sub };
    next();
  } catch (error) {
    unauthorised(res);
  }
}

const crypto = require("crypto");

const SERVICE_TOKEN = process.env.SERVICE_TOKEN;
if (!SERVICE_TOKEN || SERVICE_TOKEN.length < 32) {
  console.error(
    "SERVICE_TOKEN is missing or shorter than 32 characters. Not starting.",
  );
  process.exit(1);
}

// For routes called by other administrations through the gateway.
function requireServiceToken(req, res, next) {
  const [scheme, token] = (req.get("Authorization") || "").split(" ");
  if (scheme !== "Bearer" || !token) return unauthorised(res);
  const supplied = Buffer.from(token);
  const expected = Buffer.from(SERVICE_TOKEN);
  const same =
    supplied.length === expected.length &&
    crypto.timingSafeEqual(supplied, expected);
  if (!same) return unauthorised(res);
  next();
}

module.exports = {
  hashPassword,
  checkPassword,
  issueToken,
  requireAuth,
  requireServiceToken,
};
