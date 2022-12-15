# Calling procedures in the client

Calling procedures requires a client library. The client serializes arguments, routes requests to the RPC server, and deserializes the server's response. It provides compile time type safety by reading your procedure's types.

```typescript
// src/client.ts

import { createRPCClient } from "r19/client";
import type { Procedures } from "./path/to/your/middleware";

const client = createRPCClient<Procedures>({
	serverURL: "https://example.com/rpc",
});

const pong = await client.ping();
```

In the above example, `client.ping()` sends a request to the RPC server at `https://example.com/rpc` and returns the procedure's return value.

The client serializes arguments and return values for you, providing a [mostly 1:1 API](./05-limitations.md) between your procedure types and the client.
