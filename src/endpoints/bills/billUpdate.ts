import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUser, unauthorized } from "../../auth";
import { primaryDb } from "../../db";
import { AppContext } from "../../types";
import { billPayment, billSchema, billStatus, billType, cartLineSchema, BillRow, mapBill } from "./base";

export class BillUpdate extends OpenAPIRoute {
	public schema = {
		tags: ["Bills"],
		summary: "Update a bill",
		operationId: "updateBill",
		request: {
			params: z.object({
				id: z.coerce.number().int(),
			}),
			body: contentJson(
				z.object({
					type: billType.optional(),
					tableId: z.number().int().nullable().optional(),
					tableName: z.string().nullable().optional(),
					customerPhone: z.string().optional(),
					customerName: z.string().optional(),
					payment: billPayment.optional(),
					status: billStatus.optional(),
					lines: z.array(cartLineSchema).optional(),
					discount: z.number().optional(),
					taxRate: z.number().optional(),
				}),
			),
		},
		responses: {
			"200": {
				description: "Updated bill",
				...contentJson({
					success: Boolean,
					result: billSchema,
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
		const current = await db.prepare("SELECT * FROM bills WHERE id = ?")
			.bind(data.params.id)
			.first<BillRow>();
		if (!current) {
			return c.json(
				{ success: false, errors: [{ code: 4040, message: "Bill not found" }] },
				404,
			);
		}

		const next = {
			type: data.body.type ?? current.type,
			table_id: data.body.tableId === undefined ? current.table_id : data.body.tableId,
			table_name: data.body.tableName === undefined ? current.table_name : data.body.tableName,
			customer_phone: data.body.customerPhone ?? current.customer_phone,
			customer_name: data.body.customerName ?? current.customer_name,
			payment: data.body.payment ?? current.payment,
			status: data.body.status ?? current.status,
			lines_json: data.body.lines ? JSON.stringify(data.body.lines) : current.lines_json,
			discount: data.body.discount ?? current.discount,
			tax_rate: data.body.taxRate ?? current.tax_rate,
		};

		await db.prepare(
			`UPDATE bills SET
				type = ?, table_id = ?, table_name = ?, customer_phone = ?, customer_name = ?,
				payment = ?, status = ?, lines_json = ?, discount = ?, tax_rate = ?
			 WHERE id = ?`,
		)
			.bind(
				next.type,
				next.table_id,
				next.table_name,
				next.customer_phone,
				next.customer_name,
				next.payment,
				next.status,
				next.lines_json,
				next.discount,
				next.tax_rate,
				current.id,
			)
			.run();

		const row = await db.prepare("SELECT * FROM bills WHERE id = ?")
			.bind(current.id)
			.first<BillRow>();

		return { success: true, result: mapBill(row!) };
	}
}
