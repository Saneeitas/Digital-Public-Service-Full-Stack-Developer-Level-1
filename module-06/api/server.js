const express = require("express");
const { z } = require("zod");
const { pool } = require("./db");

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
