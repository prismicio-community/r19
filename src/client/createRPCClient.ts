import { encode, decode } from "@msgpack/msgpack";

import { isErrorLike } from "../lib/isErrorLike";
import { isPlainObject } from "../lib/isPlainObject";
import { isR19ErrorLike } from "../lib/isR19ErrorLike";
import { replaceLeaves } from "../lib/replaceLeaves";

import { Procedures, Procedure, ProcedureCallServerResponse } from "../types";
import { R19Error } from "../R19Error";

const createArbitrarilyNestedFunction = <T>(
	handler: (path: string[], args: unknown[]) => unknown,
	path: string[] = [],
): T => {
	return new Proxy(() => void 0, {
		apply(_target, _this, args) {
			return handler(path, args);
		},
		get(_target, property) {
			return createArbitrarilyNestedFunction(handler, [
				...path,
				property.toString(),
			]);
		},
	}) as T;
};

// `RPCClient` is currently a clone of `TransformProcedures`, but that could
// change in the future.
export type RPCClient<TProcedures extends Procedures> =
	TransformProcedures<TProcedures>;

type TransformProcedures<TProcedures> =
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	TProcedures extends Procedures
		? { [P in keyof TProcedures]: TransformProcedures<TProcedures[P]> }
		: // eslint-disable-next-line @typescript-eslint/no-explicit-any
		TProcedures extends Procedure<any>
		? TransformProcedure<TProcedures>
		: TProcedures;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TransformProcedure<TProcedure extends Procedure<any>> = (
	...args: Parameters<TProcedure> extends []
		? []
		: [TransformProcedureArgs<Parameters<TProcedure>[0]>]
) => Promise<TransformProcedureReturnType<Awaited<ReturnType<TProcedure>>>>;

type TransformProcedureArgs<TArgs> = TArgs extends
	| Record<string, unknown>
	| unknown[]
	? {
			[P in keyof TArgs]: TransformProcedureArgs<TArgs[P]>;
	  }
	: TArgs extends Buffer
	? Blob
	: TArgs;

type TransformProcedureReturnType<TReturnType> = TReturnType extends
	| Record<string, unknown>
	| unknown[]
	? {
			[P in keyof TReturnType]: TransformProcedureReturnType<TReturnType[P]>;
	  }
	: TReturnType extends Buffer
	? Blob
	: TReturnType extends Error
	? {
			name: string;
			message: string;
	  }
	: TReturnType;

export type ResponseLike = {
	arrayBuffer: () => Promise<ArrayBuffer>;
};
export type FetchLike = (
	input: string,
	init: {
		method: "POST";
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		body: any;
		headers: Record<string, string>;
	},
) => Promise<ResponseLike>;

export type CreateRPCClientArgs = {
	serverURL: string;
	fetch?: FetchLike;
};

export const createRPCClient = <TProcedures extends Procedures>(
	args: CreateRPCClientArgs,
): RPCClient<TProcedures> => {
	const resolvedFetch: FetchLike =
		args.fetch || globalThis.fetch.bind(globalThis);

	return createArbitrarilyNestedFunction(async (procedurePath, fnArgs) => {
		const procedureArgs = fnArgs[0] as Record<string, unknown>;

		if (procedureArgs !== undefined && !isPlainObject(procedureArgs)) {
			throw new R19Error(
				"r19 only supports a single object procedure argument, but something else was provided.",
				{
					procedurePath,
					procedureArgs,
				},
			);
		}

		const preparedProcedureArgs = await replaceLeaves(
			procedureArgs,
			async (value) => {
				if (value instanceof Blob) {
					return new Uint8Array(await value.arrayBuffer());
				}

				if (typeof value === "function") {
					throw new R19Error("r19 does not support function arguments.", {
						procedurePath,
						procedureArgs,
					});
				}

				return value;
			},
		);

		const body = encode(
			{
				procedurePath: procedurePath,
				procedureArgs: preparedProcedureArgs,
			},
			{ ignoreUndefined: true },
		);

		const res = await resolvedFetch(args.serverURL, {
			method: "POST",
			body,
			headers: {
				"Content-Type": "application/msgpack",
			},
		});

		const arrayBuffer = await res.arrayBuffer();
		const resObject = decode(
			new Uint8Array(arrayBuffer),
		) as ProcedureCallServerResponse;

		if ("error" in resObject) {
			const resError = resObject.error;

			if (isR19ErrorLike(resError)) {
				const error = new R19Error(resError.message, {
					procedurePath,
					procedureArgs,
				});
				error.stack = resError.stack;

				throw error;
			} else if (isErrorLike(resError)) {
				const error = new Error(resError.message);
				error.name = resError.name;
				error.stack = resError.stack;

				throw error;
			} else {
				throw new R19Error(
					"An unexpected response was received from the RPC server.",
					{
						procedurePath,
						procedureArgs,
						cause: resObject,
					},
				);
			}
		} else {
			return replaceLeaves(resObject.data, async (value) => {
				if (value instanceof Uint8Array) {
					return new Blob([value]);
				}

				return value;
			});
		}
	});
};
