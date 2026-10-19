import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUser, unauthorized } from "../../auth";
import { primaryDb } from "../../db";
import { AppContext } from "../../types";
import { billSchema, BillRow, mapBill } from "./base";

export class BillList extends OpenAPIRoute {
	public schema = {
		tags: ["Bills"],
		summary: "List bills",
		operationId: "listBills",
		request: {
			query: z.object({
				tableId: z.coerce.number().int().optional(),
				openOnly: z.coerce.boolean().optional(),
			}),
		},
		responses: {
			"200": {
				description: "Bills",
				...contentJson({
					success: Boolean,
					result: z.array(billSchema),
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

		const data = await this.getValidatedData<typeof this.schema>();
		let query = "SELECT * FROM bills";
		const binds: (number | string)[] = [];
		const filters: string[] = [];

		filters.push("branch_id = ?");
		binds.push(user.branchId);
		if (data.query.tableId) {
			filters.push("table_id = ?");
			binds.push(data.query.tableId);
		}
		if (data.query.openOnly) {
			filters.push("status NOT IN ('paid', 'cancelled')");
		}
		if (filters.length) {
			query += ` WHERE ${filters.join(" AND ")}`;
		}
		query += " ORDER BY id DESC";

		const listed = await primaryDb(c.env.DB).prepare(query)
			.bind(...binds)
			.all<BillRow>();

		return {
			success: true,
			result: (listed.results ?? []).map(mapBill),
		};
	}
}
