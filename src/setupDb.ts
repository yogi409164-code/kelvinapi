import { hashPassword } from "./auth";
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
				password_hash TEXT NOT NULL,
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
	const passwordHash = await hashPassword(password);

	const existingUser = await db
		.prepare("SELECT id FROM users WHERE email = ?")
		.bind(email)
		.first<{ id: number }>();

	let userCreated = false;
	if (!existingUser) {
		await db
			.prepare("INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)")
			.bind(email, passwordHash, name)
			.run();
		userCreated = true;
	}

	let tablesCreated = 0;
	for (let index = 1; index <= tableCount; index += 1) {
		const tableName = `T ${index}`;
		const existing = await db
			.prepare("SELECT id FROM tables WHERE name = ?")
			.bind(tableName)
			.first<{ id: number }>();
		if (!existing) {
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
