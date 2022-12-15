import { vi } from "vitest";
import { FormData, Blob } from "formdata-node";

vi.stubGlobal("FormData", FormData);
vi.stubGlobal("Blob", Blob);
