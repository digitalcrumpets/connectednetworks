// Handles the final quote submission logic
import { getFullApiData, resetApiData } from './apiState.js';
import { showLoader, hideLoader, displayError, hideError, showSuccessModal } from './uiHelpers.js';

// Corrected API endpoint URL (assuming it should be 'connected')
// TODO: Move this to a config file or environment variable
const SUBMIT_QUOTE_ENDPOINT = '/api/connected/quote'; 
const SUBMIT_LOADER_ID = 'submissionLoader'; // ID for a potential dedicated submission loader
const SUBMIT_ERROR_ID = 'submissionError'; // ID for a potential dedicated submission error area
const GLOBAL_LOADER_ID = 'globalLoader'; // Or use a global loader
const FINAL_STEP_ERROR_ID = 'step-quoteContractTerms-error'; // Error container on the final step

/**
 * Submits the completed quote data to the backend API.
 */
export async function submitQuote() {
    console.log("Attempting to submit quote...");
    showLoader(GLOBAL_LOADER_ID); // Show global loader during submission
    hideError(FINAL_STEP_ERROR_ID); // Clear any errors on the final step
    hideError(SUBMIT_ERROR_ID);   // Clear any previous general submission errors

    const quoteData = getFullApiData();

    // Optional: Perform final validation on the *entire* quoteData object if needed
    // if (!finalValidation(quoteData)) { ... }

    console.log("Submitting data:", JSON.stringify(quoteData, null, 2));

    try {
        const response = await fetch(SUBMIT_QUOTE_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Add any other required headers (e.g., Authorization)
            },
            body: JSON.stringify(quoteData),
        });

        if (!response.ok) {
            // Attempt to get error details from the response body
            let errorData;
            try {
                errorData = await response.json();
            } catch (parseError) {
                // If response is not JSON or empty
                errorData = { message: response.statusText };
            }
            throw new Error(`API Error ${response.status}: ${errorData?.message || 'Unknown error'}`);
        }

        // Success
        const result = await response.json(); // Assuming the API returns some confirmation
        console.log('Quote Submitted Successfully:', result);
        hideLoader(GLOBAL_LOADER_ID);

        // Show success feedback (e.g., a modal)
        showSuccessModal('Quote Submitted!', 'Your quote request has been received successfully.');

        // Optional: Reset form state after successful submission
        // resetApiData();
        // Potentially navigate back to the first step or a thank you page
        // import { showStep } from './stepNavigation.js'; showStep(getAllStepIds()[0]);

    } catch (error) {
        console.error('Quote Submission Failed:', error);
        hideLoader(GLOBAL_LOADER_ID);

        // Display error message to the user
        const errorMessage = error.message || 'An unexpected error occurred during submission. Please try again.';
        // Display error in a dedicated submission error area or on the final step
        displayError(FINAL_STEP_ERROR_ID, errorMessage);
        // displayError(SUBMIT_ERROR_ID, errorMessage);

    }
}
