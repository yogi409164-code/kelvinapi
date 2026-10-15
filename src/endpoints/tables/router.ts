import { Hono } from "hono";
import { fromHono } from "chanfana";
import { TableList } from "./tableList";
import { TableCreate } from "./tableCreate";
import { TableUpdate } from "./tableUpdate";
import { TableDelete } from "./tableDelete";

export const tablesRouter = fromHono(new Hono());

tablesRouter.get("/", TableList);
tablesRouter.post("/", TableCreate);
tablesRouter.put("/:id", TableUpdate);
tablesRouter.delete("/:id", TableDelete);
