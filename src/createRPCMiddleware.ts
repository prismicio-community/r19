import { Buffer } from "node:buffer";
import { Request, Response, NextFunction } from "express";

import { Procedures } from "./types";
import { handleRPCRequest } from "./handleRPCRequest";

type ExpressMiddleware = (
	req: Request,
	res: Response,
	next: NextFunction,
) => void;

export type RPCMiddleware<TProcedures extends Procedures> =
	ExpressMiddleware & {
		_procedures: TProcedures;
	};

export type CreateRPCMiddlewareArgs<TProcedures extends Procedures> = {
	procedures: TProcedures;
};

export const createRPCMiddleware = <TProcedures extends Procedures>(
	args: CreateRPCMiddlewareArgs<TProcedures>,
): RPCMiddleware<TProcedures> => {
	const fn: RPCMiddleware<TProcedures> = (req, res, next) => {
		if (req.method !== "POST") {
			res.statusCode = 405;

			res.end();

			next();

			return;
		}

		const requestBodyChunks: Buffer[] = [];

		req.on("data", (chunk) => {
			requestBodyChunks.push(chunk);
		});

		req.on("end", async () => {
			const requestBody = Buffer.concat(requestBodyChunks);

			const { body, headers, statusCode } = await handleRPCRequest({
				procedures: args.procedures,
				body: requestBody,
			});

			if (statusCode) {
				res.statusCode = statusCode;
			}

			for (const headerName in headers) {
				res.setHeader(headerName, headers[headerName]);
			}

			res.write(body, "binary");

			res.end(null, "binary");

			next();
		});
	};

	fn._procedures = args.procedures;

	return fn;
};
