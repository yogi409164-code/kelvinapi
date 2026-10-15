import { z } from "zod";

export const tableStatus = z.enum(["blank", "running", "printed", "paid", "runningKot"]);

export const tableSchema = z.object({
	id: z.number().int(),
	name: z.string(),
	status: tableStatus,
	guests: z.number().int(),
});

export type TableRow = z.infer<typeof tableSchema>;
