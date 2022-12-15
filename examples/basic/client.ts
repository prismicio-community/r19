import { createRPCClient } from "r19/client";
import type { Procedures } from "./rpc-middleware";

const client = createRPCClient<Procedures>({
	serverURL: "http://localhost:3000/rpc",
});

const pong = await client.ping();

console.info(pong);
