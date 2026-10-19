import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUser, unauthorized } from "../../auth";
import { primaryDb } from "../../db";
import { AppContext } from "../../types";
import { tableSchema, TableRow } from "./base";

export class TableList extends OpenAPIRoute {
	public schema = {
		tags: ["Tables"],
		summary: "List billing tables",
		operationId: "listTables",
		responses: {
			"200": {
				description: "Billing tables",
				...contentJson({
					success: Boolean,
					result: z.array(tableSchema),
				}),
			},
			"401": {
				description: "Sign in required",
				...contentJson({
					success: Boolean,
					errors: z.array(z.object({ code: z.number(), message: z.string() })),
				}),
			},
		},
	};

	public async handle(c: AppContext) {
		const user = await requireUser(c);
		if (!user) {
			return c.json(unauthorized(), 401);
		}

		if (!user.branchId) {
			return { success: true, result: [] };
		}

		const listed = await primaryDb(c.env.DB).prepare(
			"SELECT id, name, status, guests FROM tables WHERE branch_id = ? ORDER BY id",
		)
			.bind(user.branchId)
			.all<TableRow>();

		return {
			success: true,
			result: listed.results ?? [],
		};
	}
}
