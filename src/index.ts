import { ApiException, fromHono } from "chanfana";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { billsRouter } from "./endpoints/bills/router";
import { LoginEndpoint } from "./endpoints/login";
import { SetupEndpoint } from "./endpoints/setup";
import { tablesRouter } from "./endpoints/tables/router";
import { ensureLoginSchema } from "./setupDb";

const app = new Hono<{ Bindings: Env }>();

app.use(
	"*",
	cors({
		origin: "*",
		allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
	}),
);

app.use("*", async (c, next) => {
	if (c.req.method !== "OPTIONS" && c.env.DB) {
		await ensureLoginSchema(c.env.DB);
	}
	await next();
});

app.onError((err, c) => {
	if (err instanceof ApiException) {
		return c.json(
			{ success: false, errors: err.buildResponse() },
			err.status as ContentfulStatusCode,
		);
	}

	console.error("Global error handler caught:", err);

	return c.json(
		{
			success: false,
			errors: [{ code: 7000, message: "Internal Server Error" }],
		},
		500,
	);
});

const openapi = fromHono(app, {
	docs_url: "/",
	schema: {
		info: {
			title: "Kelvin Scale Login API",
			version: "3.0.0",
			description:
				"Kelvin Scale login, tables, and bills. Call POST /setup once, then POST /login. Booked tables stay in Live View; use Add Bill there.",
		},
	},
});

openapi.post("/setup", SetupEndpoint);
openapi.post("/login", LoginEndpoint);
openapi.route("/tables", tablesRouter);
openapi.route("/bills", billsRouter);

export default app;
