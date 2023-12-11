type R19ErrorOptions = {
	procedurePath?: string[];
	procedureArgs?: unknown[];
	cause?: unknown;
};

export class R19Error extends Error {
	procedurePath?: string[];
	procedureArgs?: unknown[];

	constructor(message: string, options: R19ErrorOptions = {}) {
		super();

		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, R19Error);
		}

		this.name = "R19Error";
		this.message = message;
		this.cause = options.cause;

		this.procedurePath = options.procedurePath;
		this.procedureArgs = options.procedureArgs;
	}
}
