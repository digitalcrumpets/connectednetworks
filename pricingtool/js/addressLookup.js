// Handles postcode lookup and address selection logic
import { setApiValue } from './apiState.js';
import { displayError, hideError, showLoader, hideLoader, openModal, closeModal, enableButton, disableButton } from './uiHelpers.js';
import { isValidUKPostcode, normalizePostcode } from './validation.js';
import { showStep } from './stepNavigation.js'; // To start the form after selection

let selectedID = null;
let selectedPostcode = null;

// --- Address Lookup API Logic ---
const fetchAddressesFromAPI = async (postcode) => {
    showLoader('addressLookupLoader');
    hideError('addressLookupError');
    disableButton(document.getElementById('lookupAddressButton'));

    // Use the Connected Networks quote API endpoint
    const url = `https://conencted-networks-quoting-api.vercel.app/api/addresses?postcode=${encodeURIComponent(postcode)}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            // Handle API error responses
            let errorMessage = `Error: ${response.status} ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch (e) {
                 console.warn("Could not parse error response from address API.");
            }
            throw new Error(errorMessage);
        }
        const addresses = await response.json();
        hideLoader('addressLookupLoader');
        enableButton(document.getElementById('lookupAddressButton'));
        return Array.isArray(addresses) ? addresses : []; // Ensure it returns an array
    } catch (error) {        hideLoader('addressLookupLoader');
        enableButton(document.getElementById('lookupAddressButton'));
        console.error('Address Lookup API Error:', error);
        displayError('addressLookupError', `Lookup failed: ${error.message}. Please check the postcode or try again later.`);
        return []; // Return empty array on error
    }
};

// --- Display Results Logic ---
const displayResults = (addresses) => {
    const resultsContainer = document.getElementById('postcodeResults');
    const noResultsMessage = document.getElementById('manualAddressEntry');
    const selectAddressButton = document.getElementById('selectAddressButton');

    if (!resultsContainer || !noResultsMessage || !selectAddressButton) {
        console.error('Address results UI elements not found.');
        return;
    }

    resultsContainer.innerHTML = ''; // Clear previous results
    selectedID = null; // Reset selection
    disableButton(selectAddressButton);

    if (addresses.length === 0) {
        noResultsMessage.style.display = 'block';
        resultsContainer.style.display = 'none';
        return;
    }

    // Hide no results message, show results
    noResultsMessage.style.display = 'block'; // Changed to 'block' since this contains the select button
    resultsContainer.style.display = 'block';

    // Add each address as a clickable item
    addresses.forEach((address) => {
        const listItem = document.createElement('div');
        listItem.className = 'address-result-item';
        listItem.textContent = address.fullAddress || formatAddress(address);
        listItem.dataset.id = address.id; // Store the unique ID
        listItem.dataset.postcode = address.postcode; // Store the postcode

        listItem.addEventListener('click', () => {
            document.querySelectorAll('.address-result-item').forEach(item => item.classList.remove('selected'));
            listItem.classList.add('selected');
            selectedID = listItem.dataset.id;
            selectedPostcode = listItem.dataset.postcode; // Make sure to capture the postcode from the selected address
            enableButton(selectAddressButton);

            // Save the selected address to API state
            setApiValue('locationIdentifier.id', selectedID);
            setApiValue('locationIdentifier.postcode', selectedPostcode);

            // Hide initial view before showing the quote modal
            const initialView = document.getElementById('initialView');
            if (initialView) initialView.style.display = 'none';

            // Close modal and advance to the next step
            closeModal('addressLookupModal');
            showStep('quoteServiceType'); // Show the first step of the form

        });
        resultsContainer.appendChild(listItem);
    });
    openModal('addressLookupModal'); // Changed from 'addressModal' to 'addressLookupModal'
};

// Expose displayResults to window scope for the test button
window.displayResultsFunction = displayResults;

// Helper function to format an address object into a string (for test button)
const formatAddress = (address) => {
    // Prioritize fullAddress property if available (matches the API format)
    if (address.fullAddress) {
        return address.fullAddress;
    }
    
    if (!address) return '';
    
    const parts = [];
    if (address.line1) parts.push(address.line1);
    if (address.line2) parts.push(address.line2);
    if (address.line3) parts.push(address.line3);
    if (address.town) parts.push(address.town);
    if (address.county) parts.push(address.county);
    if (address.postcode) parts.push(address.postcode);
    
    return parts.filter(p => p && p.trim()).join(', ');
};

// --- Initialization ---
export const initializeAddressLookup = () => {
    const postcodeButton = document.getElementById('lookupAddressButton');
    const postcodeField = document.getElementById('userPostcode'); // Ensure this ID matches your HTML
    const selectAddressButton = document.getElementById('selectAddressButton');
    const closeModalButton = document.getElementById('closeAddressModal'); // Fixed to match HTML ID

    if (!postcodeButton || !postcodeField || !selectAddressButton || !closeModalButton) {
        console.error('Address lookup initialization failed: One or more elements not found.');
        return;
    }

    const handlePostcodeLookup = async () => {
        const postcode = postcodeField.value;
        const normalized = normalizePostcode(postcode);

        hideError('addressLookupError');
        if (!isValidUKPostcode(normalized)) {
            displayError('addressLookupError', 'Please enter a valid UK postcode.');
            return;
        }
        selectedPostcode = normalized; // Store the validated postcode
        const addresses = await fetchAddressesFromAPI(normalized);
        displayResults(addresses);
    };

    postcodeButton.addEventListener('click', handlePostcodeLookup);

    // Optional: Allow Enter key press in postcode field to trigger lookup
    postcodeField.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent default form submission if applicable
            handlePostcodeLookup();
        }
    });

    selectAddressButton.addEventListener('click', () => {
        if (selectedID && selectedPostcode) {
            console.log(`Address Selected: ID=${selectedID}, Postcode=${selectedPostcode}`);
            // Save to API state
            setApiValue('locationIdentifier.id', selectedID);
            setApiValue('locationIdentifier.postcode', selectedPostcode);

            closeModal('addressLookupModal');

            // Hide address lookup section, show the quote form
            const addressLookupSection = document.getElementById('addressLookupSection'); // Assuming this container exists
            const quoteFormSection = document.getElementById('quoteFormSection'); // Assuming this container exists
            if(addressLookupSection) addressLookupSection.style.display = 'none';
            if(quoteFormSection) quoteFormSection.style.display = 'block';

             // Open the quote questions modal and show the first step
             openModal('quoteQuestionsModal');
             showStep('quoteServiceType'); // Show the first step of the form

        } else {
            console.warn('No address selected.');
             // Optionally show an error in the modal
             displayError('addressModalError', 'Please select an address from the list.');
        }
    });

    closeModalButton.addEventListener('click', () => closeModal('addressLookupModal'));

    // TEMP: Test Postcode Button Logic
    const testPostcodeBtn = document.getElementById("testPostcodeBtn");
    if (testPostcodeBtn) {
        // Test button logic removed - using real API only
    }
};
