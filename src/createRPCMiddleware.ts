import { Buffer } from "node:buffer";
import { Request, Response, NextFunction } from "express";

import { Procedures } from "./types";
import { handleRPCRequest } from "./handleRPCRequest";

export type RPCMiddleware<TProcedures extends Procedures> = {
	(req: Request, res: Response, next: NextFunction): void;
	_procedures: TProcedures;
};

export type CreateRPCMiddlewareArgs<TProcedures extends Procedures> = {
	procedures: TProcedures;
};

export const createRPCMiddleware = <TProcedures extends Procedures>(
	args: CreateRPCMiddlewareArgs<TProcedures>,
): RPCMiddleware<TProcedures> => {
	const fn: RPCMiddleware<TProcedures> = (req, res) => {
		if (req.method !== "POST") {
			res.statusCode = 405;

			res.end();

			return;
		}

		const requestBodyChunks: Buffer[] = [];

		req.on("data", (chunk) => {
			requestBodyChunks.push(chunk);
		});

		req.on("end", async () => {
			const { body, headers, statusCode } = await handleRPCRequest({
				procedures: args.procedures,
				body: Buffer.concat(requestBodyChunks),
			});

			if (statusCode) {
				res.statusCode = statusCode;
			}

			for (const headerName in headers) {
				res.setHeader(headerName, headers[headerName]);
			}

			res.end(body, "binary");
		});
	};

	fn._procedures = args.procedures;

	return fn;
};
