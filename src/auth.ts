import { AppContext } from "./types";

export async function hashPassword(password: string) {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createToken() {
	const bytes = new Uint8Array(24);
	crypto.getRandomValues(bytes);
	return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export type AuthUser = {
	id: number;
	email: string;
	name: string;
};

export async function requireUser(c: AppContext): Promise<AuthUser | null> {
	const header = c.req.header("Authorization") ?? "";
	const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
	if (!token) {
		return null;
	}

	const row = await c.env.DB.prepare(
		`SELECT users.id AS id, users.email AS email, users.name AS name
		 FROM sessions
		 JOIN users ON users.id = sessions.user_id
		 WHERE sessions.token = ?`,
	)
		.bind(token)
		.first<AuthUser>();

	return row ?? null;
}

export function unauthorized() {
	return {
		success: false as const,
		errors: [{ code: 4010, message: "Sign in required" }],
	};
}
