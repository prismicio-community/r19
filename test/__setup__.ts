import { vi } from "vitest";
import { Blob } from "node-fetch";

vi.stubGlobal("Blob", Blob);
