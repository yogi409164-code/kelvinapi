CREATE TABLE IF NOT EXISTS branches (
	id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	code TEXT NOT NULL UNIQUE,
	name TEXT NOT NULL
);

ALTER TABLE users ADD COLUMN branch_id INTEGER;
ALTER TABLE tables ADD COLUMN branch_id INTEGER;
ALTER TABLE bills ADD COLUMN branch_id INTEGER;

INSERT INTO branches (code, name)
SELECT 'vizag', 'Vizag'
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE code = 'vizag');

INSERT INTO branches (code, name)
SELECT 'vzm', 'VZM'
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE code = 'vzm');

INSERT INTO branches (code, name)
SELECT 'muduwada', 'Muduwada'
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE code = 'muduwada');
