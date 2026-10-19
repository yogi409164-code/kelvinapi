import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUser, unauthorized } from "../../auth";
import { primaryDb } from "../../db";
import { AppContext } from "../../types";
import { tableSchema, TableRow } from "./base";

export class TableCreate extends OpenAPIRoute {
	public schema = {
		tags: ["Tables"],
		summary: "Add a billing table",
		operationId: "createTable",
		request: {
			body: contentJson(
				z.object({
					name: z.string().min(1),
				}),
			),
		},
		responses: {
			"201": {
				description: "Created table",
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

		if (!user.branchId) {
			return c.json(
				{ success: false, errors: [{ code: 4030, message: "This login is not assigned to a branch" }] },
				403,
			);
		}

		const data = await this.getValidatedData<typeof this.schema>();
		const name = data.body.name.trim();
		const db = primaryDb(c.env.DB);
		const inserted = await db.prepare(
			"INSERT INTO tables (name, status, guests, branch_id) VALUES (?, 'blank', 1, ?)",
		)
			.bind(name, user.branchId)
			.run();
		const row = await db.prepare(
			"SELECT id, name, status, guests FROM tables WHERE id = ?",
		)
			.bind(inserted.meta.last_row_id)
			.first<TableRow>();

		return c.json({ success: true, result: row }, 201);
	}
}
