const isPlainObject = <Value>(
	value: unknown,
): value is Record<PropertyKey, Value> => {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	const prototype = Object.getPrototypeOf(value);

	return (
		(prototype === null ||
			prototype === Object.prototype ||
			Object.getPrototypeOf(prototype) === null) &&
		!(Symbol.toStringTag in value) &&
		!(Symbol.iterator in value)
	);
};

type Replacer = (value: unknown) => unknown | Promise<unknown>;

type ReplaceLeavesReturnValue<TInput> =
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	TInput extends any[]
		? unknown[]
		: // eslint-disable-next-line @typescript-eslint/no-explicit-any
			TInput extends Record<PropertyKey, any>
			? { [P in keyof TInput]: unknown }
			: unknown;

export const replaceLeaves = async <TInput>(
	input: TInput,
	replacer: Replacer,
): Promise<ReplaceLeavesReturnValue<TInput>> => {
	if (Array.isArray(input)) {
		const preparedProcedureArgs: unknown[] = [];

		for (let i = 0; i < input.length; i++) {
			preparedProcedureArgs[i] = await replaceLeaves(input[i], replacer);
		}

		return preparedProcedureArgs as ReplaceLeavesReturnValue<TInput>;
	}

	if (isPlainObject(input)) {
		const preparedProcedureArgs: Record<PropertyKey, unknown> = {};

		for (const key in input) {
			preparedProcedureArgs[key] = await replaceLeaves(
				input[key as keyof typeof input],
				replacer,
			);
		}

		return preparedProcedureArgs as ReplaceLeavesReturnValue<TInput>;
	}

	return (await replacer(input)) as ReplaceLeavesReturnValue<TInput>;
};
