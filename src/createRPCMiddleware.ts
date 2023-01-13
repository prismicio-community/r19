import {
	createEvent,
	createRouter,
	defineNodeMiddleware,
	eventHandler,
	NodeMiddleware,
	readRawBody,
	send,
	setHeaders,
} from "h3";
import { Buffer } from "node:buffer";

import { Procedures } from "./types";
import { handleRPCRequest } from "./handleRPCRequest";

export type RPCMiddleware<TProcedures extends Procedures> = NodeMiddleware & {
	_procedures: TProcedures;
};

export type CreateRPCMiddlewareArgs<TProcedures extends Procedures> = {
	procedures: TProcedures;
};

export const createRPCMiddleware = <TProcedures extends Procedures>(
	args: CreateRPCMiddlewareArgs<TProcedures>,
): RPCMiddleware<TProcedures> => {
	const router = createRouter();

	router.post(
		"/",
		eventHandler(async (event): Promise<void> => {
			const eventBody = await readRawBody(event, false);

			const { body, headers, statusCode } = await handleRPCRequest({
				procedures: args.procedures,
				body: eventBody,
			});

			if (statusCode) {
				event.node.res.statusCode = statusCode;
			}

			setHeaders(event, headers);

			return send(event, Buffer.from(body));
		}),
	);

	return defineNodeMiddleware(async (req, res) => {
		const event = createEvent(req, res);

		return await router.handler(event);
	}) as RPCMiddleware<TProcedures>;
};
