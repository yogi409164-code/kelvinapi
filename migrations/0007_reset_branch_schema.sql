DROP TABLE IF EXISTS bills;
DROP TABLE IF EXISTS tables;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS branches;
DROP TABLE IF EXISTS app_meta;

CREATE TABLE app_meta (
	key TEXT PRIMARY KEY NOT NULL,
	value TEXT NOT NULL
);

CREATE TABLE branches (
	id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	code TEXT NOT NULL UNIQUE,
	name TEXT NOT NULL
);

CREATE TABLE users (
	id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	email TEXT NOT NULL UNIQUE,
	password TEXT NOT NULL,
	name TEXT NOT NULL,
	branch_id INTEGER NOT NULL
);

CREATE TABLE sessions (
	token TEXT PRIMARY KEY NOT NULL,
	user_id INTEGER NOT NULL,
	created_at TEXT NOT NULL
);

CREATE TABLE tables (
	id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	name TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'blank',
	guests INTEGER NOT NULL DEFAULT 1,
	branch_id INTEGER NOT NULL
);

CREATE TABLE bills (
	id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	order_no INTEGER NOT NULL,
	type TEXT NOT NULL,
	table_id INTEGER,
	table_name TEXT,
	customer_phone TEXT NOT NULL DEFAULT '',
	customer_name TEXT NOT NULL DEFAULT '',
	payment TEXT NOT NULL DEFAULT 'unpaid',
	status TEXT NOT NULL DEFAULT 'saved',
	lines_json TEXT NOT NULL DEFAULT '[]',
	discount REAL NOT NULL DEFAULT 0,
	tax_rate REAL NOT NULL DEFAULT 0,
	branch_id INTEGER NOT NULL,
	created_at TEXT NOT NULL
);

INSERT INTO branches (code, name) VALUES ('vizag', 'Vizag');
INSERT INTO branches (code, name) VALUES ('vzm', 'VZM');
INSERT INTO branches (code, name) VALUES ('muduwada', 'Muduwada');

INSERT INTO users (email, password, name, branch_id)
SELECT 'biller@kelvinscale.com', 'biller123', 'biller', id FROM branches WHERE code = 'vizag';
INSERT INTO users (email, password, name, branch_id)
SELECT 'vizag@kelvinscale.com', 'vizag123', 'Vizag', id FROM branches WHERE code = 'vizag';
INSERT INTO users (email, password, name, branch_id)
SELECT 'vzm@kelvinscale.com', 'vzm12345', 'VZM', id FROM branches WHERE code = 'vzm';
INSERT INTO users (email, password, name, branch_id)
SELECT 'muduwada@kelvinscale.com', 'mudu1234', 'Muduwada', id FROM branches WHERE code = 'muduwada';

INSERT INTO app_meta (key, value) VALUES ('schema', '3');
