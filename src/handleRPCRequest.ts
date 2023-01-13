import { Buffer } from "node:buffer";
import { decode, encode } from "@msgpack/msgpack";

import { isErrorLike } from "./lib/isErrorLike";
import { replaceLeaves } from "./lib/replaceLeaves";

import { Procedure, Procedures, ProcedureCallServerArgs } from "./types";

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
		const body = encode({
			error: {
				name: "RPCError",
				message: `Invalid procedure name: ${clientArgs.procedurePath.join(
					".",
				)}`,
			},
		});

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
				throw new Error("r19 does not support function return values.");
			}

			return value;
		});
	} catch (error) {
		if (isErrorLike(error)) {
			const body = encode(
				{
					error: {
						name: error.name,
						message: error.message,
						stack:
							process.env.NODE_ENV === "development" ? error.stack : undefined,
					},
				},
				{ ignoreUndefined: true },
			);

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
			console.error(error);

			const body = encode({
				error: {
					name: "RPCError",
					message:
						"Unable to serialize server response. Check the server log for details.",
				},
			});

			return {
				body,
				headers,
				statusCode: 500,
			};
		}

		throw error;
	}
};
