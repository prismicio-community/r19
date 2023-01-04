import { Buffer } from "node:buffer";
import { H3Event, getHeaders, readRawBody } from "h3";
import busboy from "busboy";
import { Readable } from "node:stream";

import { ProcedureCallServerArgs } from "../types";

import { deserialize } from "./deserialize";
import { unflattenObject } from "./unflattenObject";

export const readRPCClientArgs = async (
	event: H3Event,
): Promise<ProcedureCallServerArgs | undefined> => {
	const body = await readRawBody(event, false);

	if (body) {
		const bodyStream = Readable.from(body);
		const headers = getHeaders(event);
		const bb = busboy({ headers });
		const args = {} as Record<string, unknown>;

		return new Promise<ProcedureCallServerArgs>((resolve, reject) => {
			bb.on("file", (name, file, _info) => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const chunks: any[] = [];

				file.on("data", (data) => {
					chunks.push(data);
				});

				file.on("close", () => {
					args[name as keyof typeof args] = Buffer.concat(chunks);
				});
			});

			bb.on("field", (name, value, _info) => {
				args[name as keyof typeof args] = deserialize(value);
			});

			bb.on("close", () => {
				const unflattenedArgs = unflattenObject(
					args,
				) as ProcedureCallServerArgs;

				resolve(unflattenedArgs);
			});

			bb.on("error", (error) => {
				reject(error);
			});

			bodyStream.pipe(bb);
		});
	}
};
