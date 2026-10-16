import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { runSetup } from "../setupDb";
import { AppContext } from "../types";

export class SetupEndpoint extends OpenAPIRoute {
	public schema = {
		tags: ["Setup"],
		summary: "Create login tables and seed the default biller and dining tables",
		operationId: "setup",
		request: {
			body: contentJson(
				z.object({
					email: z.string().email().optional(),
					password: z.string().min(6).optional(),
					name: z.string().min(1).optional(),
					tableCount: z.number().int().min(1).max(50).optional(),
				}),
			),
		},
		responses: {
			"200": {
				description: "Database is ready for login",
				...contentJson({
					success: Boolean,
					result: z.object({
						email: z.string(),
						name: z.string(),
						userCreated: z.boolean(),
						tablesCreated: z.number(),
						userCount: z.number(),
						tableCount: z.number(),
						message: z.string(),
					}),
				}),
			},
		},
	};

	public async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();
		const result = await runSetup(c, data.body);

		return {
			success: true,
			result: {
				...result,
				message: "Login database is ready. Use /login with the biller email and password.",
			},
		};
	}
}
