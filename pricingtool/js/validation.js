// Contains input validation functions

/**
 * Normalizes a UK postcode by removing spaces and converting to uppercase.
 * @param {string} postcode - The postcode string.
 * @returns {string} The normalized postcode.
 */
export const normalizePostcode = (postcode) => {
    if (!postcode) return '';
    return postcode.replace(/\s+/g, '').toUpperCase();
};

/**
 * Validates a UK postcode format.
 * @param {string} postcode - The postcode string.
 * @returns {boolean} True if the postcode format is valid, false otherwise.
 */
export const isValidUKPostcode = (postcode) => {
    if (!postcode) return false;
    // Basic UK postcode regex (adjust for stricter validation if needed)
    const postcodeRegex = /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i;
    return postcodeRegex.test(postcode);
};

/**
 * Validates the value of a specific form input based on its configuration.
 * @param {any} value - The value to validate.
 * @param {object} config - The step configuration object for the input.
 * @returns {string|null} An error message string if validation fails, or null if valid.
 */
export const validateInput = (value, config) => {
    // Add more specific validation rules based on config (e.g., config.validationRules)
    if (config.isRequired && (value === null || value === undefined || value === '')) {
        return 'This field is required.';
    }

    if (config.type === 'numberInput') {
        const numValue = parseInt(value, 10);
        if (isNaN(numValue)) {
            return 'Please enter a valid number.';
        }
        if (config.min !== undefined && numValue < config.min) {
            return `Value must be at least ${config.min}.`;
        }
        if (config.max !== undefined && numValue > config.max) {
            return `Value must not exceed ${config.max}.`;
        }
         // Example: Specific validation for ZTNA Users
        if (config.apiKey === 'securityQuoteParams.noOfZtnaUsers' && numValue <= 0) {
            return 'Number of users must be greater than 0.';
        }
    }

    // Add more validation types as needed (email, specific formats, etc.)

    return null; // No errors found
};
