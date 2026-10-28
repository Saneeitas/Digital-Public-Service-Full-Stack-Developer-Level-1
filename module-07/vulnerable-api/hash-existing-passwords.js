// One-off: replaces plain-text passwords with bcrypt hashes.
// Run once, after renaming the column:
//   node --env-file=.env hash-existing-passwords.js
const bcrypt = require("bcrypt");
const { Pool } = require("pg");

const pool = new Pool();

async function main() {
  const result = await pool.query("SELECT id, password_hash FROM portal_users");
  let changed = 0;
  for (const user of result.rows) {
    if (/^\$2[aby]\$/.test(user.password_hash)) continue; // already a hash
    const hash = await bcrypt.hash(user.password_hash, 12);
    await pool.query("UPDATE portal_users SET password_hash = $1 WHERE id = $2", [
      hash,
      user.id,
    ]);
    changed++;
  }
  console.log(
    `Hashed ${changed} password(s); ${result.rowCount - changed} already hashed.`,
  );
}

main()
  .catch((error) => {
    console.error("Could not hash the passwords:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
