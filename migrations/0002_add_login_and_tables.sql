-- Login accounts, sessions, and billing tables.
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tables (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'blank',
    guests INTEGER NOT NULL DEFAULT 1
);

INSERT INTO users (email, password_hash, name)
SELECT 'biller@kelvinscale.com', 'biller123', 'biller'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'biller@kelvinscale.com');

INSERT INTO tables (name, status, guests)
SELECT 'T 1', 'blank', 1 WHERE NOT EXISTS (SELECT 1 FROM tables WHERE name = 'T 1');
INSERT INTO tables (name, status, guests)
SELECT 'T 2', 'blank', 1 WHERE NOT EXISTS (SELECT 1 FROM tables WHERE name = 'T 2');
INSERT INTO tables (name, status, guests)
SELECT 'T 3', 'blank', 1 WHERE NOT EXISTS (SELECT 1 FROM tables WHERE name = 'T 3');
INSERT INTO tables (name, status, guests)
SELECT 'T 4', 'blank', 1 WHERE NOT EXISTS (SELECT 1 FROM tables WHERE name = 'T 4');
INSERT INTO tables (name, status, guests)
SELECT 'T 5', 'blank', 1 WHERE NOT EXISTS (SELECT 1 FROM tables WHERE name = 'T 5');
INSERT INTO tables (name, status, guests)
SELECT 'T 6', 'blank', 1 WHERE NOT EXISTS (SELECT 1 FROM tables WHERE name = 'T 6');
INSERT INTO tables (name, status, guests)
SELECT 'T 7', 'blank', 1 WHERE NOT EXISTS (SELECT 1 FROM tables WHERE name = 'T 7');
INSERT INTO tables (name, status, guests)
SELECT 'T 8', 'blank', 1 WHERE NOT EXISTS (SELECT 1 FROM tables WHERE name = 'T 8');
INSERT INTO tables (name, status, guests)
SELECT 'T 9', 'blank', 1 WHERE NOT EXISTS (SELECT 1 FROM tables WHERE name = 'T 9');
INSERT INTO tables (name, status, guests)
SELECT 'T 10', 'blank', 1 WHERE NOT EXISTS (SELECT 1 FROM tables WHERE name = 'T 10');
