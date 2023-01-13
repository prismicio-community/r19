import { vi } from "vitest";
import { Blob } from "node:buffer";

vi.stubGlobal("Blob", Blob);
