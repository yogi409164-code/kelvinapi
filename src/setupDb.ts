import type { AppContext } from "./types";

const SCHEMA_VERSION = "3";
const DEFAULT_EMAIL = "biller@kelvinscale.com";
const DEFAULT_PASSWORD = "biller123";
const DEFAULT_NAME = "biller";

const BRANCHES = [
	{ code: "vizag", name: "Vizag" },
	{ code: "vzm", name: "VZM" },
	{ code: "muduwada", name: "Muduwada" },
] as const;

const USERS = [
	{ email: "biller@kelvinscale.com", password: "biller123", name: "biller", code: "vizag" },
	{ email: "vizag@kelvinscale.com", password: "vizag123", name: "Vizag", code: "vizag" },
	{ email: "vzm@kelvinscale.com", password: "vzm12345", name: "VZM", code: "vzm" },
	{ email: "muduwada@kelvinscale.com", password: "mudu1234", name: "Muduwada", code: "muduwada" },
] as const;

export async function ensureLoginSchema(db: D1Database) {
	await db
		.prepare("CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)")
		.run();
	const current = await db
		.prepare("SELECT value FROM app_meta WHERE key = 'schema'")
		.first<{ value: string }>();
	if (current?.value === SCHEMA_VERSION) {
		return;
	}

	await db.prepare("DROP TABLE IF EXISTS bills").run();
	await db.prepare("DROP TABLE IF EXISTS tables").run();
	await db.prepare("DROP TABLE IF EXISTS sessions").run();
	await db.prepare("DROP TABLE IF EXISTS users").run();
	await db.prepare("DROP TABLE IF EXISTS branches").run();

	await db
		.prepare(
			`CREATE TABLE branches (
				id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
				code TEXT NOT NULL UNIQUE,
				name TEXT NOT NULL
			)`,
		)
		.run();
	await db
		.prepare(
			`CREATE TABLE users (
				id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
				email TEXT NOT NULL UNIQUE,
				password TEXT NOT NULL,
				name TEXT NOT NULL,
				branch_id INTEGER NOT NULL
			)`,
		)
		.run();
	await db
		.prepare(
			`CREATE TABLE sessions (
				token TEXT PRIMARY KEY NOT NULL,
				user_id INTEGER NOT NULL,
				created_at TEXT NOT NULL
			)`,
		)
		.run();
	await db
		.prepare(
			`CREATE TABLE tables (
				id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
				name TEXT NOT NULL,
				status TEXT NOT NULL DEFAULT 'blank',
				guests INTEGER NOT NULL DEFAULT 1,
				branch_id INTEGER NOT NULL
			)`,
		)
		.run();
	await db
		.prepare(
			`CREATE TABLE bills (
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
			)`,
		)
		.run();

	for (const branch of BRANCHES) {
		await db.prepare("INSERT INTO branches (code, name) VALUES (?, ?)").bind(branch.code, branch.name).run();
	}
	for (const account of USERS) {
		const branch = await db
			.prepare("SELECT id FROM branches WHERE code = ?")
			.bind(account.code)
			.first<{ id: number }>();
		if (!branch) {
			continue;
		}
		await db
			.prepare("INSERT INTO users (email, password, name, branch_id) VALUES (?, ?, ?, ?)")
			.bind(account.email, account.password, account.name, branch.id)
			.run();
	}

	await db
		.prepare("INSERT INTO app_meta (key, value) VALUES ('schema', ?)")
		.bind(SCHEMA_VERSION)
		.run();
}

export async function seedLoginData(
	db: D1Database,
	options?: {
		email?: string;
		password?: string;
		name?: string;
		tableCount?: number;
	},
) {
	const email = (options?.email ?? DEFAULT_EMAIL).trim().toLowerCase();
	const password = options?.password ?? DEFAULT_PASSWORD;
	const name = options?.name ?? DEFAULT_NAME;
	const existingUser = await db
		.prepare("SELECT id FROM users WHERE email = ?")
		.bind(email)
		.first<{ id: number }>();

	let userCreated = false;
	if (!existingUser) {
		const branch = await db
			.prepare("SELECT id FROM branches WHERE code = 'vizag'")
			.first<{ id: number }>();
		if (branch) {
			await db
				.prepare("INSERT INTO users (email, password, name, branch_id) VALUES (?, ?, ?, ?)")
				.bind(email, password, name, branch.id)
				.run();
			userCreated = true;
		}
	}

	const users = await db.prepare("SELECT COUNT(*) AS total FROM users").first<{ total: number }>();
	const tables = await db.prepare("SELECT COUNT(*) AS total FROM tables").first<{ total: number }>();

	return {
		email,
		name,
		userCreated,
		tablesCreated: 0,
		userCount: users?.total ?? 0,
		tableCount: tables?.total ?? 0,
	};
}

export async function runSetup(
	c: AppContext,
	options?: {
		email?: string;
		password?: string;
		name?: string;
		tableCount?: number;
	},
) {
	await ensureLoginSchema(c.env.DB);
	return seedLoginData(c.env.DB, options);
}
