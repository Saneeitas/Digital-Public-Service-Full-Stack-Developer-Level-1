// Training pack: isolated vulnerable portal. It contains six seeded flaws.
// Never run this anywhere except the isolated training environment.
const express = require("express");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const pool = new Pool();
const app = express();
app.use(express.json());

const JWT_SECRET = "training-secret-123";

function requireAuth(req, res, next) {
  const token = (req.get("Authorization") || "").replace("Bearer ", "");
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    res.status(401).json({ error: { message: "Authentication required" } });
  }
}

app.post("/register", async (req, res, next) => {
  try {
    const { citizenId, password, phone, motherMaidenName } = req.body;
    await pool.query(
      `INSERT INTO portal_users
         (citizen_id, password, phone, mother_maiden_name)
       VALUES ($1, $2, $3, $4)`,
      [citizenId, password, phone, motherMaidenName],
    );
    res.status(201).json({ citizenId });
  } catch (error) {
    next(error);
  }
});

app.post("/login", async (req, res, next) => {
  try {
    const { citizenId, password } = req.body;
    const result = await pool.query(
      "SELECT * FROM portal_users WHERE citizen_id = $1",
      [citizenId],
    );
    const user = result.rows[0];
    if (!user || user.password !== password) {
      return res
        .status(401)
        .json({ error: { message: "Citizen ID or password is incorrect" } });
    }
    const token = jwt.sign({ sub: user.citizen_id }, JWT_SECRET, {
      expiresIn: "15m",
    });
    res.json({ token });
  } catch (error) {
    next(error);
  }
});

app.get("/me", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT * FROM portal_users WHERE citizen_id = $1",
      [req.user.sub],
    );
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.get("/records/search", requireAuth, async (req, res, next) => {
  try {
    const sql =
      "SELECT id, citizen_id, status, note FROM portal_records " +
      `WHERE status = '${req.query.status}' AND citizen_id = '${req.user.sub}'`;
    const result = await pool.query(sql);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

app.get("/records/:id", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT id, citizen_id, status, note FROM portal_records WHERE id = $1",
      [req.params.id],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: { message: "Record not found" } });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message, stack: err.stack });
});

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => console.log(`Training portal on port ${PORT}`));
