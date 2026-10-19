import type { AppContext } from "./types";

const DEFAULT_EMAIL = "biller@kelvinscale.com";
const DEFAULT_PASSWORD = "biller123";
const DEFAULT_NAME = "biller";
const DEFAULT_TABLE_COUNT = 10;

export async function ensureLoginSchema(db: D1Database) {
	await db
		.prepare(
			`CREATE TABLE IF NOT EXISTS users (
				id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
				email TEXT NOT NULL UNIQUE,
				password TEXT NOT NULL,
				name TEXT NOT NULL
			)`,
		)
		.run();
	await db
		.prepare(
			`CREATE TABLE IF NOT EXISTS sessions (
				token TEXT PRIMARY KEY NOT NULL,
				user_id INTEGER NOT NULL,
				created_at TEXT NOT NULL
			)`,
		)
		.run();
	await db
		.prepare(
			`CREATE TABLE IF NOT EXISTS tables (
				id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
				name TEXT NOT NULL,
				status TEXT NOT NULL DEFAULT 'blank',
				guests INTEGER NOT NULL DEFAULT 1
			)`,
		)
		.run();
	await db
		.prepare(
			`CREATE TABLE IF NOT EXISTS bills (
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
				created_at TEXT NOT NULL
			)`,
		)
		.run();
	await db
		.prepare(
			`CREATE TABLE IF NOT EXISTS branches (
				id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
				code TEXT NOT NULL UNIQUE,
				name TEXT NOT NULL
			)`,
		)
		.run();

	await addColumn(db, "users", "branch_id", "INTEGER");
	await addColumn(db, "tables", "branch_id", "INTEGER");
	await addColumn(db, "bills", "branch_id", "INTEGER");

	// Older installs used password_hash. Move that value into password when needed.
	try {
		const columns = await db.prepare("PRAGMA table_info(users)").all<{ name: string }>();
		const names = new Set((columns.results ?? []).map((column) => column.name));
		if (names.has("password_hash") && !names.has("password")) {
			await db.prepare("ALTER TABLE users RENAME COLUMN password_hash TO password").run();
		}
	} catch {
		// Ignore when the column is already renamed or PRAGMA is unavailable.
	}

	await ensureBranches(db);
}

const BRANCHES = [
	{ code: "vizag", name: "Vizag" },
	{ code: "vzm", name: "VZM" },
	{ code: "muduwada", name: "Muduwada" },
] as const;

const BRANCH_USERS = [
	{ email: "biller@kelvinscale.com", password: "biller123", name: "biller", code: "vizag" },
	{ email: "vizag@kelvinscale.com", password: "vizag123", name: "Vizag", code: "vizag" },
	{ email: "vzm@kelvinscale.com", password: "vzm12345", name: "VZM", code: "vzm" },
	{ email: "muduwada@kelvinscale.com", password: "mudu1234", name: "Muduwada", code: "muduwada" },
] as const;

async function columnNames(db: D1Database, table: string) {
	const columns = await db.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
	return new Set((columns.results ?? []).map((column) => column.name));
}

async function addColumn(db: D1Database, table: string, column: string, definition: string) {
	const names = await columnNames(db, table);
	if (!names.has(column)) {
		await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
	}
}

export async function ensureBranches(db: D1Database) {
	for (const branch of BRANCHES) {
		await db
			.prepare(
				`INSERT INTO branches (code, name)
				 SELECT ?, ?
				 WHERE NOT EXISTS (SELECT 1 FROM branches WHERE code = ?)`,
			)
			.bind(branch.code, branch.name, branch.code)
			.run();
	}

	const vizag = await db
		.prepare("SELECT id FROM branches WHERE code = 'vizag'")
		.first<{ id: number }>();
	if (!vizag) {
		return;
	}

	await db.prepare("UPDATE users SET branch_id = ? WHERE branch_id IS NULL").bind(vizag.id).run();
	await db.prepare("UPDATE tables SET branch_id = ? WHERE branch_id IS NULL").bind(vizag.id).run();
	await db.prepare("UPDATE bills SET branch_id = ? WHERE branch_id IS NULL").bind(vizag.id).run();

	for (const account of BRANCH_USERS) {
		const branch = await db
			.prepare("SELECT id FROM branches WHERE code = ?")
			.bind(account.code)
			.first<{ id: number }>();
		if (!branch) {
			continue;
		}
		const existing = await db
			.prepare("SELECT id FROM users WHERE email = ?")
			.bind(account.email)
			.first<{ id: number }>();
		if (!existing) {
			try {
				await db
					.prepare("INSERT INTO users (email, password, name, branch_id) VALUES (?, ?, ?, ?)")
					.bind(account.email, account.password, account.name, branch.id)
					.run();
			} catch {
				await db
					.prepare("UPDATE users SET password = ?, name = ?, branch_id = ? WHERE email = ?")
					.bind(account.password, account.name, branch.id, account.email)
					.run();
			}
		} else {
			await db
				.prepare("UPDATE users SET password = ?, name = ?, branch_id = ? WHERE email = ?")
				.bind(account.password, account.name, branch.id, account.email)
				.run();
		}
	}

	for (const branch of BRANCHES) {
		const row = await db
			.prepare("SELECT id FROM branches WHERE code = ?")
			.bind(branch.code)
			.first<{ id: number }>();
		if (!row) {
			continue;
		}
		const count = await db
			.prepare("SELECT COUNT(*) AS total FROM tables WHERE branch_id = ?")
			.bind(row.id)
			.first<{ total: number }>();
		if ((count?.total ?? 0) > 0) {
			continue;
		}
		for (let index = 1; index <= DEFAULT_TABLE_COUNT; index += 1) {
			await db
				.prepare("INSERT INTO tables (name, status, guests, branch_id) VALUES (?, 'blank', 1, ?)")
				.bind(`T ${index}`, row.id)
				.run();
		}
	}
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
	const tableCount = Math.max(1, Math.min(options?.tableCount ?? DEFAULT_TABLE_COUNT, 50));

	const existingUser = await db
		.prepare("SELECT id FROM users WHERE email = ?")
		.bind(email)
		.first<{ id: number }>();

	let userCreated = false;
	if (!existingUser) {
		await db
			.prepare("INSERT INTO users (email, password, name) VALUES (?, ?, ?)")
			.bind(email, password, name)
			.run();
		userCreated = true;
	} else {
		await db
			.prepare("UPDATE users SET password = ?, name = ? WHERE email = ?")
			.bind(password, name, email)
			.run();
	}

	// Only seed dining tables when the floor is empty, so deleted tables stay deleted.
	let tablesCreated = 0;
	const existingTables = await db
		.prepare("SELECT COUNT(*) AS total FROM tables")
		.first<{ total: number }>();
	if ((existingTables?.total ?? 0) === 0) {
		for (let index = 1; index <= tableCount; index += 1) {
			const tableName = `T ${index}`;
			await db
				.prepare("INSERT INTO tables (name, status, guests) VALUES (?, 'blank', 1)")
				.bind(tableName)
				.run();
			tablesCreated += 1;
		}
	}

	const users = await db.prepare("SELECT COUNT(*) AS total FROM users").first<{ total: number }>();
	const tables = await db.prepare("SELECT COUNT(*) AS total FROM tables").first<{ total: number }>();

	return {
		email,
		name,
		userCreated,
		tablesCreated,
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
