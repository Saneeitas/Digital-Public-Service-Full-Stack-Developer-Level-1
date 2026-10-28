-- Training pack: isolated vulnerable portal. Synthetic data only.
--   psql ... -v app_account=<app-account> -f setup.sql
DROP TABLE IF EXISTS portal_records;
DROP TABLE IF EXISTS portal_users;

CREATE TABLE portal_users (
  id SERIAL PRIMARY KEY,
  citizen_id TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  phone TEXT,
  mother_maiden_name TEXT
);

CREATE TABLE portal_records (
  id SERIAL PRIMARY KEY,
  citizen_id TEXT NOT NULL,
  status TEXT NOT NULL,
  note TEXT
);

INSERT INTO portal_users (citizen_id, password, phone, mother_maiden_name) VALUES
  ('CIT-70000001', 'Training-Pass-One', '08000000001', 'Test Mother One'),
  ('CIT-70000002', 'Training-Pass-Two', '08000000002', 'Test Mother Two');

INSERT INTO portal_records (citizen_id, status, note) VALUES
  ('CIT-70000001', 'SUBMITTED', 'Synthetic note for citizen one'),
  ('CIT-70000001', 'APPROVED', 'Second synthetic note for citizen one'),
  ('CIT-70000002', 'IN_REVIEW', 'Synthetic note for citizen two');

GRANT SELECT, INSERT, UPDATE ON portal_users, portal_records TO :"app_account";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"app_account";
