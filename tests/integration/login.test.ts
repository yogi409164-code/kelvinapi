import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("Login API", () => {
	it("sets up the database and signs in", async () => {
		const setupResponse = await SELF.fetch("http://local.test/setup", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});
		const setupBody = await setupResponse.json<{
			success: boolean;
			result: { email: string; tableCount: number };
		}>();

		expect(setupResponse.status).toBe(200);
		expect(setupBody.success).toBe(true);
		expect(setupBody.result.email).toBe("biller@kelvinscale.com");
		expect(setupBody.result.tableCount).toBeGreaterThanOrEqual(10);

		const loginResponse = await SELF.fetch("http://local.test/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				email: "biller@kelvinscale.com",
				password: "biller123",
			}),
		});
		const loginBody = await loginResponse.json<{
			success: boolean;
			result: { token: string; email: string; name: string };
		}>();

		expect(loginResponse.status).toBe(200);
		expect(loginBody.success).toBe(true);
		expect(loginBody.result.email).toBe("biller@kelvinscale.com");
		expect(loginBody.result.token.length).toBeGreaterThan(10);
		expect(loginBody.result).toMatchObject({ branchName: "Vizag", branchCode: "vizag" });

		const tablesResponse = await SELF.fetch("http://local.test/tables", {
			headers: { Authorization: `Bearer ${loginBody.result.token}` },
		});
		const tablesBody = await tablesResponse.json<{
			success: boolean;
			result: { name: string }[];
		}>();

		expect(tablesResponse.status).toBe(200);
		expect(tablesBody.success).toBe(true);
		expect(tablesBody.result.some((table) => table.name === "T 1")).toBe(true);
	});

	it("shows only the signed-in branch", async () => {
		const setupResponse = await SELF.fetch("http://local.test/setup", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});
		expect(setupResponse.status).toBe(200);

		async function signIn(email: string, password: string) {
			const response = await SELF.fetch("http://local.test/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			});
			const body = await response.json<{
				success: boolean;
				result: { token: string; branchName: string };
			}>();
			expect(response.status).toBe(200);
			return body.result;
		}

		const vizag = await signIn("vizag@kelvinscale.com", "vizag123");
		const vzm = await signIn("vzm@kelvinscale.com", "vzm12345");
		expect(vizag.branchName).toBe("Vizag");
		expect(vzm.branchName).toBe("VZM");

		const createdResponse = await SELF.fetch("http://local.test/tables", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${vizag.token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ name: "Vizag Only" }),
		});
		const createdBody = await createdResponse.json<{ success: boolean; result: { id: number; name: string } }>();
		expect(createdResponse.status).toBe(201);

		const vzmTablesResponse = await SELF.fetch("http://local.test/tables", {
			headers: { Authorization: `Bearer ${vzm.token}` },
		});
		const vzmTables = await vzmTablesResponse.json<{ success: boolean; result: { id: number; name: string }[] }>();
		expect(vzmTables.result.some((table) => table.id === createdBody.result.id)).toBe(false);
		expect(vzmTables.result.some((table) => table.name === "Vizag Only")).toBe(false);
	});
});
