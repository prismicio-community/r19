import { vi } from "vitest";
import { FormData, Blob } from "node-fetch";

vi.stubGlobal("FormData", FormData);
vi.stubGlobal("Blob", Blob);
