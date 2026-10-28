// Lab 6.4 - stand-in for the supplied transaction gate script.
// Run with the server started and TRAINING_FAILURE_HOOK=on.
const { pool } = require("./db");

const BASE = process.env.BASE_URL || "http://localhost:3000/v1";
const ROUNDS = 20;
const DRILL_IDS = "^CIT-9[0-9]{7}$"; // citizen IDs reserved for the drill

async function counts() {
  const result = await pool.query(
    `SELECT (SELECT COUNT(*) FROM records)::int AS records,
            (SELECT COUNT(*) FROM documents)::int AS documents`,
  );
  return result.rows[0];
}

async function main() {
  await pool.query("DELETE FROM records WHERE citizen_id ~ $1", [DRILL_IDS]);
  let problems = 0;

  for (let round = 1; round <= ROUNDS; round++) {
    const failAt = Math.floor(Math.random() * 4); // 0 = no failure; 1, 2, 3 = where
    const before = await counts();
    const response = await fetch(`${BASE}/records/with-documents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Fail-At": String(failAt),
      },
      body: JSON.stringify({
        citizenId: `CIT-9${String(round).padStart(7, "0")}`,
        status: "SUBMITTED",
        documents: ["application-form.pdf", "id-photo.jpg"],
      }),
    });
    const after = await counts();

    const expected =
      failAt === 0
        ? {
            status: 201,
            records: before.records + 1,
            documents: before.documents + 2,
          }
        : { status: 500, records: before.records, documents: before.documents };
    const actual = {
      status: response.status,
      records: after.records,
      documents: after.documents,
    };
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (!ok) problems++;

    const label = failAt === 0 ? "no failure" : `failure at step ${failAt}`;
    const verdict = ok ? "PASS" : "FAIL";
    const number = String(round).padStart(2);
    console.log(`Round ${number}  ${label.padEnd(18)} ${verdict}`);
    if (!ok) {
      console.log(`    expected ${JSON.stringify(expected)}`);
      console.log(`    actual   ${JSON.stringify(actual)}`);
    }
  }

  const orphans = await pool.query(
    `SELECT r.id, r.citizen_id, COUNT(d.id)::int AS documents
       FROM records r LEFT JOIN documents d ON d.record_id = r.id
      WHERE r.citizen_id ~ $1
      GROUP BY r.id
     HAVING COUNT(d.id) <> 2`,
    [DRILL_IDS],
  );
  const duplicates = await pool.query(
    `SELECT citizen_id, COUNT(*)::int AS copies FROM records
      WHERE citizen_id ~ $1 GROUP BY citizen_id HAVING COUNT(*) > 1`,
    [DRILL_IDS],
  );
  console.log(`\nIncomplete records left behind: ${orphans.rowCount}`);
  console.log(`Duplicate records:               ${duplicates.rowCount}`);
  for (const row of orphans.rows) {
    console.log(
      `  record ${row.id} (${row.citizen_id}) has ${row.documents} document(s)`,
    );
  }

  await pool.query("DELETE FROM records WHERE citizen_id ~ $1", [DRILL_IDS]);
  const passed =
    problems === 0 && orphans.rowCount === 0 && duplicates.rowCount === 0;
  console.log(passed ? "\nGATE PASSED" : "\nGATE FAILED");
  process.exitCode = passed ? 0 : 1;
}

main()
  .catch((error) => {
    console.error("Could not run the gate:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
