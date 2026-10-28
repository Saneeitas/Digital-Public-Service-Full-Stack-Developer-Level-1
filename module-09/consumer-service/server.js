const express = require("express");
const { z } = require("zod");
const { pool } = require("./db");
const {
  hashPassword,
  checkPassword,
  issueToken,
  requireAuth,
  requireServiceToken,
} = require("./auth");
const { getStatusFrom } = require("./dependency");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.disable("x-powered-by");
app.use(express.json());
app.use(express.static("public"));

const recordSchema = z.object({
  citizenId: z.string().regex(/^CIT-\d{8}$/),
  status: z.enum(["SUBMITTED", "IN_REVIEW", "APPROVED", "REJECTED"]),
});

function validationError(result) {
  return {
    error: {
      message: "Invalid request body",
      fields: result.error.issues.map((i) => ({
        field: i.path.join("."),
        issue: i.message,
      })),
    },
  };
}

// Turns the id in the URL into a number the database can accept, or null.
function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 && id <= 2147483647 ? id : null;
}

// Passes errors from async routes to the error handler (works in Express 4 and 5).
const wrap = (handler) => (req, res, next) => handler(req, res, next).catch(next);

const notFound = (res) =>
  res.status(404).json({ error: { message: "Record not found" } });

// The database column citizen_id is returned to clients as citizenId.
const COLUMNS = 'id, citizen_id AS "citizenId", status';

const router = express.Router();

router.get(
  "/records",
  wrap(async (req, res) => {
    const result = await pool.query(`SELECT ${COLUMNS} FROM records ORDER BY id`);
    res.json(result.rows);
  }),
);

router.get(
  "/records/:id",
  wrap(async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return notFound(res);
    const result = await pool.query(
      `SELECT ${COLUMNS} FROM records WHERE id = $1`,
      [id],
    );
    if (result.rowCount === 0) return notFound(res);
    res.json(result.rows[0]);
  }),
);

router.post(
  "/records",
  wrap(async (req, res) => {
    const parsed = recordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(validationError(parsed));
    const { citizenId, status } = parsed.data;
    const result = await pool.query(
      `INSERT INTO records (citizen_id, status) VALUES ($1, $2)
       RETURNING ${COLUMNS}`,
      [citizenId, status],
    );
    res.status(201).json(result.rows[0]);
  }),
);

router.put(
  "/records/:id",
  wrap(async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return notFound(res);
    const parsed = recordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(validationError(parsed));
    const { citizenId, status } = parsed.data;
    const result = await pool.query(
      `UPDATE records SET citizen_id = $1, status = $2 WHERE id = $3
       RETURNING ${COLUMNS}`,
      [citizenId, status, id],
    );
    if (result.rowCount === 0) return notFound(res);
    res.json(result.rows[0]);
  }),
);

router.delete(
  "/records/:id",
  wrap(async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return notFound(res);
    const result = await pool.query("DELETE FROM records WHERE id = $1", [id]);
    if (result.rowCount === 0) return notFound(res);
    res.status(200).json({ message: "Deleted" });
  }),
);

const credentialsSchema = z.object({
  citizenId: z.string().regex(/^CIT-\d{8}$/),
  password: z.string().min(12).max(72),
});

const loginSchema = z.object({ citizenId: z.string(), password: z.string() });

router.post(
  "/auth/register",
  wrap(async (req, res) => {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(validationError(parsed));
    const { citizenId, password } = parsed.data;
    const passwordHash = await hashPassword(password);
    try {
      await pool.query(
        "INSERT INTO accounts (citizen_id, password_hash) VALUES ($1, $2)",
        [citizenId, passwordHash],
      );
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          error: { message: "An account for this citizen ID already exists" },
        });
      }
      throw error;
    }
    res.status(201).json({ citizenId });
  }),
);

router.post(
  "/auth/login",
  wrap(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(validationError(parsed));
    const { citizenId, password } = parsed.data;
    const result = await pool.query(
      "SELECT password_hash FROM accounts WHERE citizen_id = $1",
      [citizenId],
    );
    const storedHash = result.rows[0] && result.rows[0].password_hash;
    if (!(await checkPassword(password, storedHash))) {
      return res.status(401).json({
        error: { message: "Citizen ID or password is incorrect" },
      });
    }
    res.json({ token: issueToken(citizenId) });
  }),
);

router.get(
  "/me/records",
  requireAuth,
  wrap(async (req, res) => {
    const result = await pool.query(
      `SELECT ${COLUMNS} FROM records WHERE citizen_id = $1 ORDER BY id`,
      [req.user.citizenId],
    );
    res.json(result.rows);
  }),
);

router.get(
  "/me/records/:id",
  requireAuth,
  wrap(async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return notFound(res);
    const result = await pool.query(
      `SELECT ${COLUMNS} FROM records WHERE id = $1`,
      [id],
    );
    if (result.rowCount === 0) return notFound(res);
    const record = result.rows[0];
    if (record.citizenId !== req.user.citizenId) {
      return res
        .status(403)
        .json({ error: { message: "You do not have access to this record" } });
    }
    res.json(record);
  }),
);

// Called by other administrations through the gateway. Returns the least
// data they need: the status, and nothing about the citizen.
router.get(
  "/service/records/:id/status",
  requireServiceToken,
  wrap(async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return notFound(res);
    const result = await pool.query(
      "SELECT id, status FROM records WHERE id = $1",
      [id],
    );
    if (result.rowCount === 0) return notFound(res);
    res.json(result.rows[0]);
  }),
);

// Used by the deployment checks: answers 200 while the process is running.
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", release: 2 });
});

// Called by other administrations through the gateway (charter, section 2).
// Returns only the fields the charter allows: citizenId, status, submittedOn.
router.get(
  "/service/citizens/:citizenId/status",
  requireServiceToken,
  wrap(async (req, res) => {
    const { citizenId } = req.params;
    if (!/^CIT-\d{8}$/.test(citizenId)) {
      return res.status(400).json({
        error: {
          message: "Invalid citizen ID",
          fields: [
            { field: "citizenId", issue: "Must be CIT- followed by 8 digits" },
          ],
        },
      });
    }
    const result = await pool.query(
      `SELECT citizen_id AS "citizenId", status,
              to_char(submitted_on, 'YYYY-MM-DD') AS "submittedOn"
       FROM records
       WHERE citizen_id = $1
       ORDER BY id DESC
       LIMIT 1`,
      [citizenId],
    );
    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: { message: "No record for this citizen ID" } });
    }
    res.json(result.rows[0]);
  }),
);

// The services this team depends on, as letters in .env: DEPENDENCIES=a,d
const DEPENDENCIES = (process.env.DEPENDENCIES || "")
  .split(",")
  .map((letter) => letter.trim())
  .filter(Boolean);

// What the services I depend on say about me. One slow or broken service must
// not break the answer: each one reports for itself.
router.get(
  "/me/dependencies",
  requireAuth,
  wrap(async (req, res) => {
    const citizenId = req.user.citizenId;
    const dependencies = await Promise.all(
      DEPENDENCIES.map((provider) => getStatusFrom(provider, citizenId)),
    );
    res.json({ citizenId, dependencies });
  }),
);

app.use("/v1", router);

app.use((req, res) => {
  res.status(404).json({ error: { message: "Route not found" } });
});

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res
      .status(400)
      .json({ error: { message: "Request body is not valid JSON" } });
  }
  console.error(err);
  res
    .status(500)
    .json({ error: { message: "Something went wrong on the server" } });
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
