const { Pool } = require("pg");

// With no arguments, the pool reads PGHOST, PGPORT, PGDATABASE, PGUSER and
// PGPASSWORD from the environment.
const pool = new Pool({ max: 10 });

pool.on("error", (err) => {
  console.error("Unexpected database error:", err.message);
});

module.exports = { pool };
