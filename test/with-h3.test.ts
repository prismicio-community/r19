import { expect, it } from "vitest";
import { AddressInfo } from "node:net";
import { createServer } from "node:http";
import { createApp, fromNodeMiddleware, toNodeListener } from "h3";
import fetch from "node-fetch";

import { createRPCMiddleware } from "../src";
import { createRPCClient } from "../src/client";

type StartRPCTestServerArgs = {
	procedures: Parameters<typeof createRPCMiddleware>[0]["procedures"];
};

const startRPCTestServer = (args: StartRPCTestServerArgs) => {
	const app = createApp();

	app.use(
		fromNodeMiddleware(createRPCMiddleware({ procedures: args.procedures })),
	);

	const server = createServer(toNodeListener(app));

	server.listen();

	const port = (server.address() as AddressInfo).port;

	return {
		url: `http://localhost:${port}`,
		close: () => server.close(),
	};
};

it("works with h3", async () => {
	const procedures = {
		ping: (args: { input: string }) => ({ pong: args.input }),
	};
	const server = startRPCTestServer({ procedures });

	const client = createRPCClient<typeof procedures>({
		serverURL: server.url,
		fetch,
	});

	const res = await client.ping({ input: "foo" });

	server.close();

	expect(res).toStrictEqual({ pong: "foo" });
});
