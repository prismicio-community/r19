export type ErrorLike = {
	name: string;
	message: string;
	stack?: string;
};

export const isErrorLike = (error: unknown): error is ErrorLike => {
	return (
		typeof error === "object" &&
		error !== null &&
		"name" in error &&
		"message" in error
	);
};
