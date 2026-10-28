-- Puts the tables back to the Module 5 starting data. Run as the admin account.
TRUNCATE documents, records RESTART IDENTITY;
INSERT INTO records (citizen_id, status, submitted_on) VALUES
  ('CIT-10000001', 'SUBMITTED', '2026-10-01'),
  ('CIT-10000002', 'APPROVED',  '2026-10-01');
