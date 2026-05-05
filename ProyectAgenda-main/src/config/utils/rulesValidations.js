const { errorResponse } = require("../interfaces/errors.interface");

function isValidDateTime(value) {
    const date = new Date(value);
    return !Number.isNaN(date.getTime());
}

function isValidUrl(value) {
    try {
        const parsedUrl = new URL(value);
        return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
    } catch (error) {
        return false;
    }
}

function parseDateTime(value) {
    return new Date(value);
}

exports.validateFields = (body, fields, res) => {
    const errors = [];

    fields.forEach((field) => {
        const value = body[field.field];
        const hasDateTimeValidation = field.validations.some((v) => v.type === "datetime");
        const isRequired = field.validations.some((v) => v.type === "required");

        if (isRequired && (value === undefined || value === null || value === "")) {
            errors.push({
                field: field.field,
                message: field.validations.find((v) => v.type === "required").message,
            });
            return;
        }

        if (!isRequired && (value === undefined || value === null || value === "")) {
            return;
        }

        field.validations.forEach((validation) => {
            switch (validation.type) {
                case "min":
                    if (hasDateTimeValidation && isValidDateTime(value) && isValidDateTime(validation.value)) {
                        const minDate = validation.value instanceof Date ? validation.value : new Date(validation.value);
                        if (new Date(value) < minDate) {
                            errors.push({ field: field.field, message: validation.message });
                        }
                    } else if (typeof value === "string" && value.length < validation.value) {
                        errors.push({ field: field.field, message: validation.message });
                    } else if (typeof value === "number" && value < validation.value) {
                        errors.push({ field: field.field, message: validation.message });
                    }
                    break;

                case "max":
                    if (hasDateTimeValidation && isValidDateTime(value) && isValidDateTime(validation.value)) {
                        const maxDate = validation.value instanceof Date ? validation.value : new Date(validation.value);
                        if (new Date(value) > maxDate) {
                            errors.push({ field: field.field, message: validation.message });
                        }
                    } else if (typeof value === "string" && value.length > validation.value) {
                        errors.push({ field: field.field, message: validation.message });
                    } else if (typeof value === "number" && value > validation.value) {
                        errors.push({ field: field.field, message: validation.message });
                    }
                    break;

                case "string":
                    if (typeof value !== "string") {
                        errors.push({ field: field.field, message: validation.message });
                    }
                    break;

                case "email":
                    if (typeof value !== "string" || !value.includes("@")) {
                        errors.push({ field: field.field, message: validation.message });
                    }
                    break;

                case "url":
                    if (typeof value !== "string" || !isValidUrl(value)) {
                        errors.push({ field: field.field, message: validation.message });
                    }
                    break;

                case "in":
                    if (!validation.value.includes(value)) {
                        errors.push({ field: field.field, message: validation.message });
                    }
                    break;

                case "array":
                    if (!Array.isArray(value)) {
                        errors.push({ field: field.field, message: validation.message });
                    }
                    break;

                case "number":
                    if (typeof value !== "number" || Number.isNaN(value)) {
                        errors.push({ field: field.field, message: validation.message });
                    }
                    break;

                case "boolean":
                    if (value !== true && value !== false) {
                        errors.push({ field: field.field, message: validation.message });
                    }
                    break;

                case "datetime":
                    if (!isValidDateTime(value)) {
                        errors.push({ field: field.field, message: validation.message });
                    } else {
                        body[field.field] = parseDateTime(value);
                    }
                    break;

                default:
                    break;
            }
        });
    });

    if (errors.length > 0) {
        res.status(400).json(errorResponse("Errores de validacion", errors, 400));
        return true;
    }

    return false;
};
