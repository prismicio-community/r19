import { expect, it } from "vitest";
import fastify from "fastify";
import middie from "@fastify/middie";
import fetch from "node-fetch";

import { createRPCMiddleware } from "../src";
import { createRPCClient } from "../src/client";

type StartRPCTestServerArgs = {
	procedures: Parameters<typeof createRPCMiddleware>[0]["procedures"];
};

const startRPCTestServer = async (args: StartRPCTestServerArgs) => {
	const app = fastify();
	await app.register(middie);

	app.use(createRPCMiddleware({ procedures: args.procedures }));

	const url = await app.listen();

	return {
		url,
		close: () => app.close(),
	};
};

it("works with fastify", async () => {
	const procedures = {
		ping: (args: { input: string }) => ({ pong: args.input }),
	};
	const server = await startRPCTestServer({ procedures });

	const client = createRPCClient<typeof procedures>({
		serverURL: server.url,
		fetch,
	});

	const res = await client.ping({ input: "foo" });

	server.close();

	expect(res).toStrictEqual({ pong: "foo" });
});
