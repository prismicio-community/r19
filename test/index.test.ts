import { expect, it, vi } from "vitest";
import { Buffer } from "node:buffer";
import { AddressInfo } from "node:net";
import express from "express";
import fetch from "node-fetch";

import {
	createRPCMiddleware,
	proceduresFromInstance,
	OnErrorEventHandler,
} from "../src";
import { createRPCClient } from "../src/client";

type StartRPCTestServerArgs = {
	procedures: Parameters<typeof createRPCMiddleware>[0]["procedures"];
	onError?: OnErrorEventHandler;
};

const startRPCTestServer = (args: StartRPCTestServerArgs) => {
	const app = express();

	app.use(
		createRPCMiddleware({ procedures: args.procedures, onError: args.onError }),
	);

	const server = app.listen();

	const port = (server.address() as AddressInfo).port;

	return {
		url: `http://localhost:${port}`,
		close: () => server.close(),
	};
};

it("creates an rpc server", async () => {
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

it("supports procedures without arguments", async () => {
	const procedures = { ping: () => "pong" };
	const server = startRPCTestServer({ procedures });

	const client = createRPCClient<typeof procedures>({
		serverURL: server.url,
		fetch,
	});

	const res = await client.ping();

	server.close();

	expect(res).toStrictEqual("pong");
});

it("supports procedures without return values", async () => {
	const procedures = { ping: () => void 0 };
	const server = startRPCTestServer({ procedures });

	const client = createRPCClient<typeof procedures>({
		serverURL: server.url,
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
	const server = startRPCTestServer({ procedures });

	const client = createRPCClient<typeof procedures>({
		serverURL: server.url,
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
	const server = startRPCTestServer({ procedures });

	const client = createRPCClient<typeof procedures>({
		serverURL: server.url,
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
	const server = startRPCTestServer({ procedures });

	const client = createRPCClient<typeof procedures>({
		serverURL: server.url,
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
	const server = startRPCTestServer({ procedures });

	const client = createRPCClient<typeof procedures>({
		serverURL: server.url,
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
	const server = startRPCTestServer({ procedures });

	const client = createRPCClient<typeof procedures>({
		serverURL: server.url,
		fetch,
	});

	const res = await client.sports.ping();

	server.close();

	expect(res).toBe("pong");
});

it("does not support function arguments", async () => {
	const procedures = { ping: (args: { fn: () => void }) => args.fn() };
	const onError = vi.fn();
	const server = startRPCTestServer({ procedures, onError });

	const client = createRPCClient<typeof procedures>({
		serverURL: server.url,
		fetch,
	});

	const fnArg = () => void 0;
	await expect(async () => {
		await client.ping({ fn: fnArg });
	}).rejects.toThrow(
		expect.objectContaining({
			name: "R19Error",
			message: expect.stringMatching(/does not support function arguments/i),
			procedurePath: ["ping"],
			procedureArgs: { fn: fnArg },
		}),
	);

	server.close();

	expect(onError).not.toHaveBeenCalled();
});

it("does not support function return values", async () => {
	const procedures = { ping: () => () => void 0 };
	const onError = vi.fn();
	const server = startRPCTestServer({ procedures, onError });

	const client = createRPCClient<typeof procedures>({
		serverURL: server.url,
		fetch,
	});

	const expectedError = expect.objectContaining({
		name: "R19Error",
		message: expect.stringMatching(/does not support function return values/i),
		procedurePath: ["ping"],
		procedureArgs: undefined,
	});

	await expect(async () => {
		await client.ping();
	}).rejects.toThrow(expectedError);

	server.close();

	expect(onError).toHaveBeenCalledWith({
		error: expectedError,
		procedurePath: ["ping"],
		procedureArgs: undefined,
	});
});

it("does not support class arguments", async () => {
	class Foo {
		bar() {
			return "baz";
		}
	}

	const procedures = { ping: (args: { foo: Foo }) => args.foo.bar() };
	const onError = vi.fn();
	const server = startRPCTestServer({ procedures, onError });

	const client = createRPCClient<typeof procedures>({
		serverURL: server.url,
		fetch,
	});

	const expectedError = expect.objectContaining({
		name: "TypeError",
		message: expect.stringMatching(/args.foo.bar is not a function/i),
	});

	const fooArg = new Foo();
	await expect(async () => {
		await client.ping({ foo: fooArg });
	}).rejects.toThrow(expectedError);

	server.close();

	expect(onError).toHaveBeenCalledWith({
		error: expectedError,
		procedurePath: ["ping"],
		procedureArgs: { foo: fooArg },
	});
});

it("does not support class return values with methods", async () => {
	class Foo {
		bar() {
			return "baz";
		}
	}

	const procedures = { ping: () => new Foo() };
	const onError = vi.fn();
	const server = startRPCTestServer({ procedures, onError });

	const client = createRPCClient<typeof procedures>({
		serverURL: server.url,
		fetch,
	});

	const res = await client.ping();

	server.close();

	expect(res).toStrictEqual({});

	expect(onError).not.toHaveBeenCalled();
});

it("supports `onError` event handler", async () => {
	const procedures = {
		throw: (args: { input: string }) => {
			throw new Error(args.input);
		},
	};
	const onError = vi.fn();
	const server = startRPCTestServer({ procedures, onError });

	const client = createRPCClient<typeof procedures>({
		serverURL: server.url,
		fetch,
	});

	await expect(client.throw({ input: "foo" })).rejects.toThrow("foo");

	server.close();

	expect(onError).toHaveBeenLastCalledWith({
		error: expect.objectContaining({
			name: "Error",
			message: "foo",
		}),
		procedureArgs: {
			input: "foo",
		},
		procedurePath: ["throw"],
	});
});

it("returns 405 if POST method is not used", async () => {
	const procedures = {
		ping: (args: { input: string }) => ({ pong: args.input }),
	};
	const server = startRPCTestServer({ procedures });

	const res = await fetch(server.url, {
		method: "PUT",
		body: JSON.stringify({
			input: "foo",
		}),
	});

	server.close();

	expect(res.status).toBe(405);
});

it("throws if a non-existent procedure is called", async () => {
	const procedures = { ping: () => void 0 };
	const onError = vi.fn();
	const server = startRPCTestServer({ procedures, onError });

	const client = createRPCClient<typeof procedures>({
		serverURL: server.url,
		fetch,
	});

	const expectedError = expect.objectContaining({
		name: "R19Error",
		message: expect.stringMatching(/invalid procedure name: pong/i),
		procedurePath: ["pong"],
		procedureArgs: { input: "foo" },
	});

	await expect(async () => {
		// @ts-expect-error - We are purposely calling a non-existent procedure.
		await client.pong({ input: "foo" });
	}).rejects.toThrow(expectedError);

	server.close();

	expect(onError).toHaveBeenCalledWith({
		error: expectedError,
		procedurePath: ["pong"],
		procedureArgs: { input: "foo" },
	});
});
