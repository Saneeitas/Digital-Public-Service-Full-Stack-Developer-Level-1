-- Lab 7.1. Run as the admin account:
--   psql ... -v app_account=<app-account> -f accounts.sql
CREATE TABLE IF NOT EXISTS accounts (
  citizen_id TEXT PRIMARY KEY CHECK (citizen_id ~ '^CIT-[0-9]{8}$'),
  password_hash TEXT NOT NULL,
  created_on DATE NOT NULL DEFAULT CURRENT_DATE
);

-- The service may add and read accounts. It may not change or delete them.
GRANT SELECT, INSERT ON accounts TO :"app_account";
