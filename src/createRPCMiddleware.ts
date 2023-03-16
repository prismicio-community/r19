import { Buffer } from "node:buffer";
import { IncomingMessage, ServerResponse } from "node:http";

import { OnErrorEventHandler, Procedures } from "./types";
import { handleRPCRequest } from "./handleRPCRequest";

export type RPCMiddleware<TProcedures extends Procedures> = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(req: IncomingMessage, res: ServerResponse, next: (err?: Error) => any): void;
	_procedures: TProcedures;
};

export type CreateRPCMiddlewareArgs<TProcedures extends Procedures> = {
	procedures: TProcedures;
	onError?: OnErrorEventHandler;
};

export const createRPCMiddleware = <TProcedures extends Procedures>(
	args: CreateRPCMiddlewareArgs<TProcedures>,
): RPCMiddleware<TProcedures> => {
	const fn: RPCMiddleware<TProcedures> = (req, res, next) => {
		if (req.method !== "POST") {
			res.statusCode = 405;

			res.end();

			return next();
		}

		const requestBodyChunks: Buffer[] = [];

		req.on("data", (chunk) => {
			requestBodyChunks.push(chunk);
		});

		req.on("end", async () => {
			const { body, headers, statusCode } = await handleRPCRequest({
				procedures: args.procedures,
				body: Buffer.concat(requestBodyChunks),
				onError: args.onError,
			});

			if (statusCode) {
				res.statusCode = statusCode;
			}

			for (const headerName in headers) {
				res.setHeader(headerName, headers[headerName]);
			}

			res.end(Buffer.from(body), "binary");

			next();
		});
	};

	fn._procedures = args.procedures;

	return fn;
};
