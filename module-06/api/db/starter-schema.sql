-- Lab 6.1 starter tables (synthetic data slice). Run as the admin account.
CREATE TABLE records (
  id SERIAL PRIMARY KEY,
  citizen_id TEXT,
  status TEXT,
  submitted_on DATE
);

CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  record_id INTEGER REFERENCES records (id),
  file_name TEXT
);
