import { RPCMiddleware } from "./createRPCMiddleware";
import { ErrorLike } from "./lib/isErrorLike";

export type Procedures = Record<
	string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	| Procedure<any>
	| Record<
			string,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			| Procedure<any>
			| Record<
					string,
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					| Procedure<any>
					| Record<
							string,
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							| Procedure<any>
							| Record<
									string,
									// eslint-disable-next-line @typescript-eslint/no-explicit-any
									Procedure<any>
							  >
					  >
			  >
	  >
>;

export type Procedure<TArgs extends Record<string, unknown>> = (
	args: TArgs,
) => unknown | Promise<unknown>;

export type ProcedureCallServerArgs = {
	procedurePath: string[];
	procedureArgs: Record<string, unknown>;
};

export type ProcedureCallServerResponse =
	| { data?: unknown }
	| { error: unknown };

export type ExtractProcedures<
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	TRPCMiddleware extends RPCMiddleware<Procedures>,
> = TRPCMiddleware extends RPCMiddleware<infer TProcedures>
	? TProcedures
	: never;

export type OnErrorEventHandler = (
	args: {
		error: ErrorLike;
	} & ProcedureCallServerArgs,
) => Promise<void> | void;
