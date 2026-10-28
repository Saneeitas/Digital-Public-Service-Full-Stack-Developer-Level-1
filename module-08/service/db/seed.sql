-- Synthetic data only. Run after the tables exist.
INSERT INTO records (citizen_id, status, submitted_on) VALUES
  ('CIT-10000001', 'SUBMITTED', '2026-10-01'),
  ('CIT-10000002', 'APPROVED',  '2026-10-01'),
  ('CIT-10000003', 'IN_REVIEW', '2026-10-02'),
  ('CIT-10000004', 'REJECTED',  '2026-10-02'),
  ('CIT-10000005', 'APPROVED',  '2026-10-03'),
  ('CIT-10000006', 'SUBMITTED', '2026-10-03'),
  ('CIT-10000007', 'APPROVED',  '2026-10-04'),
  ('CIT-10000008', 'IN_REVIEW', '2026-10-05'),
  ('CIT-10000009', 'SUBMITTED', '2026-10-05'),
  ('CIT-10000010', 'REJECTED',  '2026-10-06'),
  ('CIT-10000001', 'IN_REVIEW', '2026-10-07'),
  ('CIT-10000011', 'SUBMITTED', '2026-10-08');

INSERT INTO documents (record_id, file_name) VALUES
  (1, 'application-form.pdf'),
  (1, 'id-photo.jpg'),
  (2, 'application-form.pdf'),
  (2, 'id-photo.jpg'),
  (2, 'proof-of-address.pdf'),
  (3, 'application-form.pdf'),
  (5, 'application-form.pdf'),
  (5, 'id-photo.jpg'),
  (6, 'application-form.pdf'),
  (7, 'application-form.pdf'),
  (7, 'id-photo.jpg'),
  (8, 'application-form.pdf'),
  (11, 'application-form.pdf'),
  (11, 'id-photo.jpg'),
  (11, 'proof-of-address.pdf');
