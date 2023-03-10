import { createRPCMiddleware, ExtractProcedures } from "r19";

export const middleware = createRPCMiddleware({
	procedures: {
		async ping() {
			await new Promise((resolve) => setTimeout(resolve, 1000));

			return "pong";
		},
	},
});

// This type will be passed to the RPC client.
export type Procedures = ExtractProcedures<typeof middleware>;
