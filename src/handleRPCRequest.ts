import { Readable } from "node:stream";
import { Buffer } from "node:buffer";
import busboy from "busboy";

import { deserialize } from "./lib/deserialize";
import { encodeFormData } from "./lib/encodeFormData";
import { isErrorLike } from "./lib/isErrorLike";
import { objectToFormData } from "./lib/objectToFormData.server";
import { unflattenObject } from "./lib/unflattenObject";
import { formDataToObject } from "./lib/formDataToObject.client";

import { FORM_DATA_BOUNDARY_PREFIX } from "./constants";
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

type ParseRPCClientArgs = {
	contentTypeHeader: string;
	body: string;
};

const readRPCClientArgs = async (args: ParseRPCClientArgs) => {
	const bb = busboy({
		headers: {
			"content-type": args.contentTypeHeader,
		},
	});

	const clientArgs = {} as Record<string, unknown>;

	const promise = new Promise<ProcedureCallServerArgs>((resolve, reject) => {
		bb.on("file", (name, file, _info) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const chunks: any[] = [];

			file.on("data", (data) => {
				chunks.push(data);
			});

			file.on("close", () => {
				clientArgs[name as keyof typeof clientArgs] = Buffer.concat(chunks);
			});
		});

		bb.on("field", (name, value, _info) => {
			clientArgs[name as keyof typeof clientArgs] = deserialize(value);
		});

		bb.on("close", () => {
			const unflattenedArgs = unflattenObject(
				clientArgs,
			) as ProcedureCallServerArgs;

			resolve(unflattenedArgs);
		});

		bb.on("error", (error) => {
			reject(error);
		});
	});

	Readable.from(args.body).pipe(bb);

	return promise;
};

const isPlainObject = <Value>(
	value: unknown,
): value is Record<PropertyKey, Value> => {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	const prototype = Object.getPrototypeOf(value);

	return (
		(prototype === null ||
			prototype === Object.prototype ||
			Object.getPrototypeOf(prototype) === null) &&
		!(Symbol.toStringTag in value) &&
		!(Symbol.iterator in value)
	);
};

const prepareRes = (res: unknown) => {
	if (Array.isArray(res)) {
		const preparedRes: unknown[] = [];

		for (let i = 0; i < res.length; i++) {
			preparedRes[i] = prepareRes(res[i]);
		}

		return preparedRes;
	}

	if (isPlainObject(res)) {
		const preparedRes: Record<PropertyKey, unknown> = {};

		for (const key in res) {
			preparedRes[key] = prepareRes(res[key as keyof typeof res]);
		}

		return preparedRes;
	}

	if (res instanceof Error || isErrorLike(res)) {
		return {
			name: res.name,
			message: res.message,
			stack: process.env.NODE_ENV === "development" ? res.stack : undefined,
		};
	}

	return res;
};

type HandleRPCRequestArgs<TProcedures extends Procedures> = {
	procedures: TProcedures;
} & (
	| {
			contentTypeHeader: string | null | undefined;
			body: string | undefined;
	  }
	| {
			formData: FormData;
	  }
);

type HandleRPCRequestReturnType = {
	stream: Readable;
	headers: Record<string, string>;
	statusCode?: number;
};

export const handleRPCRequest = async <TProcedures extends Procedures>(
	args: HandleRPCRequestArgs<TProcedures>,
): Promise<HandleRPCRequestReturnType> => {
	let clientArgs: ProcedureCallServerArgs;

	if ("body" in args) {
		if (!args.body) {
			throw new Error(
				"Invalid request body. Only requests from an r19 client are accepted.",
			);
		}

		if (!args.contentTypeHeader) {
			throw new Error(
				"Invalid Content-Type header. Only requests from an r19 client are accepted.",
			);
		}

		clientArgs = await readRPCClientArgs({
			contentTypeHeader: args.contentTypeHeader,
			body: args.body,
		});
	} else {
		clientArgs = formDataToObject(args.formData) as ProcedureCallServerArgs;
	}

	const procedure = findProcedure(args.procedures, clientArgs.procedurePath);

	if (!procedure) {
		const formData = objectToFormData({
			error: {
				name: "RPCError",
				message: `Invalid procedure name: ${clientArgs.procedurePath.join(
					".",
				)}`,
			},
		});

		const { headers, stream } = encodeFormData(formData, {
			boundaryPrefix: FORM_DATA_BOUNDARY_PREFIX,
		});

		return {
			stream,
			headers,
			statusCode: 500,
		};
	}

	let res: unknown;

	try {
		res = await procedure(clientArgs.procedureArgs);

		res = prepareRes(res);
	} catch (error) {
		if (isErrorLike(error)) {
			const formData = objectToFormData({
				error: {
					name: error.name,
					message: error.message,
					stack:
						process.env.NODE_ENV === "development" ? error.stack : undefined,
				},
			});

			const { headers, stream } = encodeFormData(formData, {
				boundaryPrefix: FORM_DATA_BOUNDARY_PREFIX,
			});

			return {
				stream,
				headers,
				statusCode: 500,
			};
		}

		throw error;
	}

	try {
		const formData = objectToFormData({
			data: res,
		});

		const { headers, stream } = encodeFormData(formData, {
			boundaryPrefix: FORM_DATA_BOUNDARY_PREFIX,
		});

		return {
			stream,
			headers,
		};
	} catch (error) {
		if (error instanceof Error) {
			console.error(error);

			const formData = objectToFormData({
				error: {
					name: "RPCError",
					message:
						"Unable to serialize server response. Check the server log for details.",
				},
			});

			const { headers, stream } = encodeFormData(formData, {
				boundaryPrefix: FORM_DATA_BOUNDARY_PREFIX,
			});

			return {
				stream,
				headers,
				statusCode: 500,
			};
		}

		throw error;
	}
};
