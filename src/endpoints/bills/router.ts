import { Hono } from "hono";
import { fromHono } from "chanfana";
import { BillList } from "./billList";
import { BillCreate } from "./billCreate";
import { BillUpdate } from "./billUpdate";

export const billsRouter = fromHono(new Hono());

billsRouter.get("/", BillList);
billsRouter.post("/", BillCreate);
billsRouter.put("/:id", BillUpdate);
