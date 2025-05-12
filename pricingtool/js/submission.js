// Handles the final quote submission logic
import { getFullApiData, resetApiData } from './apiState.js';
import { showLoader, hideLoader, displayError, hideError } from './uiHelpers.js';
import { showStep } from './stepNavigation.js'; 
import { getAllStepIds } from './stepConfig.js';
import { formatZohoLead, sendLeadToZoho } from './zohoApi.js';

// Corrected API endpoint URL (assuming it should be 'connected')
// TODO: Move this to a config file or environment variable
const SUBMIT_QUOTE_ENDPOINT = '/api/connected/quote'; 
const ZOHO_CRM_ENDPOINT = '/api/zoho/lead'; // Endpoint for Zoho CRM lead creation
const SUBMIT_LOADER_ID = 'submissionLoader'; // ID for a potential dedicated submission loader
const SUBMIT_ERROR_ID = 'submissionError'; // ID for a potential dedicated submission error area
const GLOBAL_LOADER_ID = 'globalLoader'; // Or use a global loader
const FINAL_STEP_ERROR_ID = 'step-contactInfo-error'; // Error container on the final step (changed from quoteContractTerms)

/**
 * Submits the completed quote data to the backend API and user information to Zoho CRM.
 */
export async function submitQuote() {
    console.log("Attempting to submit quote...");
    showLoader(GLOBAL_LOADER_ID); // Show global loader during submission
    hideError(FINAL_STEP_ERROR_ID); // Clear any errors on the final step
    hideError(SUBMIT_ERROR_ID);   // Clear any previous general submission errors

    const quoteData = getFullApiData();
    
    // Extract contact information from the form data
    const contactInfo = quoteData.contactInfo || {};
    
    if (!contactInfo.name || !contactInfo.email || !contactInfo.phone) {
        hideLoader(GLOBAL_LOADER_ID);
        displayError(FINAL_STEP_ERROR_ID, 'Please provide your name, email, and phone number to submit the quote.');
        return;
    }

    console.log("Submitting data:", JSON.stringify(quoteData, null, 2));

    try {
        // 1. Submit the quote data to our own backend API
        const quoteResponse = await fetch(SUBMIT_QUOTE_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(quoteData),
        });

        if (!quoteResponse.ok) {
            // Handle quote submission error
            let errorData;
            try {
                errorData = await quoteResponse.json();
            } catch (parseError) {
                errorData = { message: quoteResponse.statusText };
            }
            
            console.error('Quote Submission API Error:', {
                status: quoteResponse.status,
                message: errorData?.message || 'Unknown error',
                source: errorData?.source || 'quoteSubmission'
            });
            
            const errorMessage = `API error: ${quoteResponse.status} ${errorData?.message || 'Unknown error'}`;
            hideLoader(GLOBAL_LOADER_ID);
            displayError(FINAL_STEP_ERROR_ID, errorMessage, true);
            return;
        }

        // 2. Quote submitted successfully, now send the lead data to Zoho CRM
        try {
            // Format the lead data according to Zoho CRM requirements
            const zohoLeadData = formatZohoLead(contactInfo, quoteData);
            
            // Send the lead to Zoho CRM
            await sendLeadToZoho(zohoLeadData);
            console.log('Lead successfully created in Zoho CRM');
        } catch (zohoError) {
            // If Zoho submission fails, log the error but don't show it to the user
            // as the quote was still successfully submitted
            console.error('Zoho CRM Lead Submission Error:', zohoError);
            // Continue with success flow since quote was submitted successfully
        }

        // Success for the overall flow
        const result = await quoteResponse.json();
        console.log('Quote Submitted Successfully:', result);
        hideLoader(GLOBAL_LOADER_ID);

        // Show success feedback with the modal
        showSuccessModal(
            'Quote Submitted!', 
            `Thank you, ${contactInfo.name}! Your quote request has been received successfully. We will contact you shortly at ${contactInfo.email}.`
        );

        // Reset form state after successful submission
        resetApiData();
        // Navigate back to the first step
        showStep(getAllStepIds()[0]);

    } catch (error) {
        console.error('Quote Submission Failed:', error);
        hideLoader(GLOBAL_LOADER_ID);

        // Display error message to the user
        const errorMessage = error.message || 'An unexpected error occurred during submission. Please try again.';
        displayError(FINAL_STEP_ERROR_ID, errorMessage);
    }
}

/**
 * Shows a custom success modal with the provided title and message.
 * @param {string} title - The title for the success modal
 * @param {string} message - The message to display in the success modal
 */
export function showSuccessModal(title, message) {
    // Create the modal if it doesn't exist already
    let successModal = document.getElementById('successModal');
    
    if (!successModal) {
        successModal = document.createElement('div');
        successModal.id = 'successModal';
        successModal.className = 'modal success-modal';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content success-modal-content';
        
        const closeButton = document.createElement('span');
        closeButton.className = 'close-modal';
        closeButton.innerHTML = '&times;';
        closeButton.onclick = () => {
            successModal.style.display = 'none';
        };
        
        const modalTitle = document.createElement('h2');
        const modalMessage = document.createElement('p');
        
        modalContent.appendChild(closeButton);
        modalContent.appendChild(modalTitle);
        modalContent.appendChild(modalMessage);
        successModal.appendChild(modalContent);
        
        document.body.appendChild(successModal);
    }
    
    // Update content and display the modal
    const modalTitle = successModal.querySelector('h2');
    const modalMessage = successModal.querySelector('p');
    
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    
    successModal.style.display = 'block';
    
    // Close when clicking outside the modal
    window.onclick = (event) => {
        if (event.target === successModal) {
            successModal.style.display = 'none';
        }
    };
}
