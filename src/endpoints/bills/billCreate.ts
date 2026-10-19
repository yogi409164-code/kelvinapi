import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUser, unauthorized } from "../../auth";
import { primaryDb } from "../../db";
import { AppContext } from "../../types";
import { billPayment, billSchema, billStatus, billType, cartLineSchema, BillRow, mapBill } from "./base";

export class BillCreate extends OpenAPIRoute {
	public schema = {
		tags: ["Bills"],
		summary: "Create a bill",
		operationId: "createBill",
		request: {
			body: contentJson(
				z.object({
					orderNo: z.number().int(),
					type: billType,
					tableId: z.number().int().nullable().optional(),
					tableName: z.string().nullable().optional(),
					customerPhone: z.string().default(""),
					customerName: z.string().default(""),
					payment: billPayment,
					status: billStatus,
					lines: z.array(cartLineSchema),
					discount: z.number().default(0),
					taxRate: z.number().default(0),
					createdAt: z.string().optional(),
				}),
			),
		},
		responses: {
			"201": {
				description: "Created bill",
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

		if (!user.branchId) {
			return c.json(
				{ success: false, errors: [{ code: 4030, message: "This login is not assigned to a branch" }] },
				403,
			);
		}

		const data = await this.getValidatedData<typeof this.schema>();
		const createdAt = data.body.createdAt ?? new Date().toISOString();
		const db = primaryDb(c.env.DB);
		if (data.body.tableId != null) {
			const table = await db
				.prepare("SELECT id FROM tables WHERE id = ? AND branch_id = ?")
				.bind(data.body.tableId, user.branchId)
				.first<{ id: number }>();
			if (!table) {
				return c.json(
					{ success: false, errors: [{ code: 4040, message: "Table not found for this branch" }] },
					404,
				);
			}
		}
		const inserted = await db.prepare(
			`INSERT INTO bills (
				order_no, type, table_id, table_name, customer_phone, customer_name,
				payment, status, lines_json, discount, tax_rate, created_at, branch_id
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
			.bind(
				data.body.orderNo,
				data.body.type,
				data.body.tableId ?? null,
				data.body.tableName ?? null,
				data.body.customerPhone,
				data.body.customerName,
				data.body.payment,
				data.body.status,
				JSON.stringify(data.body.lines),
				data.body.discount,
				data.body.taxRate,
				createdAt,
				user.branchId,
			)
			.run();

		const row = await db.prepare("SELECT * FROM bills WHERE id = ?")
			.bind(inserted.meta.last_row_id)
			.first<BillRow>();

		return c.json({ success: true, result: mapBill(row!) }, 201);
	}
}
