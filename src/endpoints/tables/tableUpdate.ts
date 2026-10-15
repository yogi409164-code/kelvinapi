import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUser, unauthorized } from "../../auth";
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
		const current = await c.env.DB.prepare(
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

		const name = data.body.name?.trim() || current.name;
		const status = data.body.status ?? current.status;
		const guests = data.body.guests ?? current.guests;
		await c.env.DB.prepare(
			"UPDATE tables SET name = ?, status = ?, guests = ? WHERE id = ?",
		)
			.bind(name, status, guests, current.id)
			.run();

		return {
			success: true,
			result: { id: current.id, name, status, guests },
		};
	}
}
