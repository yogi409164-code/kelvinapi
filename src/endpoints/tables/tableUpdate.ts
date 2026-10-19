import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUser, unauthorized } from "../../auth";
import { primaryDb } from "../../db";
import { AppContext } from "../../types";
import { tableSchema, tableStatus, TableRow } from "./base";

export class TableUpdate extends OpenAPIRoute {
	public schema = {
		tags: ["Tables"],
		summary: "Update a billing table",
		operationId: "updateTable",
		request: {
			params: z.object({
				id: z.coerce.number().int(),
			}),
			body: contentJson(
				z.object({
					name: z.string().min(1).optional(),
					status: tableStatus.optional(),
					guests: z.number().int().min(1).optional(),
				}),
			),
		},
		responses: {
			"200": {
				description: "Updated table",
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

		const name = data.body.name?.trim() || current.name;
		const status = data.body.status ?? current.status;
		const guests = data.body.guests ?? current.guests;
		await db.prepare(
			"UPDATE tables SET name = ?, status = ?, guests = ? WHERE id = ? AND branch_id = ?",
		)
			.bind(name, status, guests, current.id, user.branchId)
			.run();

		return {
			success: true,
			result: { id: current.id, name, status, guests },
		};
	}
}
