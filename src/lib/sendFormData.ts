import { H3Event, sendStream, setHeaders } from "h3";
import { FormData } from "formdata-node";

import { FORM_DATA_BOUNDARY_PREFIX } from "../constants";

import { encodeFormData } from "./encodeFormData";

export const sendFormData = (
	event: H3Event,
	formData: FormData,
): Promise<void> => {
	const { headers, stream } = encodeFormData(formData, {
		boundaryPrefix: FORM_DATA_BOUNDARY_PREFIX,
	});

	setHeaders(event, headers);

	return sendStream(event, stream);
};
