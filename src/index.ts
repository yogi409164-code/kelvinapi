import { ApiException, fromHono } from "chanfana";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { LoginEndpoint } from "./endpoints/login";
import { SetupEndpoint } from "./endpoints/setup";
import { tablesRouter } from "./endpoints/tables/router";

const app = new Hono<{ Bindings: Env }>();

app.use(
	"*",
	cors({
		origin: "*",
		allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
	}),
);

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
				"Login API for Kelvin Scale. Call POST /setup once to create the database tables, then POST /login. Tables routes support the billing floor after sign-in.",
		},
	},
});

openapi.post("/setup", SetupEndpoint);
openapi.post("/login", LoginEndpoint);
openapi.route("/tables", tablesRouter);

export default app;
