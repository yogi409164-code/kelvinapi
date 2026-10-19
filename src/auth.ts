import { AppContext } from "./types";

export function createToken() {
	const bytes = new Uint8Array(24);
	crypto.getRandomValues(bytes);
	return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export type AuthUser = {
	id: number;
	email: string;
	name: string;
	branchId: number | null;
	branchName: string | null;
	branchCode: string | null;
};

export async function requireUser(c: AppContext): Promise<AuthUser | null> {
	const header = c.req.header("Authorization") ?? "";
	const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
	if (!token) {
		return null;
	}

	const row = await c.env.DB.prepare(
		`SELECT users.id AS id, users.email AS email, users.name AS name,
		        users.branch_id AS branchId, branches.name AS branchName, branches.code AS branchCode
		 FROM sessions
		 JOIN users ON users.id = sessions.user_id
		 LEFT JOIN branches ON branches.id = users.branch_id
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
