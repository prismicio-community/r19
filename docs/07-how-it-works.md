# How It Works

`r19` uses the following flow to process procedures over the network.

```mermaid
flowchart TB
    subgraph client1[client]
    A["client.ping()"]-->B[Serialize arguments]
    end

    subgraph server
    C[Deserialize arguments]-->D["Call ping() with arguments"]
    D-->E[Serialize return value]
    end

    subgraph client2[client]
    F[Deserialize return value]-->G["return value (#quot;pong#quot;)"]
    end

    client1 -- "HTTP Request (multipart/msgpack)" --> server
    server -- "HTTP Response (multipart/msgpack)" --> client2
```

The server contains all of the procedures and runtime logic.

The client is mostly a wrapper around `fetch` with serialization and deserialization code.

## Serialization format

`r19` supports the following types of data:

- Any data supported by [`@msgpack/msgpack`][msgpack-javascript]
- Binary (images, audio, video, etc.)
- Nested objects

`r19` uses [MessagePack][msgpack] as its serialization format. MessagePack supports JavaScript primitives, `undefined`, `null`, objects, arrays, `Date`s, binary, and more.

## Errors

Thrown procedure errors are caught and serialized using a special `error` return value. The error is detected on the client and re-thrown.

Because `Error`s can contain arbirtary data which may not be serializable, only the following properties are preserved across the network:

- `name`
- `message`
- `stack` (only in development)

Properties like `cause` or ones stored in custom errors are ignored.

## TypeScript

`r19` relies heavily on TypeScript to provide a type safe RPC implementation. The server must be used with the client to ensure type safety.

Middleware produced by `createRPCMiddleware()` holds a type reference to its procedures.

```typescript
function createRPCMiddleware<TProcedures extends Procedures>(
	args: CreateRPCMiddlewareArgs<TProcedures>,
): RPCMiddleware<TProcedures>;
```

The type reference can be reused in its client.

```typescript
function createRPCClient<TProcedures extends Procedures>(
	args: CreateRPCClientArgs,
): RPCClient<TProcedures>;
```

With that reference, every procedure is properly typed without additional runtime validation. If a type error occurs, client builds should fail.

### Adjusting procedure types to handle network limitations

Procedure types need to be modified slightly to support binary data. `Buffer`s are used to represent binary data on the server, while `Blob`s are used on the client. Types are automatically converted in both the server and client appropriately.

### Working with arbitrarily nested types

`r19` supports nested data and procedures through liberal use of recursive types.

For example, the following type is used to transform procedure arguments:

```typescript
type TransformProcedureArgs<TArgs> = TArgs extends
	| Record<string, unknown>
	| unknown[]
	? {
			[P in keyof TArgs]: TransformProcedureArgs<TArgs[P]>;
	  }
	: TArgs extends Buffer
	? Blob
	: TArgs;
```

This type accepts arguments via the `TArgs` type parameter and transforms them based on their type:

- **Objects and arrays**: Iterate over each property or element and transform it with `TransformProcedureArgs` again
- **Buffers**: Convert to `Blob`
- Anything else is left as is.

If other transformations are needed, they can be added with new conditions.

[msgpack]: https://msgpack.org/
[msgpack-javascript]: https://github.com/msgpack/msgpack-javascript
