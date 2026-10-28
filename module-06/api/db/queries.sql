-- Question 1
SELECT * FROM records
ORDER BY submitted_on, id;

-- Question 2
SELECT id, citizen_id FROM records
WHERE status = 'APPROVED'
ORDER BY id;

-- Question 3
SELECT id, status, submitted_on FROM records
WHERE submitted_on >= '2026-10-05'
ORDER BY id;

-- Question 4
SELECT status, COUNT(*) AS total FROM records
GROUP BY status
ORDER BY status;

-- Question 5
SELECT file_name FROM documents
WHERE record_id = 2
ORDER BY file_name;

-- Question 6
SELECT r.id, r.citizen_id, d.file_name
FROM records r
INNER JOIN documents d ON d.record_id = r.id
WHERE r.id IN (1, 7)
ORDER BY r.id, d.file_name;

-- Question 7
SELECT r.id, COUNT(d.id) AS documents
FROM records r
LEFT JOIN documents d ON d.record_id = r.id
GROUP BY r.id
ORDER BY r.id;

-- Question 8
SELECT r.id, r.citizen_id, r.status
FROM records r
LEFT JOIN documents d ON d.record_id = r.id
WHERE d.id IS NULL
ORDER BY r.id;

-- Question 9
SELECT COUNT(*) AS inner_rows
FROM records r
INNER JOIN documents d ON d.record_id = r.id;

SELECT COUNT(*) AS left_rows
FROM records r
LEFT JOIN documents d ON d.record_id = r.id;

-- Question 10
SELECT citizen_id, COUNT(*) AS requests FROM records
GROUP BY citizen_id
HAVING COUNT(*) > 1;
