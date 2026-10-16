import { z } from "zod";

export const billType = z.enum(["dineIn", "delivery", "pickup"]);
export const billPayment = z.enum(["unpaid", "cash", "card", "upi"]);
export const billStatus = z.enum(["saved", "printed", "held", "paid", "cancelled"]);

export const cartLineSchema = z.object({
	itemId: z.string(),
	name: z.string(),
	price: z.number(),
	qty: z.number().int().min(1),
});

export const billSchema = z.object({
	id: z.number().int(),
	orderNo: z.number().int(),
	type: billType,
	tableId: z.number().int().nullable(),
	tableName: z.string().nullable(),
	customerPhone: z.string(),
	customerName: z.string(),
	payment: billPayment,
	status: billStatus,
	lines: z.array(cartLineSchema),
	discount: z.number(),
	taxRate: z.number(),
	createdAt: z.string(),
});

export type BillRow = {
	id: number;
	order_no: number;
	type: string;
	table_id: number | null;
	table_name: string | null;
	customer_phone: string;
	customer_name: string;
	payment: string;
	status: string;
	lines_json: string;
	discount: number;
	tax_rate: number;
	created_at: string;
};

export function mapBill(row: BillRow) {
	return {
		id: row.id,
		orderNo: row.order_no,
		type: row.type,
		tableId: row.table_id,
		tableName: row.table_name,
		customerPhone: row.customer_phone,
		customerName: row.customer_name,
		payment: row.payment,
		status: row.status,
		lines: JSON.parse(row.lines_json || "[]"),
		discount: row.discount,
		taxRate: row.tax_rate,
		createdAt: row.created_at,
	};
}
