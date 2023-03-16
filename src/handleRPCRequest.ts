import { Buffer } from "node:buffer";
import { decode, encode } from "@msgpack/msgpack";

import { isErrorLike } from "./lib/isErrorLike";
import { isR19ErrorLike } from "./lib/isR19ErrorLike";
import { replaceLeaves } from "./lib/replaceLeaves";

import {
	Procedure,
	Procedures,
	ProcedureCallServerArgs,
	OnErrorEventHandler,
} from "./types";
import { R19Error } from "./R19Error";

const findProcedure = (
	procedures: Procedures,
	path: string[],
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Procedure<any> | undefined => {
	// Use a clone to prevent unwanted mutations.
	path = [...path];

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let proceduresPointer: Procedures | Procedure<any> = procedures;

	while (path.length > 0) {
		const pathSegment = path.shift();

		if (pathSegment) {
			proceduresPointer = proceduresPointer[pathSegment];

			if (typeof proceduresPointer === "function") {
				return proceduresPointer;
			} else if (proceduresPointer === undefined) {
				return;
			}
		}
	}
};

type HandleRPCRequestArgs<TProcedures extends Procedures> = {
	procedures: TProcedures;
	body: ArrayBuffer | Buffer | undefined;
	onError?: OnErrorEventHandler;
};

type HandleRPCRequestReturnType = {
	body: Uint8Array;
	headers: Record<string, string>;
	statusCode?: number;
};

export const handleRPCRequest = async <TProcedures extends Procedures>(
	args: HandleRPCRequestArgs<TProcedures>,
): Promise<HandleRPCRequestReturnType> => {
	if (!args.body) {
		throw new Error(
			"Invalid request body. Only requests from an r19 client are accepted.",
		);
	}

	const clientArgs = decode(Buffer.from(args.body)) as ProcedureCallServerArgs;

	const procedure = findProcedure(args.procedures, clientArgs.procedurePath);
	const headers = {
		"Content-Type": "application/msgpack",
	};

	if (!procedure) {
		const error = new R19Error(
			`Invalid procedure name: ${clientArgs.procedurePath.join(".")}`,
			{
				procedurePath: clientArgs.procedurePath,
				procedureArgs: clientArgs.procedureArgs,
			},
		);

		const body = encode(
			{
				error,
			},
			{ ignoreUndefined: true },
		);

		args.onError?.({ error, ...clientArgs });

		return {
			body,
			headers,
			statusCode: 500,
		};
	}

	let res: unknown;

	try {
		const procedureArgs = await replaceLeaves(
			clientArgs.procedureArgs,
			async (value) => {
				if (value instanceof ArrayBuffer) {
					return Buffer.from(value);
				}

				return value;
			},
		);

		res = await procedure(procedureArgs);

		res = await replaceLeaves(res, async (value) => {
			if (isErrorLike(value)) {
				return {
					name: value.name,
					message: value.message,
					stack:
						process.env.NODE_ENV === "development" ? value.stack : undefined,
				};
			}

			if (typeof value === "function") {
				throw new R19Error("r19 does not support function return values.", {
					procedurePath: clientArgs.procedurePath,
					procedureArgs: clientArgs.procedureArgs,
				});
			}

			return value;
		});
	} catch (error) {
		if (isErrorLike(error)) {
			const body = encode(
				{
					error: isR19ErrorLike(error)
						? error
						: {
								name: error.name,
								message: error.message,
								stack:
									process.env.NODE_ENV === "development"
										? error.stack
										: undefined,
						  },
				},
				{ ignoreUndefined: true },
			);

			args.onError?.({ error, ...clientArgs });

			return {
				body,
				headers,
				statusCode: 500,
			};
		}

		throw error;
	}

	try {
		const body = encode(
			{
				data: res,
			},
			{ ignoreUndefined: true },
		);

		return {
			body,
			headers,
		};
	} catch (error) {
		if (error instanceof Error) {
			const rpcError = new R19Error(
				"Unable to serialize server response. Check the server log for details.",
				{
					procedurePath: clientArgs.procedurePath,
					procedureArgs: clientArgs.procedureArgs,
					cause: error,
				},
			);

			console.error(rpcError);

			const body = encode(rpcError);

			args.onError?.({ error, ...clientArgs });

			return {
				body,
				headers,
				statusCode: 500,
			};
		}

		throw error;
	}
};
