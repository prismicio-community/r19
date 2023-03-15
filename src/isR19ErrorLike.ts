import { ErrorLike, isErrorLike } from "./lib/isErrorLike";

export type R19ErrorLike = ErrorLike & {
	procedurePath?: string[];
	procedureArgs?: Record<string, unknown>;
};

export const isR19ErrorLike = (error: unknown): error is R19ErrorLike => {
	return (
		isErrorLike(error) &&
		error.name === "R19Error" &&
		"procedurePath" in error &&
		"procedureArgs" in error
	);
};
