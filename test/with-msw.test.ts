import { it, beforeAll, afterEach, afterAll, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { handleRPCRequest } from "../src";
import { createRPCClient } from "../src/client";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it("works with MSW", async () => {
	const procedures = {
		ping: (args: { input: string }) => ({ pong: args.input }),
	};

	const serverURL = "http://localhost:1234";
	const client = createRPCClient<typeof procedures>({ serverURL });

	server.use(
		http.post(serverURL, async ({ request }) => {
			const rpcResponse = await handleRPCRequest({
				body: await request.arrayBuffer(),
				procedures,
			});

			return new HttpResponse(rpcResponse.body, {
				headers: rpcResponse.headers,
				status: rpcResponse.statusCode || 200,
			});
		}),
	);

	const res = await client.ping({ input: "foo" });

	expect(res).toStrictEqual({ pong: "foo" });
});
