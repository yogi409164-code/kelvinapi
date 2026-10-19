import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { createToken } from "../auth";
import { ensureLoginSchema } from "../setupDb";
import { AppContext } from "../types";

export class LoginEndpoint extends OpenAPIRoute {
	public schema = {
		tags: ["Login"],
		summary: "Sign in with email and password",
		operationId: "login",
		request: {
			body: contentJson(
				z.object({
					email: z.string().email(),
					password: z.string().min(6),
				}),
			),
		},
		responses: {
			"200": {
				description: "Signed in",
				...contentJson({
					success: Boolean,
					result: z.object({
						token: z.string(),
						email: z.string(),
						name: z.string(),
						branchId: z.number().int().nullable(),
						branchName: z.string().nullable(),
						branchCode: z.string().nullable(),
					}),
				}),
			},
			"401": {
				description: "Invalid email or password",
				...contentJson({
					success: Boolean,
					errors: z.array(
						z.object({
							code: z.number(),
							message: z.string(),
						}),
					),
				}),
			},
		},
	};

	public async handle(c: AppContext) {
		await ensureLoginSchema(c.env.DB);
		const data = await this.getValidatedData<typeof this.schema>();
		const email = data.body.email.trim().toLowerCase();
		const password = data.body.password;
		const user = await c.env.DB.prepare(
			`SELECT users.id AS id, users.email AS email, users.name AS name, users.password AS password,
			        users.branch_id AS branchId, branches.name AS branchName, branches.code AS branchCode
			 FROM users
			 LEFT JOIN branches ON branches.id = users.branch_id
			 WHERE users.email = ?`,
		)
			.bind(email)
			.first<{
				id: number;
				email: string;
				name: string;
				password: string;
				branchId: number | null;
				branchName: string | null;
				branchCode: string | null;
			}>();

		if (!user || user.password !== password) {
			return c.json(
				{
					success: false,
					errors: [{ code: 4011, message: "Invalid email or password" }],
				},
				401,
			);
		}

		const token = createToken();
		await c.env.DB.prepare(
			"INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)",
		)
			.bind(token, user.id, new Date().toISOString())
			.run();

		return {
			success: true,
			result: {
				token,
				email: user.email,
				name: user.name,
				branchId: user.branchId,
				branchName: user.branchName,
				branchCode: user.branchCode,
			},
		};
	}
}
