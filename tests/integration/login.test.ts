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
});
