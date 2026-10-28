-- Lab 6.2 schema. Run as the admin account. Safe to run again: it rebuilds.
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS records;

CREATE TABLE records (
  id SERIAL PRIMARY KEY,
  citizen_id TEXT NOT NULL CHECK (citizen_id ~ '^CIT-[0-9]{8}$'),
  status TEXT NOT NULL DEFAULT 'SUBMITTED'
    CHECK (status IN ('SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED')),
  submitted_on DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  record_id INTEGER NOT NULL REFERENCES records (id) ON DELETE CASCADE,
  file_name TEXT NOT NULL CHECK (file_name <> ''),
  UNIQUE (record_id, file_name)
);
