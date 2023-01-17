import { expect, it, vi } from "vitest";
import { Buffer } from "node:buffer";
import { Server } from "node:http";
import { AddressInfo } from "node:net";
import express from "express";
import fetch from "node-fetch";

import { createRPCMiddleware, proceduresFromInstance } from "../src";
import { createRPCClient } from "../src/client";

const getPort = (server: Server): number => {
	return (server.address() as AddressInfo).port;
};

type CreateRPCTestServerArgs = {
	procedures: Parameters<typeof createRPCMiddleware>[0]["procedures"];
};

const createRPCTestServer = (args: CreateRPCTestServerArgs) => {
	const app = express();

	app.use(createRPCMiddleware({ procedures: args.procedures }));

	return app;
};

it("creates an rpc server", async () => {
	const procedures = {
		ping: (args: { input: string }) => ({ pong: args.input }),
	};
	const server = createRPCTestServer({ procedures }).listen();

	const client = createRPCClient<typeof procedures>({
		serverURL: `http://localhost:${getPort(server)}`,
		fetch,
	});

	const res = await client.ping({ input: "foo" });

	server.close();

	expect(res).toStrictEqual({ pong: "foo" });
});

it("supports procedures without arguments", async () => {
	const procedures = { ping: () => "pong" };
	const server = createRPCTestServer({ procedures }).listen();

	const client = createRPCClient<typeof procedures>({
		serverURL: `http://localhost:${getPort(server)}`,
		fetch,
	});

	const res = await client.ping();

	server.close();

	expect(res).toStrictEqual("pong");
});

it("supports procedures without return values", async () => {
	const procedures = { ping: () => void 0 };
	const server = createRPCTestServer({ procedures }).listen();

	const client = createRPCClient<typeof procedures>({
		serverURL: `http://localhost:${getPort(server)}`,
		fetch,
	});

	const res = await client.ping();

	server.close();

	expect(res).toBe(undefined);
});

it("supports procedures using JavaScript data structures", async () => {
	const procedures = {
		dateDiff: (args: { a: Date; b: Date }) =>
			args.b.getTime() - args.a.getTime(),
	};
	const server = createRPCTestServer({ procedures }).listen();

	const client = createRPCClient<typeof procedures>({
		serverURL: `http://localhost:${getPort(server)}`,
		fetch,
	});

	const res = await client.dateDiff({
		a: new Date("1991-03-07"),
		b: new Date("1991-03-08"),
	});

	server.close();

	expect(res).toBe(60 * 60 * 24 * 1000); // one day
});

it("supports procedures with Buffer arguments", async () => {
	const procedures = {
		ping: (args: { file: Buffer }) => args.file.toString(),
	};
	const server = createRPCTestServer({ procedures }).listen();

	const client = createRPCClient<typeof procedures>({
		serverURL: `http://localhost:${getPort(server)}`,
		fetch,
	});

	const res = await client.ping({
		file: new Blob(["pong"]),
	});

	server.close();

	expect(res).toBe("pong");
});

it("supports procedures with Buffer return values", async () => {
	const procedures = { ping: () => Buffer.from("pong") };
	const server = createRPCTestServer({ procedures }).listen();

	const client = createRPCClient<typeof procedures>({
		serverURL: `http://localhost:${getPort(server)}`,
		fetch,
	});

	const res = await client.ping();

	server.close();

	expect(await res.text()).toBe("pong");
});

it("supports procedures from class instances", async () => {
	class PingProcedures {
		private pong = "pong";

		ping() {
			return this.pong;
		}
	}
	const procedures = proceduresFromInstance(new PingProcedures());
	const server = createRPCTestServer({ procedures }).listen();

	const client = createRPCClient<typeof procedures>({
		serverURL: `http://localhost:${getPort(server)}`,
		fetch,
	});

	const res = await client.ping();

	server.close();

	expect(res).toStrictEqual("pong");
});

it("supports namespaced procedures", async () => {
	const procedures = {
		sports: {
			ping: () => "pong",
		},
	};
	const server = createRPCTestServer({ procedures }).listen();

	const client = createRPCClient<typeof procedures>({
		serverURL: `http://localhost:${getPort(server)}`,
		fetch,
	});

	const res = await client.sports.ping();

	server.close();

	expect(res).toBe("pong");
});

it("does not support function arguments", async () => {
	const procedures = { ping: (args: { fn: () => void }) => args.fn() };
	const server = createRPCTestServer({ procedures }).listen();

	const client = createRPCClient<typeof procedures>({
		serverURL: `http://localhost:${getPort(server)}`,
		fetch,
	});

	await expect(async () => {
		await client.ping({
			fn: () => void 0,
		});
	}).rejects.toThrow(/does not support function arguments/i);

	server.close();
});

it("does not support function return values", async () => {
	const procedures = { ping: () => () => void 0 };
	const server = createRPCTestServer({ procedures }).listen();

	const client = createRPCClient<typeof procedures>({
		serverURL: `http://localhost:${getPort(server)}`,
		fetch,
	});

	const consoleErrorSpy = vi
		.spyOn(globalThis.console, "error")
		.mockImplementation(() => void 0);

	await expect(async () => {
		await client.ping();
	}).rejects.toThrow(/does not support function return values/i);

	consoleErrorSpy.mockRestore();

	server.close();
});

it("does not support class arguments", async () => {
	class Foo {
		bar() {
			return "baz";
		}
	}

	const procedures = { ping: (args: { foo: Foo }) => args.foo.bar() };
	const server = createRPCTestServer({ procedures }).listen();

	const client = createRPCClient<typeof procedures>({
		serverURL: `http://localhost:${getPort(server)}`,
		fetch,
	});

	await expect(async () => {
		await client.ping({
			foo: new Foo(),
		});
	}).rejects.toThrow(/args.foo.bar is not a function/i);

	server.close();
});

it("does not support class return values with methods", async () => {
	class Foo {
		bar() {
			return "baz";
		}
	}

	const procedures = { ping: () => new Foo() };
	const server = createRPCTestServer({ procedures }).listen();

	const client = createRPCClient<typeof procedures>({
		serverURL: `http://localhost:${getPort(server)}`,
		fetch,
	});

	const res = await client.ping();

	server.close();

	expect(res).toStrictEqual({});
});

it("returns 405 if POST method is not used", async () => {
	const procedures = {
		ping: (args: { input: string }) => ({ pong: args.input }),
	};
	const server = createRPCTestServer({ procedures }).listen();

	const res = await fetch(`http://localhost:${getPort(server)}`, {
		method: "PUT",
		body: JSON.stringify({
			input: "foo",
		}),
	});

	server.close();

	expect(res.status).toBe(405);
});
