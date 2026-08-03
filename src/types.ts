import type { RPCMiddleware } from "./createRPCMiddleware"
import type { ErrorLike } from "./lib/isErrorLike"

export type Procedures = Record<
  string,
  // oxlint-disable-next-line typescript/no-explicit-any
  | Procedure<any>
  | Record<
      string,
      // oxlint-disable-next-line typescript/no-explicit-any
      | Procedure<any>
      | Record<
          string,
          // oxlint-disable-next-line typescript/no-explicit-any
          | Procedure<any>
          | Record<
              string,
              // oxlint-disable-next-line typescript/no-explicit-any
              | Procedure<any>
              | Record<
                  string,
                  // oxlint-disable-next-line typescript/no-explicit-any
                  Procedure<any>
                >
            >
        >
    >
>

// oxlint-disable-next-line typescript/no-explicit-any
export type Procedure<TArgs extends any[]> = (...args: TArgs) => unknown | Promise<unknown>

export type ProcedureCallServerArgs = {
  procedurePath: string[]
  procedureArgs: unknown[]
}

export type ProcedureCallServerResponse = { data?: unknown } | { error: unknown }

export type ExtractProcedures<
  // oxlint-disable-next-line typescript/no-explicit-any
  TRPCMiddleware extends RPCMiddleware<Procedures>,
> = TRPCMiddleware extends RPCMiddleware<infer TProcedures> ? TProcedures : never

export type OnErrorEventHandler = (
  args: {
    error: ErrorLike
  } & ProcedureCallServerArgs,
) => Promise<void> | void
