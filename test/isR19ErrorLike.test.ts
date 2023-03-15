import { expect, it } from "vitest";

import { isR19ErrorLike } from "../src";

it("returns true if the input is shaped like an R19 error", () => {
	expect(
		isR19ErrorLike({
			name: "R19Error",
			message: "message",
			procedurePath: ["foo"],
			procedureArgs: { foo: "bar" },
		}),
	).toBe(true);
});

it("supports optional procedureArgs", () => {
	expect(
		isR19ErrorLike({
			name: "R19Error",
			message: "message",
			procedurePath: ["foo"],
		}),
	).toBe(true);
});

it("returns false if the input is not shaped like an R19 error", () => {
	// Wrong name
	expect(
		isR19ErrorLike({
			name: "Error",
			message: "message",
			procedurePath: ["foo"],
			procedureArgs: { foo: "bar" },
		}),
	).toBe(false);

	// No procedure metadata
	expect(
		isR19ErrorLike({
			name: "R19Error",
			message: "message",
		}),
	).toBe(false);

	// No message
	expect(
		isR19ErrorLike({
			name: "R19Error",
			procedurePath: ["foo"],
			procedureArgs: { foo: "bar" },
		}),
	).toBe(false);
});
