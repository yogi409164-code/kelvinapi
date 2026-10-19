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
			"SELECT id, name, status, guests FROM tables WHERE id = ?",
		)
			.bind(data.params.id)
			.first<TableRow>();
		if (!current) {
			return c.json(
				{ success: false, errors: [{ code: 4040, message: "Table not found" }] },
				404,
			);
		}
		if (current.status === "running" || current.status === "printed" || current.status === "runningKot") {
			return c.json(
				{
					success: false,
					errors: [{ code: 4090, message: "Finish or move the open order before removing this table" }],
				},
				409,
			);
		}

		const count = await db.prepare("SELECT COUNT(*) AS total FROM tables").first<{ total: number }>();
		if ((count?.total ?? 0) <= 1) {
			return c.json(
				{ success: false, errors: [{ code: 4091, message: "Keep at least one table" }] },
				409,
			);
		}

		await db.prepare("DELETE FROM tables WHERE id = ?").bind(current.id).run();
		return { success: true, result: current };
	}
}
