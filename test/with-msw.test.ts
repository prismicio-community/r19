import { it, beforeAll, afterEach, afterAll, expect } from "vitest";
import { rest } from "msw";
import { setupServer } from "msw/node";
import fetch, { Response } from "node-fetch";

import { handleRPCRequest } from "../src";
import { createRPCClient } from "../src/client";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/**
 * Node-fetch v3 will sometimes stall when decoding a response's body with
 * `text()`, `json()`, etc. This code assumes the first chunk has all of the
 * body's content and uses it as the response's body.
 *
 * @see For more details on the "bug", see:
 * https://github.com/node-fetch/node-fetch/tree/55a4870ae5f805d8ff9a890ea2c652c9977e048e#custom-highwatermark
 */
const patchedFetch: typeof fetch = async (input, init) => {
	const res = await fetch(input, init);

	const firstBodyChunk = await new Promise<Buffer | undefined>((resolve) => {
		if (res.body) {
			res.body.on("data", (chunk: Buffer) => {
				resolve(chunk);
			});
		} else {
			resolve(undefined);
		}
	});

	if (firstBodyChunk) {
		return new Response(firstBodyChunk, res);
	} else {
		return res;
	}
};

it("works with MSW", async () => {
	const procedures = {
		ping: (args: { input: string }) => ({ pong: args.input }),
	};

	const serverURL = "http://localhost:1234";
	const client = createRPCClient<typeof procedures>({
		serverURL,
		fetch: patchedFetch,
	});

	server.use(
		rest.post(serverURL, async (req, res, ctx) => {
			const rpcResponse = await handleRPCRequest({
				body: await req.arrayBuffer(),
				procedures,
			});

			return res(
				ctx.body(rpcResponse.body),
				ctx.set(rpcResponse.headers),
				ctx.status(rpcResponse.statusCode || 200),
			);
		}),
	);

	const res = await client.ping({ input: "foo" });

	expect(res).toStrictEqual({ pong: "foo" });
});
