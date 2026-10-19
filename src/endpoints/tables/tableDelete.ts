import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUser, unauthorized } from "../../auth";
import { primaryDb } from "../../db";
import { AppContext } from "../../types";
import { tableSchema, TableRow } from "./base";

export class TableDelete extends OpenAPIRoute {
	public schema = {
		tags: ["Tables"],
		summary: "Remove a billing table",
		operationId: "deleteTable",
		request: {
			params: z.object({
				id: z.coerce.number().int(),
			}),
		},
		responses: {
			"200": {
				description: "Removed table",
				...contentJson({
					success: Boolean,
					result: tableSchema,
				}),
			},
		},
	};

	public async handle(c: AppContext) {
		const user = await requireUser(c);
		if (!user) {
			return c.json(unauthorized(), 401);
		}

		const data = await this.getValidatedData<typeof this.schema>();
		const db = primaryDb(c.env.DB);
		const current = await db.prepare(
			"SELECT id, name, status, guests FROM tables WHERE id = ? AND branch_id = ?",
		)
			.bind(data.params.id, user.branchId)
			.first<TableRow>();
		if (!current) {
			return c.json(
				{ success: false, errors: [{ code: 4040, message: "Table not found" }] },
				404,
			);
		}

		await db
			.prepare(
				`UPDATE bills
				 SET status = 'cancelled'
				 WHERE table_id = ? AND branch_id = ? AND status NOT IN ('paid', 'cancelled')`,
			)
			.bind(current.id, user.branchId)
			.run();
		await db.prepare("DELETE FROM tables WHERE id = ? AND branch_id = ?").bind(current.id, user.branchId).run();
		return { success: true, result: current };
	}
}
