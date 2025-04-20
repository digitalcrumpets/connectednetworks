// Main controller for the quote form flow
document.addEventListener('DOMContentLoaded', initializeQuoteForm);

// Import UI helper functions
import { displayError, hideError, showLoader, hideLoader, openModal, closeModal, enableButton, disableButton } from './uiHelpers.js';
import { getApiValue } from './apiState.js';
import { initializePricingCards, getSelectedPricingOption } from './pricingCards.js';
import { getConfig } from './stepConfig.js';

// Global API state object
let api = {
    locationIdentifier: {
        id: null,
        postcode: null
    },
    btQuoteParams: {
        serviceType: null,
        preferredIpBackbone: null, 
        circuitInterface: null,
        circuitBandwidth: null,
        dualInternetConfig: null,
        circuitTwoBandwidth: null,
        numberOfIpAddresses: null,
        contractTermMonths: null
    },
    securityQuoteParams: {
        secureIpDelivery: null,
        ztnaRequired: null,
        noOfZtnaUsers: null,
        threatPreventionRequired: null,
        casbRequired: null,
        dlpRequired: null,
        rbiRequired: null
    }
};

// Initialize everything when DOM is ready
function initializeQuoteForm() {
    console.log('Initializing quote form...');
    
    // Try to load previous quote
    loadPreviousQuote();
    
    // Set up event listeners
    setupPostcodeSearch();
    setupAddressSelection();
    setupStepNavigation();
    setupFormElements();
    setupModalCloseButtons();
    
    // Ensure close button on quote modal closes modal and returns to initial view
    const closeQuoteModalBtn = document.getElementById('closeQuoteModal');
    if (closeQuoteModalBtn) {
        closeQuoteModalBtn.addEventListener('click', () => {
            const quoteModal = document.getElementById('quoteQuestionsModal');
            if (quoteModal) quoteModal.style.display = 'none';
            // Show initial view again
            const initialView = document.getElementById('initialView');
            if (initialView) initialView.style.display = 'block';
        });
    }
    
    // Initialize the initial view as visible
    document.getElementById('initialView').style.display = 'block';
}

// Check for saved quote data and show "resume" button if found
function loadPreviousQuote() {
    try {
        const savedData = localStorage.getItem('quoteFormData');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            
            // Only show resume button if there's substantial data and contract term wasn't set
            // (meaning the quote wasn't fully submitted)
            if (parsedData.btQuoteParams && 
                parsedData.locationIdentifier && 
                parsedData.locationIdentifier.id &&
                (!parsedData.btQuoteParams.contractTermMonths || 
                 parsedData.btQuoteParams.contractTermMonths <= 0)) {
                
                document.getElementById('previousQuoteSection').style.display = 'block';
                
                // Set up event listener for resume button
                document.getElementById('retrievePrevQuote').addEventListener('click', () => {
                    api = parsedData;
                    mapSavedDataToUI();
                    openQuotesModal();
                });
            }
        }
    } catch (error) {
        console.error('Error loading previous quote:', error);
        // Continue without the previous quote option
    }
}

// Map saved data back to UI elements when resuming a quote
function mapSavedDataToUI() {
    // Determine which step to show when resuming
    let resumeStepId;
    
    // Logic to determine which step to resume at based on saved values
    if (!api.btQuoteParams.serviceType) {
        resumeStepId = 'quoteServiceType';
    } else if (api.btQuoteParams.serviceType === 'single' && !api.btQuoteParams.preferredIpBackbone) {
        resumeStepId = 'quotePreferredIpAccess';
    } else if (!api.btQuoteParams.circuitInterface) {
        resumeStepId = 'quoteEtherwayBandwidth';
    } else if (!api.btQuoteParams.circuitBandwidth) {
        resumeStepId = 'quoteEtherflowBandwidth';
    } else if (api.btQuoteParams.serviceType === 'dual' && !api.btQuoteParams.dualInternetConfig) {
        resumeStepId = 'quoteConfiguration';
    } else if (api.btQuoteParams.dualInternetConfig === 'Active / Active' && !api.btQuoteParams.preferredIpBackbone) {
        resumeStepId = 'quoteDiverseIpNetwork';
    } else if (api.btQuoteParams.dualInternetConfig === 'Active / Active' && !api.btQuoteParams.circuitTwoBandwidth) {
        resumeStepId = 'quoteCircuit2Bandwidth';
    } else if (!api.btQuoteParams.numberOfIpAddresses) {
        resumeStepId = 'quoteNumberOfIPs';
    } else if (api.securityQuoteParams.secureIpDelivery === null || api.securityQuoteParams.secureIpDelivery === undefined) {
        resumeStepId = 'quoteSecureIpDelivery';
    } else if (api.securityQuoteParams.secureIpDelivery && api.securityQuoteParams.ztnaRequired === null) {
        resumeStepId = 'quoteZTNARequired';
    } else if (api.securityQuoteParams.ztnaRequired && !api.securityQuoteParams.noOfZtnaUsers) {
        resumeStepId = 'quoteZTNAUsers';
    } else if (api.securityQuoteParams.secureIpDelivery && api.securityQuoteParams.threatPreventionRequired === null) {
        resumeStepId = 'quoteThreatPrevention';
    } else if (api.securityQuoteParams.threatPreventionRequired && api.securityQuoteParams.casbRequired === null) {
        resumeStepId = 'quoteCASBRequired';
    } else if (api.securityQuoteParams.casbRequired && api.securityQuoteParams.dlpRequired === null) {
        resumeStepId = 'quoteDLPRequired';
    } else if (api.securityQuoteParams.secureIpDelivery && api.securityQuoteParams.rbiRequired === null) {
        resumeStepId = 'quoteRBIRequired';
    } else {
        resumeStepId = 'quoteContractTerms';
    }
    
    // Apply selected states to form elements based on saved values
    applySelectedStates();
    
    // Show the determined step
    showStep(resumeStepId);
}

// Apply selected states to all form elements based on the saved API data
function applySelectedStates() {
    console.log('Applying saved selections to UI elements');
    
    // Service Type
    if (api.btQuoteParams.serviceType) {
        selectCardItem('quoteServiceType', api.btQuoteParams.serviceType);
    }
    
    // Preferred IP Backbone
    if (api.btQuoteParams.preferredIpBackbone) {
        selectCardItem('quotePreferredIpAccess', api.btQuoteParams.preferredIpBackbone);
    }
    
    // Circuit Interface (Etherway)
    if (api.btQuoteParams.circuitInterface) {
        console.log(`applySelectedStates: Found circuitInterface: ${api.btQuoteParams.circuitInterface}`);
        // First select the correct bearer type
        if (api.btQuoteParams.circuitInterface.includes('1000')) {
            console.log('applySelectedStates: Selecting 1Gbit button');
            document.getElementById('quote1GbitButton')?.classList.add('selected');
            document.getElementById('quote1GbitOptions').style.display = 'block';
            document.getElementById('quote10GbitOptions').style.display = 'none';
        } else if (api.btQuoteParams.circuitInterface.includes('10G')) {
            console.log('applySelectedStates: Selecting 10Gbit button');
            document.getElementById('quote10GbitButton')?.classList.add('selected');
            document.getElementById('quote10GbitOptions').style.display = 'block';
            document.getElementById('quote1GbitOptions').style.display = 'none';
        } else {
            console.log('applySelectedStates: circuitInterface value does not match 1Gbit or 10Gbit pattern');
        }
        
        // Then select the specific interface option
        const interfaceCards = document.querySelectorAll('#quote1GbitOptions .quotequestionscarditem, #quote10GbitOptions .quotequestionscarditem');
        interfaceCards.forEach(card => {
            if (card.getAttribute('data-value') === api.btQuoteParams.circuitInterface) {
                card.classList.add('selected');
                
                // Make sure next button is enabled
                enableButton('quoteEtherwayBandwidthNext');
            }
        });
    }
    
    // Circuit Bandwidth (Etherflow)
    if (api.btQuoteParams.circuitBandwidth) {
        // Show correct dropdown
        const is1Gbit = api.btQuoteParams.circuitInterface && api.btQuoteParams.circuitInterface.includes('1000');
        const dropdown = is1Gbit ? 
            document.getElementById('quoteEtherflow1GbitDropdown') : 
            document.getElementById('quoteEtherflow10GbitDropdown');
        
        if (dropdown) {
            dropdown.style.display = 'block';
            
            // Set selected option
            const displayDiv = dropdown.querySelector('.quotequestionsdropdowntoggle div');
            if (displayDiv) displayDiv.textContent = api.btQuoteParams.circuitBandwidth;
            
            const links = dropdown.querySelectorAll('.quotequestionsdropdownlink');
            links.forEach(link => {
                if (link.textContent === api.btQuoteParams.circuitBandwidth) {
                    link.classList.add('selected');
                }
            });
            
            // Enable next button
            enableButton('quoteEtherflowBandwidthNext');
        }
    }
    
    // Dual Configuration
    if (api.btQuoteParams.dualInternetConfig) {
        selectCardItem('quoteConfiguration', api.btQuoteParams.dualInternetConfig);
    }
    
    // Diverse IP Backbone
    if (api.btQuoteParams.preferredDiverseIpBackbone) {
        selectCardItem('quoteDiverseIpNetwork', api.btQuoteParams.preferredDiverseIpBackbone);
    }
    
    // Circuit 2 Bandwidth
    if (api.btQuoteParams.circuitTwoBandwidth) {
        // Similar to Circuit 1 Bandwidth
        const is1Gbit = api.btQuoteParams.circuitInterface && api.btQuoteParams.circuitInterface.includes('1000');
        const dropdown = is1Gbit ? 
            document.getElementById('quoteCircuit21GbitDropdown') : 
            document.getElementById('quoteCircuit210GbitDropdown');
        
        if (dropdown) {
            dropdown.style.display = 'block';
            
            // Set selected option
            const displayDiv = dropdown.querySelector('.quotequestionsdropdowntoggle div');
            if (displayDiv) displayDiv.textContent = api.btQuoteParams.circuitTwoBandwidth;
            
            const links = dropdown.querySelectorAll('.quotequestionsdropdownlink');
            links.forEach(link => {
                if (link.textContent === api.btQuoteParams.circuitTwoBandwidth) {
                    link.classList.add('selected');
                }
            });
            
            // Enable next button
            enableButton('quoteCircuit2BandwidthNext');
        }
    }
    
    // Number of IPs
    if (api.btQuoteParams.numberOfIpAddresses) {
        const dropdown = document.getElementById('quoteNumberOfIPAddresses');
        if (dropdown) {
            // Set selected option
            const displayDiv = dropdown.querySelector('.quotequestionsdropdowntoggle div');
            if (displayDiv) displayDiv.textContent = api.btQuoteParams.numberOfIpAddresses;
            
            const links = dropdown.querySelectorAll('.quotequestionsdropdownlink');
            links.forEach(link => {
                if (link.textContent === api.btQuoteParams.numberOfIpAddresses) {
                    link.classList.add('selected');
                }
            });
            
            // Enable next button
            enableButton('quoteNumberOfIPsNext');
        }
    }
    
    // Security options
    // Secure IP Delivery
    if (api.securityQuoteParams.secureIpDelivery !== null) {
        const yesButton = document.getElementById('quoteSecureYes');
        const noButton = document.getElementById('quoteSecureNo');
        
        if (yesButton && noButton) {
            if (api.securityQuoteParams.secureIpDelivery === true) {
                yesButton.classList.add('selected');
                noButton.classList.remove('selected');
            } else {
                noButton.classList.add('selected');
                yesButton.classList.remove('selected');
            }
            
            // Enable next button
            enableButton('quoteSecureIpDeliveryNext');
        }
    }
    
    // ZTNA Required
    if (api.securityQuoteParams.ztnaRequired !== null) {
        const yesButton = document.getElementById('quoteZTNAYes');
        const noButton = document.getElementById('quoteZTNANo');
        
        if (yesButton && noButton) {
            if (api.securityQuoteParams.ztnaRequired === true) {
                yesButton.classList.add('selected');
                noButton.classList.remove('selected');
            } else {
                noButton.classList.add('selected');
                yesButton.classList.remove('selected');
            }
            
            // Enable next button
            enableButton('quoteZTNARequiredNext');
        }
    }
    
    // ZTNA Users
    if (api.securityQuoteParams.noOfZtnaUsers) {
        const input = document.getElementById('quoteZTNAUsersInput-2');
        if (input) {
            input.value = api.securityQuoteParams.noOfZtnaUsers;
            
            // Enable next button
            enableButton('quoteZTNAUsersNext');
        }
    }
    
    // Threat Prevention
    if (api.securityQuoteParams.threatPreventionRequired !== null) {
        const yesButton = document.getElementById('quoteThreatYes');
        const noButton = document.getElementById('quoteThreatNo');
        
        if (yesButton && noButton) {
            if (api.securityQuoteParams.threatPreventionRequired === true) {
                yesButton.classList.add('selected');
                noButton.classList.remove('selected');
            } else {
                noButton.classList.add('selected');
                yesButton.classList.remove('selected');
            }
            
            // Enable next button
            enableButton('quoteThreatPreventionNext');
        }
    }
    
    // CASB Required
    if (api.securityQuoteParams.casbRequired !== null) {
        const yesButton = document.getElementById('quoteCASBYes');
        const noButton = document.getElementById('quoteCASBNo');
        
        if (yesButton && noButton) {
            if (api.securityQuoteParams.casbRequired === true) {
                yesButton.classList.add('selected');
                noButton.classList.remove('selected');
            } else {
                noButton.classList.add('selected');
                yesButton.classList.remove('selected');
            }
            
            // Enable next button
            enableButton('quoteCASBRequiredNext');
        }
    }
    
    // DLP Required
    if (api.securityQuoteParams.dlpRequired !== null) {
        const yesButton = document.getElementById('quoteDLPYes');
        const noButton = document.getElementById('quoteDLPNo');
        
        if (yesButton && noButton) {
            if (api.securityQuoteParams.dlpRequired === true) {
                yesButton.classList.add('selected');
                noButton.classList.remove('selected');
            } else {
                noButton.classList.add('selected');
                yesButton.classList.remove('selected');
            }
            
            // Enable next button
            enableButton('quoteDLPRequiredNext');
        }
    }
    
    // RBI Required
    if (api.securityQuoteParams.rbiRequired !== null) {
        const yesButton = document.getElementById('quoteRBIYes');
        const noButton = document.getElementById('quoteRBINo');
        
        if (yesButton && noButton) {
            if (api.securityQuoteParams.rbiRequired === true) {
                yesButton.classList.add('selected');
                noButton.classList.remove('selected');
            } else {
                noButton.classList.add('selected');
                yesButton.classList.remove('selected');
            }
            
            // Enable next button
            enableButton('quoteRBIRequiredNext');
        }
    }
    
    // Contract Term
    if (api.btQuoteParams.contractTermMonths) {
        selectCardItem('quoteContractTerms', api.btQuoteParams.contractTermMonths.toString());
    }
    
    console.log('Finished applying saved selections.');
}

// Handle postcode search
function setupPostcodeSearch() {
    const postcodeInput = document.getElementById('userPostcode');
    const lookupButton = document.getElementById('lookupAddressButton');
    const errorDisplay = document.getElementById('addressLookUpError');
    
    if (!postcodeInput || !lookupButton) {
        console.error('Postcode lookup elements not found');
        return;
    }
    
    // Handle lookup button click
    lookupButton.addEventListener('click', performPostcodeLookup);
    
    // Handle Enter key in postcode input
    postcodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            performPostcodeLookup();
        }
    });
    
    // Function to validate and search for postcode
    async function performPostcodeLookup() {
        const postcode = postcodeInput.value.trim();
        
        // Reset UI
        const errorDisplay = document.getElementById('addressLookUpError');
        if (errorDisplay) {
            errorDisplay.textContent = '';
            errorDisplay.style.display = 'none';
        }
        
        // Validate postcode format
        if (!isValidPostcode(postcode)) {
            if (errorDisplay) {
                errorDisplay.textContent = 'Please enter a valid UK postcode.';
                errorDisplay.style.display = 'block';
            }
            return;
        }
        
        // Reset the API state for a new search
        resetApiState();
        
        // Show loader
        document.getElementById('addressLookupLoader').style.display = 'block';
        
        try {
            // Call the address lookup API
            const addresses = await fetchAddressesFromAPI(postcode);
            
            // Hide loader
            document.getElementById('addressLookupLoader').style.display = 'none';
            
            if (addresses && addresses.length > 0) {
                // Display addresses in the modal
                displayAddressResults(addresses);
                
                // Show address lookup modal
                document.getElementById('addressLookupModal').style.display = 'block';
            } else {
                // No addresses found
                if (errorDisplay) {
                    errorDisplay.textContent = 'No addresses found for this postcode.';
                    errorDisplay.style.display = 'block';
                }
            }
        } catch (error) {
            // Hide loader
            document.getElementById('addressLookupLoader').style.display = 'none';
            
            // Show error
            if (errorDisplay) {
                errorDisplay.textContent = error.message || 'Error looking up address. Please try again.';
                errorDisplay.style.display = 'block';
            }
        }
    }
}

// Basic UK postcode validation
function isValidPostcode(postcode) {
    // UK postcode regex - basic validation
    const regex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
    return regex.test(postcode);
}

// Reset API state for a new lookup
function resetApiState() {
    api = {
        locationIdentifier: {
            id: null,
            postcode: null
        },
        btQuoteParams: {
            serviceType: null,
            preferredIpBackbone: null,
            circuitInterface: null,
            circuitBandwidth: null,
            dualInternetConfig: null,
            circuitTwoBandwidth: null,
            numberOfIpAddresses: null,
            contractTermMonths: null
        },
        securityQuoteParams: {
            secureIpDelivery: null,
            ztnaRequired: null,
            noOfZtnaUsers: null,
            threatPreventionRequired: null,
            casbRequired: null,
            dlpRequired: null,
            rbiRequired: null
        }
    };
}

// Fetch addresses from API
async function fetchAddressesFromAPI(postcode) {
    try {
        // Use the external API endpoint for address lookup
        const url = `https://conencted-networks-quoting-api.vercel.app/api/addresses?postcode=${encodeURIComponent(postcode)}`;
        
        console.log(`Fetching addresses from ${url}`);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Address lookup failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data && Array.isArray(data)) {
            return data; // API returns the addresses array directly
        } else {
            console.error('Unexpected API response format:', data);
            throw new Error('Invalid response from address lookup service');
        }
    } catch (error) {
        console.error('Error fetching addresses:', error);
        throw new Error('Failed to lookup addresses. Please try again later.');
    }
}

// Display address results in the modal
function displayAddressResults(addresses) {
    const resultsContainer = document.getElementById('postcodeResults');
    
    if (!resultsContainer) {
        console.error('Address results container not found');
        return;
    }
    
    // Clear previous results
    resultsContainer.innerHTML = '';
    
    // Create list for addresses
    const addressList = document.createElement('ul');
    
    // Add each address as a list item
    addresses.forEach(address => {
        const listItem = document.createElement('li');
        const link = document.createElement('a');
        link.href = '#';
        link.textContent = formatAddress(address);
        link.dataset.addressId = address.id;
        
        // When address is clicked
        link.addEventListener('click', (e) => {
            e.preventDefault();
            selectAddress(address);
        });
        
        listItem.appendChild(link);
        addressList.appendChild(listItem);
    });
    
    resultsContainer.appendChild(addressList);
    
    // Show manual entry option if available
    const manualEntry = document.getElementById('manualAddressEntry');
    if (manualEntry) {
        manualEntry.style.display = 'block';
    }
}

// Format address for display
function formatAddress(address) {
    // If the fullAddress property exists, use it directly
    if (address.fullAddress) {
        return address.fullAddress;
    }
    
    // For structured address objects (fallback if fullAddress is not available)
    const parts = [];
    
    // Add various address components if they exist
    if (address.line1) parts.push(address.line1);
    if (address.line2) parts.push(address.line2);
    if (address.line3) parts.push(address.line3);
    if (address.line4) parts.push(address.line4);
    if (address.locality) parts.push(address.locality);
    if (address.town) parts.push(address.town);
    if (address.county) parts.push(address.county);
    if (address.postcode) parts.push(address.postcode);
    
    // Filter out any empty parts and join with commas
    return parts.filter(part => part && part.trim()).join(', ');
}

// Set up address selection from the modal
function setupAddressSelection() {
    // Close button for address modal
    const closeButton = document.getElementById('closeAddressModal');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            document.getElementById('addressLookupModal').style.display = 'none';
        });
    }
    
    // Manual address entry button
    const manualButton = document.getElementById('enterManualAddress');
    if (manualButton) {
        manualButton.addEventListener('click', () => {
            // This would normally show manual address fields
            // For simplicity, we'll just close the modal and continue
            alert('Manual address entry would be shown here.');
            document.getElementById('addressLookupModal').style.display = 'none';
            openQuotesModal();
        });
    }
}

// Handle address selection
function selectAddress(address) {
    // Store address details in API state
    api.locationIdentifier.id = address.id;
    api.locationIdentifier.postcode = address.postcode;
    
    // Save to localStorage
    saveApiState();
    
    // Close the address lookup modal
    document.getElementById('addressLookupModal').style.display = 'none';
    
    // Open the quote questions modal and show first step
    openQuotesModal();
}

// Open the quote questions modal and show first step
function openQuotesModal() {
    console.log('Opening quote modal...');
    
    const quoteModal = document.getElementById('quoteQuestionsModal');
    const initialView = document.getElementById('initialView');
    const firstStepId = 'quoteServiceType'; // Assuming this is always the first step

    if (quoteModal && initialView) {
        initialView.style.display = 'none'; // Hide initial address lookup section
        quoteModal.style.display = 'block'; // Show the modal
        
        // Show the first step
        console.log(`openQuotesModal: Showing first step: ${firstStepId}`);
        showStep(firstStepId);
    } else {
        console.error('Could not find modal or initial view element.');
    }
}

// Save current API state to localStorage
function saveApiState() {
    try {
        localStorage.setItem('quoteFormData', JSON.stringify(api));
    } catch (error) {
        console.error('Error saving form data:', error);
        // Continue without saving
    }
}

// Set up form navigation between steps
function setupStepNavigation() {
    const nextButtons = document.querySelectorAll('[id$="Next"]');
    const prevButtons = document.querySelectorAll('[id$="Prev"]');
    
    // Handle Next button clicks
    nextButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Get the current step ID from the button's ID
            const stepId = button.id.replace('Next', '');
            const stepConfig = getConfig(stepId);
            
            if (!stepConfig) {
                console.error(`No configuration found for step ${stepId}`);
                return;
            }
            
            if (stepConfig.type === 'finalSubmit') {
                // For the final submit step, we'll handle it here instead of navigating
                console.log('Final submit step - calling submitQuote');
                
                // We only want to use our local submitQuote function, 
                // not the one from submission.js which would cause a double API call
                if (button.id === 'quoteContractTermsNext') {
                    // Set a flag to prevent multiple API calls due to race conditions
                    if (window.isAlreadySubmitting) {
                        console.log('Already processing a submission, ignoring additional click');
                        return;
                    }
                    
                    window.isAlreadySubmitting = true;
                    
                    // Add a small delay before calling submitQuote to avoid race conditions
                    setTimeout(() => {
                        submitQuote();
                        // Reset flag after 2 seconds to allow future submissions if needed
                        setTimeout(() => {
                            window.isAlreadySubmitting = false;
                        }, 2000);
                    }, 100);
                    
                    return; // Important: don't continue with normal navigation
                }
            }
            
            // For normal steps, determine next step and navigate
            const nextStepId = getNextStep(stepId);
            if (nextStepId) {
                showStep(nextStepId);
            }
        });
    });
    
    // Handle Previous button clicks
    prevButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Get the current step ID from the button's ID
            const stepId = button.id.replace('Prev', '');
            
            // Determine previous step and navigate
            const prevStepId = getPreviousStep(stepId);
            if (prevStepId) {
                showStep(prevStepId);
            }
        });
    });
}

// Determine next step ID based on current step and api state
function getNextStep(currentStepId) {
    switch (currentStepId) {
        case 'quoteServiceType':
            return api.btQuoteParams.serviceType === 'single' ? 
                'quotePreferredIpAccess' : 'quoteEtherwayBandwidth';
                
        case 'quotePreferredIpAccess':
            return 'quoteEtherwayBandwidth';
            
        case 'quoteEtherwayBandwidth':
            return 'quoteEtherflowBandwidth';
            
        case 'quoteEtherflowBandwidth':
            return api.btQuoteParams.serviceType === 'dual' ? 
                'quoteConfiguration' : 'quoteNumberOfIPs';
                
        case 'quoteConfiguration':
            return api.btQuoteParams.dualInternetConfig === 'Active / Active' ? 
                'quoteDiverseIpNetwork' : 'quoteNumberOfIPs';
                
        case 'quoteDiverseIpNetwork':
            return 'quoteCircuit2Bandwidth';
            
        case 'quoteCircuit2Bandwidth':
            return 'quoteNumberOfIPs';
            
        case 'quoteNumberOfIPs':
            return 'quoteSecureIpDelivery';
            
        case 'quoteSecureIpDelivery':
            return api.securityQuoteParams.secureIpDelivery ? 
                'quoteZTNARequired' : 'quoteContractTerms';
                
        case 'quoteZTNARequired':
            return api.securityQuoteParams.ztnaRequired ? 
                'quoteZTNAUsers' : 'quoteThreatPrevention';
                
        case 'quoteZTNAUsers':
            return 'quoteThreatPrevention';
            
        case 'quoteThreatPrevention':
            return api.securityQuoteParams.threatPreventionRequired ? 
                'quoteCASBRequired' : 'quoteRBIRequired';
                
        case 'quoteCASBRequired':
            return api.securityQuoteParams.casbRequired ? 
                'quoteDLPRequired' : 'quoteRBIRequired';
                
        case 'quoteDLPRequired':
            return 'quoteRBIRequired';
            
        case 'quoteRBIRequired':
            return 'quoteContractTerms';
            
        default:
            return null; // No next step (end of form)
    }
}

// Determine previous step ID based on current step and api state
function getPreviousStep(currentStepId) {
    switch (currentStepId) {
        case 'quoteServiceType':
            return null; // First step, no previous step
            
        case 'quotePreferredIpAccess':
            return 'quoteServiceType';
            
        case 'quoteEtherwayBandwidth':
            return api.btQuoteParams.serviceType === 'single' ? 
                'quotePreferredIpAccess' : 'quoteServiceType';
                
        case 'quoteEtherflowBandwidth':
            return 'quoteEtherwayBandwidth';
            
        case 'quoteConfiguration':
            return 'quoteEtherflowBandwidth';
            
        case 'quoteDiverseIpNetwork':
            return 'quoteConfiguration';
            
        case 'quoteCircuit2Bandwidth':
            return 'quoteDiverseIpNetwork';
            
        case 'quoteNumberOfIPs':
            // Complex conditional return based on dual/single and configuration
            if (api.btQuoteParams.serviceType === 'single') {
                return 'quoteEtherflowBandwidth';
            } else if (api.btQuoteParams.dualInternetConfig === 'Active / Passive') {
                return 'quoteConfiguration';
            } else { // Active / Active
                return 'quoteCircuit2Bandwidth';
            }
            
        case 'quoteSecureIpDelivery':
            return 'quoteNumberOfIPs';
            
        case 'quoteZTNARequired':
            return 'quoteSecureIpDelivery';
            
        case 'quoteZTNAUsers':
            return 'quoteZTNARequired';
            
        case 'quoteThreatPrevention':
            return api.securityQuoteParams.ztnaRequired ? 
                'quoteZTNAUsers' : 'quoteZTNARequired';
                
        case 'quoteCASBRequired':
            return 'quoteThreatPrevention';
            
        case 'quoteDLPRequired':
            return 'quoteCASBRequired';
            
        case 'quoteRBIRequired':
            // Complex conditional based on threat prevention and CASB
            if (!api.securityQuoteParams.threatPreventionRequired) {
                return 'quoteThreatPrevention';
            } else if (!api.securityQuoteParams.casbRequired) {
                return 'quoteCASBRequired';
            } else {
                return 'quoteDLPRequired';
            }
            
        case 'quoteContractTerms':
            return api.securityQuoteParams.secureIpDelivery ? 
                'quoteRBIRequired' : 'quoteSecureIpDelivery';
                
        default:
            return null;
    }
}

// Show a specific step and hide all others
function showStep(stepId) {
    console.log(`Showing step: ${stepId}`);
    
    // Hide all steps first
    const steps = document.querySelectorAll('.quotequestionssection');
    steps.forEach(step => {
        step.style.display = 'none';
    });
    
    // Show the requested step
    const currentStep = document.getElementById(stepId);
    if (currentStep) {
        currentStep.style.display = 'block';
        
        // Special step initialization
        initializeStepElements(stepId);
        
        // Update progress bar
        updateProgressBar(stepId);
        
        // Update summary panel
        updateSummary();
        
        // Scroll to top of step
        currentStep.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        console.error(`Step not found: ${stepId}`);
    }
}

// Initialize elements specific to a step
function initializeStepElements(stepId) {
    // Special handling for steps that need additional initialization
    switch (stepId) {
        case 'quoteEtherwayBandwidth':
            console.log('Initializing quoteEtherwayBandwidth step - ensuring correct options visibility based on state.');
            // The actual setup of buttons and selection logic is handled in setupCircuitBearerButtons
            // and applySelectedStates. Here, we mainly ensure the correct options section (1Gbit/10Gbit) is visible
            // if a bearer selection was made previously, which applySelectedStates should already cover.
            // Leaving this case mostly empty to avoid redundant/conflicting logic.
            // If specific re-initialization is needed ONLY when entering this step, it can be added here.
            break;
            
        case 'quoteEtherflowBandwidth':
            // Show the appropriate bandwidth dropdown based on circuit interface
            if (api.btQuoteParams.circuitInterface) {
                const is1Gbit = api.btQuoteParams.circuitInterface.includes('1000');
                const dropdown = is1Gbit ? 
                    document.getElementById('quoteEtherflow1GbitDropdown') : 
                    document.getElementById('quoteEtherflow10GbitDropdown');
                
                if (dropdown) {
                    dropdown.style.display = 'block';
                    
                    // Set selected option
                    const displayDiv = dropdown.querySelector('.quotequestionsdropdowntoggle div');
                    if (displayDiv) displayDiv.textContent = api.btQuoteParams.circuitBandwidth;
                    
                    const links = dropdown.querySelectorAll('.quotequestionsdropdownlink');
                    links.forEach(link => {
                        if (link.textContent === api.btQuoteParams.circuitBandwidth) {
                            link.classList.add('selected');
                        }
                    });
                    
                    // Enable next button
                    const nextButton = document.getElementById('quoteEtherflowBandwidthNext');
                    if (nextButton) enableButton(nextButton);
                }
            }
            break;
            
        case 'quoteCircuit2Bandwidth':
            // Show the appropriate bandwidth dropdown for circuit 2
            if (api.btQuoteParams.circuitInterface) {
                const is1Gbit = api.btQuoteParams.circuitInterface.includes('1000');
                const dropdown = is1Gbit ? 
                    document.getElementById('quoteCircuit21GbitDropdown') : 
                    document.getElementById('quoteCircuit210GbitDropdown');
                
                if (dropdown) {
                    dropdown.style.display = 'block';
                    
                    // Set selected option
                    const displayDiv = dropdown.querySelector('.quotequestionsdropdowntoggle div');
                    if (displayDiv) displayDiv.textContent = api.btQuoteParams.circuitTwoBandwidth;
                    
                    const links = dropdown.querySelectorAll('.quotequestionsdropdownlink');
                    links.forEach(link => {
                        if (link.textContent === api.btQuoteParams.circuitTwoBandwidth) {
                            link.classList.add('selected');
                        }
                    });
                    
                    // Enable next button
                    const nextButton = document.getElementById('quoteCircuit2BandwidthNext');
                    if (nextButton) enableButton(nextButton);
                }
            }
            break;
    }
}

// Update progress bar based on current step
function updateProgressBar(currentStepId) {
    const progressBar = document.getElementById('progressBarFill');
    const progressText = document.getElementById('progressBarText');
    
    if (!progressBar || !progressText) {
        console.error('Progress bar elements not found');
        return;
    }
    
    // Get all possible steps
    const allSteps = document.querySelectorAll('.quotequestionssection');
    
    // Determine which steps are applicable based on current selections
    const applicableSteps = getApplicableSteps();
    
    // Find index of current step in applicable steps
    const currentIndex = applicableSteps.indexOf(currentStepId);
    
    if (currentIndex >= 0) {
        // Calculate progress percentage
        const progress = ((currentIndex + 1) / applicableSteps.length) * 100;
        
        // Update progress bar
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `Step ${currentIndex + 1} of ${applicableSteps.length}`;
    }
}

// Get list of applicable step IDs based on current selections
function getApplicableSteps() {
    const steps = ['quoteServiceType'];
    
    // Add steps based on service type
    if (api.btQuoteParams.serviceType === 'single') {
        steps.push('quotePreferredIpAccess');
    }
    
    steps.push('quoteEtherwayBandwidth', 'quoteEtherflowBandwidth');
    
    // Add steps for dual internet
    if (api.btQuoteParams.serviceType === 'dual') {
        steps.push('quoteConfiguration');
        
        if (api.btQuoteParams.dualInternetConfig === 'Active / Active') {
            steps.push('quoteDiverseIpNetwork', 'quoteCircuit2Bandwidth');
        }
    }
    
    steps.push('quoteNumberOfIPs', 'quoteSecureIpDelivery');
    
    // Add security steps if enabled
    if (api.securityQuoteParams.secureIpDelivery) {
        steps.push('quoteZTNARequired');
        
        if (api.securityQuoteParams.ztnaRequired) {
            steps.push('quoteZTNAUsers');
        }
        
        steps.push('quoteThreatPrevention');
        
        if (api.securityQuoteParams.threatPreventionRequired) {
            steps.push('quoteCASBRequired');
            
            if (api.securityQuoteParams.casbRequired) {
                steps.push('quoteDLPRequired');
            }
        }
        
        steps.push('quoteRBIRequired');
    }
    
    steps.push('quoteContractTerms');
    
    return steps;
}

// Update the summary panel
function updateSummary() {
    const summaryContent = document.getElementById('summaryContent');
    
    if (!summaryContent) {
        console.error('Summary content element not found');
        return;
    }
    
    // Start with empty summary
    let summaryHTML = '';
    
    // Add location information
    if (api.locationIdentifier.postcode) {
        summaryHTML += `
            <div class="summary-item">
                <dt>Location</dt>
                <dd>${api.locationIdentifier.postcode}</dd>
            </div>
        `;
    }
    
    // Add service type if selected
    if (api.btQuoteParams.serviceType) {
        summaryHTML += `
            <div class="summary-item">
                <dt>Service Type</dt>
                <dd>${api.btQuoteParams.serviceType === 'single' ? 'Single Internet' : 'Dual Internet'}</dd>
            </div>
        `;
    }
    
    // Add Preferred IP Access if selected
    if (api.btQuoteParams.preferredIpBackbone) {
        summaryHTML += `
            <div class="summary-item">
                <dt>Preferred IP Access</dt>
                <dd>${api.btQuoteParams.preferredIpBackbone}</dd>
            </div>
        `;
    }
    
    // Add Circuit Interface if selected
    if (api.btQuoteParams.circuitInterface) {
        summaryHTML += `
            <div class="summary-item">
                <dt>Circuit Interface</dt>
                <dd>${api.btQuoteParams.circuitInterface}</dd>
            </div>
        `;
    }
    
    // Add Circuit Bandwidth if selected
    if (api.btQuoteParams.circuitBandwidth) {
        summaryHTML += `
            <div class="summary-item">
                <dt>Circuit Bandwidth</dt>
                <dd>${api.btQuoteParams.circuitBandwidth}</dd>
            </div>
        `;
    }
    
    // Add Dual Internet Configuration if selected
    if (api.btQuoteParams.dualInternetConfig) {
        summaryHTML += `
            <div class="summary-item">
                <dt>Dual Internet Configuration</dt>
                <dd>${api.btQuoteParams.dualInternetConfig}</dd>
            </div>
        `;
    }
    
    // Add Diverse IP Network if selected
    if (api.btQuoteParams.preferredDiverseIpBackbone) {
        summaryHTML += `
            <div class="summary-item">
                <dt>Diverse IP Backbone</dt>
                <dd>${api.btQuoteParams.preferredDiverseIpBackbone}</dd>
            </div>
        `;
    }
    
    // Add Circuit 2 Bandwidth if selected
    if (api.btQuoteParams.circuitTwoBandwidth) {
        summaryHTML += `
            <div class="summary-item">
                <dt>Circuit 2 Bandwidth</dt>
                <dd>${api.btQuoteParams.circuitTwoBandwidth}</dd>
            </div>
        `;
    }
    
    // Add Number of IPs if selected
    if (api.btQuoteParams.numberOfIpAddresses) {
        summaryHTML += `
            <div class="summary-item">
                <dt>Number of IP Addresses</dt>
                <dd>${api.btQuoteParams.numberOfIpAddresses}</dd>
            </div>
        `;
    }
    
    // Add Secure IP Delivery if selected
    if (api.securityQuoteParams.secureIpDelivery !== null) {
        summaryHTML += `
            <div class="summary-item">
                <dt>Secure IP Delivery</dt>
                <dd>${api.securityQuoteParams.secureIpDelivery ? 'Yes' : 'No'}</dd>
            </div>
        `;
    }
    
    // Add ZTNA Required if selected
    if (api.securityQuoteParams.ztnaRequired !== null && api.securityQuoteParams.secureIpDelivery) {
        summaryHTML += `
            <div class="summary-item">
                <dt>ZTNA Required</dt>
                <dd>${api.securityQuoteParams.ztnaRequired ? 'Yes' : 'No'}</dd>
            </div>
        `;
    }
    
    // Add ZTNA Users if selected
    if (api.securityQuoteParams.noOfZtnaUsers && api.securityQuoteParams.ztnaRequired) {
        summaryHTML += `
            <div class="summary-item">
                <dt>Number of ZTNA Users</dt>
                <dd>${api.securityQuoteParams.noOfZtnaUsers}</dd>
            </div>
        `;
    }
    
    // Add Threat Prevention if selected
    if (api.securityQuoteParams.threatPreventionRequired !== null && api.securityQuoteParams.secureIpDelivery) {
        summaryHTML += `
            <div class="summary-item">
                <dt>Threat Prevention</dt>
                <dd>${api.securityQuoteParams.threatPreventionRequired ? 'Yes' : 'No'}</dd>
            </div>
        `;
    }
    
    // Add CASB Required if selected
    if (api.securityQuoteParams.casbRequired !== null && 
        api.securityQuoteParams.secureIpDelivery && 
        api.securityQuoteParams.threatPreventionRequired) {
        summaryHTML += `
            <div class="summary-item">
                <dt>CASB Required</dt>
                <dd>${api.securityQuoteParams.casbRequired ? 'Yes' : 'No'}</dd>
            </div>
        `;
    }
    
    // Add DLP Required if selected
    if (api.securityQuoteParams.dlpRequired !== null && 
        api.securityQuoteParams.secureIpDelivery && 
        api.securityQuoteParams.threatPreventionRequired) {
        summaryHTML += `
            <div class="summary-item">
                <dt>DLP Required</dt>
                <dd>${api.securityQuoteParams.dlpRequired ? 'Yes' : 'No'}</dd>
            </div>
        `;
    }
    
    // Add RBI Required if selected
    if (api.securityQuoteParams.rbiRequired !== null && api.securityQuoteParams.secureIpDelivery) {
        summaryHTML += `
            <div class="summary-item">
                <dt>RBI Required</dt>
                <dd>${api.securityQuoteParams.rbiRequired ? 'Yes' : 'No'}</dd>
            </div>
        `;
    }
    
    // Add Contract Term if selected
    if (api.btQuoteParams.contractTermMonths) {
        summaryHTML += `
            <div class="summary-item">
                <dt>Contract Term</dt>
                <dd>${api.btQuoteParams.contractTermMonths} Months</dd>
            </div>
        `;
    }
    
    // Display the summary content
    if (summaryHTML) {
        summaryContent.innerHTML = `<dl class="summary-list">${summaryHTML}</dl>`;
    } else {
        summaryContent.innerHTML = '<p>Your selections will appear here.</p>';
    }
}

// Setup form elements (card selections, dropdowns, inputs)
function setupFormElements() {
    console.log('setupFormElements: Starting setup...');
    try {
        console.log('setupFormElements: Calling setupCardSelections...');
        setupCardSelections();
        console.log('setupFormElements: Finished setupCardSelections.');

        console.log('setupFormElements: Calling setupCircuitBearerButtons...');
        setupCircuitBearerButtons(); 
        console.log('setupFormElements: Finished setupCircuitBearerButtons.');

        console.log('setupFormElements: Calling setupDropdowns...');
        setupDropdowns();
        console.log('setupFormElements: Finished setupDropdowns.');

        console.log('setupFormElements: Calling setupNumberInputs...');
        setupNumberInputs();
        console.log('setupFormElements: Finished setupNumberInputs.');

        console.log('setupFormElements: Calling setupYesNoButtons...');
        setupYesNoButtons(); 
        console.log('setupFormElements: Finished setupYesNoButtons.');
        
        console.log('setupFormElements: Calling applySelectedStates...');
        applySelectedStates();
        console.log('setupFormElements: Finished applySelectedStates.');

    } catch (error) {
        console.error('setupFormElements: Error during setup:', error);
    }
    console.log('setupFormElements: Completed all setups.');
}

// Setup number input fields
function setupNumberInputs() {
    const ztnaUsersInput = document.getElementById('quoteZTNAUsersInput-2');
    const nextButton = document.getElementById('quoteZTNAUsersNext'); // Get the next button element
    
    if (ztnaUsersInput) {
        // Reset existing listeners
        const newZtnaUsersInput = ztnaUsersInput.cloneNode(true);
        ztnaUsersInput.parentNode.replaceChild(newZtnaUsersInput, ztnaUsersInput);

        // Validate on input
        newZtnaUsersInput.addEventListener('input', () => {
            const value = parseInt(newZtnaUsersInput.value, 10);
            
            // Check if value is a valid number > 0
            if (value && value > 0) {
                api.securityQuoteParams.noOfZtnaUsers = value;
                if (nextButton) enableButton(nextButton); // Use the element
                saveApiState();
                updateSummary();
            } else {
                // Clear the value if invalid and disable next
                api.securityQuoteParams.noOfZtnaUsers = null; 
                if (nextButton) disableButton(nextButton);
                saveApiState();
                updateSummary();
            }
        });
        
        // Initial state check
        const savedValue = api.securityQuoteParams.noOfZtnaUsers;
        if (savedValue && savedValue > 0) {
            newZtnaUsersInput.value = savedValue;
            if (nextButton) enableButton(nextButton); // Use the element
        } else {
            newZtnaUsersInput.value = ''; // Clear input if no valid saved value
            if (nextButton) disableButton(nextButton);
        }
    }
}

// Setup yes/no button groups
function setupYesNoButtons() {
    const yesNoGroups = [
        { stepId: 'quoteSecureIpDelivery', yesId: 'quoteSecureYes', noId: 'quoteSecureNo', apiKey: 'securityQuoteParams.secureIpDelivery' },
        { stepId: 'quoteZTNARequired', yesId: 'quoteZTNAYes', noId: 'quoteZTNANo', apiKey: 'securityQuoteParams.ztnaRequired' },
        { stepId: 'quoteThreatPrevention', yesId: 'quoteThreatYes', noId: 'quoteThreatNo', apiKey: 'securityQuoteParams.threatPreventionRequired' },
        { stepId: 'quoteCASBRequired', yesId: 'quoteCASBYes', noId: 'quoteCASBNo', apiKey: 'securityQuoteParams.casbRequired' },
        { stepId: 'quoteDLPRequired', yesId: 'quoteDLPYes', noId: 'quoteDLPNo', apiKey: 'securityQuoteParams.dlpRequired' },
        { stepId: 'quoteRBIRequired', yesId: 'quoteRBIYes', noId: 'quoteRBINo', apiKey: 'securityQuoteParams.rbiRequired' },
    ];

    yesNoGroups.forEach(group => {
        const yesButton = document.getElementById(group.yesId);
        const noButton = document.getElementById(group.noId);
        const nextButton = document.getElementById(`${group.stepId}Next`); // Get the next button element
        
        if (yesButton && noButton) {
            // Reset any existing event listeners
            const newYesButton = yesButton.cloneNode(true);
            const newNoButton = noButton.cloneNode(true);
            
            yesButton.parentNode.replaceChild(newYesButton, yesButton);
            noButton.parentNode.replaceChild(newNoButton, noButton);
            
            // Add event listeners to new buttons
            newYesButton.addEventListener('click', () => {
                newYesButton.classList.add('selected');
                newNoButton.classList.remove('selected');
                const keys = group.apiKey.split('.');
                if (keys.length === 2) api[keys[0]][keys[1]] = true;
                saveApiState();
                if (nextButton) enableButton(nextButton); // Use the element
                updateSummary(); // Update summary when selection changes
            });
            
            newNoButton.addEventListener('click', () => {
                newNoButton.classList.add('selected');
                newYesButton.classList.remove('selected');
                const keys = group.apiKey.split('.');
                if (keys.length === 2) api[keys[0]][keys[1]] = false;
                saveApiState();
                if (nextButton) enableButton(nextButton); // Use the element
                updateSummary(); // Update summary when selection changes
            });
            
            // Set initial state if data exists
            const savedValue = getApiValue(group.apiKey); 
            if (savedValue === true) {
                newYesButton.classList.add('selected');
                newNoButton.classList.remove('selected');
            } else if (savedValue === false) {
                newNoButton.classList.add('selected');
                newYesButton.classList.remove('selected');
            } else {
                newYesButton.classList.remove('selected');
                newNoButton.classList.remove('selected');
            }
        }
    });
}

// Setup circuit bearer buttons (1Gbit and 10Gbit)
function setupCircuitBearerButtons() {
    const oneGbitButton = document.getElementById('quote1GbitButton');
    const tenGbitButton = document.getElementById('quote10GbitButton');
    const oneGbitOptions = document.getElementById('quote1GbitOptions');
    const tenGbitOptions = document.getElementById('quote10GbitOptions');
    const nextButton = document.getElementById('quoteEtherwayBandwidthNext'); // Get the next button element
    
    if (oneGbitButton && tenGbitButton && oneGbitOptions && tenGbitOptions) {
        console.log('setupCircuitBearerButtons: Found bearer buttons and options containers.');
        
        // Make sure the buttons are clickable
        oneGbitButton.style.pointerEvents = 'auto';
        tenGbitButton.style.pointerEvents = 'auto';
        
        // Clear any previous event listeners by cloning
        console.log('setupCircuitBearerButtons: Cloning buttons to clear listeners.');
        const freshOneGbitButton = oneGbitButton.cloneNode(true);
        const freshTenGbitButton = tenGbitButton.cloneNode(true);
        oneGbitButton.parentNode.replaceChild(freshOneGbitButton, oneGbitButton);
        tenGbitButton.parentNode.replaceChild(freshTenGbitButton, tenGbitButton);
        
        console.log('setupCircuitBearerButtons: Attaching listener to FRESH 1Gbit button.');
        freshOneGbitButton.addEventListener('click', () => {
            console.log('>>> CLICKED: 1Gbit bearer button <<<');
            freshOneGbitButton.classList.add('selected');
            freshTenGbitButton.classList.remove('selected');
            oneGbitOptions.style.display = 'block';
            tenGbitOptions.style.display = 'none';
            
            // Reset specific interface selection when bearer changes
            if (api.btQuoteParams.circuitInterface) {
                 api.btQuoteParams.circuitInterface = null;
                 // Deselect any selected interface card within options
                 oneGbitOptions.querySelectorAll('.quotequestionscarditem.selected').forEach(c => c.classList.remove('selected'));
                 tenGbitOptions.querySelectorAll('.quotequestionscarditem.selected').forEach(c => c.classList.remove('selected'));
                 if (nextButton) disableButton(nextButton); 
                 saveApiState();
                 updateSummary();
            }
        });
        
        console.log('setupCircuitBearerButtons: Attaching listener to FRESH 10Gbit button.');
        freshTenGbitButton.addEventListener('click', () => {
            console.log('>>> CLICKED: 10Gbit bearer button <<<');
            freshTenGbitButton.classList.add('selected');
            freshOneGbitButton.classList.remove('selected');
            tenGbitOptions.style.display = 'block';
            oneGbitOptions.style.display = 'none';
            
            // Reset specific interface selection when bearer changes
             if (api.btQuoteParams.circuitInterface) {
                 api.btQuoteParams.circuitInterface = null;
                 // Deselect any selected interface card within options
                 oneGbitOptions.querySelectorAll('.quotequestionscarditem.selected').forEach(c => c.classList.remove('selected'));
                 tenGbitOptions.querySelectorAll('.quotequestionscarditem.selected').forEach(c => c.classList.remove('selected'));
                 if (nextButton) disableButton(nextButton);
                 saveApiState();
                 updateSummary();
             }
        });
    } else {
        console.warn('setupCircuitBearerButtons: Circuit bearer buttons or options containers NOT found');
    }
}

// Setup dropdown behavior
function setupDropdowns() {
    // Get all dropdown toggles
    const dropdownToggles = document.querySelectorAll('.quotequestionsdropdowntoggle');
    
    // Process each dropdown toggle
    dropdownToggles.forEach(toggle => {
        // Clear old event listeners
        const newToggle = toggle.cloneNode(true);
        toggle.parentNode.replaceChild(newToggle, toggle);
        
        // Get parent container and dropdown list
        const dropdown = newToggle.closest('.quotequestionsdropdown');
        const dropdownList = dropdown ? dropdown.querySelector('.quotequestionsdropdownlist') : null;
        
        if (dropdown && dropdownList) {
            // Get dropdown ID to determine which step it belongs to
            const dropdownId = dropdown.id;
            let stepId, apiKey;
            
            // Map dropdowns to their steps and API keys
            if (dropdownId === 'quoteEtherflow1GbitDropdown' || dropdownId === 'quoteEtherflow10GbitDropdown') {
                stepId = 'quoteEtherflowBandwidth';
                apiKey = 'btQuoteParams.circuitBandwidth';
            } else if (dropdownId === 'quoteCircuit21GbitDropdown' || dropdownId === 'quoteCircuit210GbitDropdown') {
                stepId = 'quoteCircuit2Bandwidth';
                apiKey = 'btQuoteParams.circuitTwoBandwidth';
            } else if (dropdownId === 'quoteNumberOfIPAddresses') {
                stepId = 'quoteNumberOfIPs';
                apiKey = 'btQuoteParams.numberOfIpAddresses';
            }
            
            const nextButton = document.getElementById(`${stepId}Next`); // Get the next button element
            
            // Toggle dropdown when clicked
            newToggle.addEventListener('click', () => {
                const isExpanded = newToggle.getAttribute('aria-expanded') === 'true';
                
                // Close all other dropdowns first
                document.querySelectorAll('.quotequestionsdropdowntoggle[aria-expanded="true"]').forEach(otherToggle => {
                    if (otherToggle !== newToggle) {
                        otherToggle.setAttribute('aria-expanded', 'false');
                        const otherList = otherToggle.closest('.quotequestionsdropdown').querySelector('.quotequestionsdropdownlist');
                        if (otherList) otherList.style.display = 'none';
                    }
                });
                
                // Toggle current dropdown
                newToggle.setAttribute('aria-expanded', !isExpanded);
                dropdownList.style.display = isExpanded ? 'none' : 'block';
            });
            
            // Handle dropdown item selection
            const dropdownLinks = dropdownList.querySelectorAll('.quotequestionsdropdownlink');
            dropdownLinks.forEach(link => {
                // Clear old event listeners
                const newLink = link.cloneNode(true);
                link.parentNode.replaceChild(newLink, link);
                
                newLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    
                    // Update toggle text
                    const displayElement = newToggle.querySelector('div');
                    if (displayElement) {
                        displayElement.textContent = newLink.textContent;
                    }
                    
                    // Close dropdown
                    newToggle.setAttribute('aria-expanded', 'false');
                    dropdownList.style.display = 'none';
                    
                    // Update API state
                    if (stepId && apiKey) {
                        const keys = apiKey.split('.');
                        if (keys.length === 2) {
                           // Ensure the parent object exists
                           if (!api[keys[0]]) api[keys[0]] = {}; 
                           api[keys[0]][keys[1]] = newLink.textContent;
                           saveApiState();
                           
                           // Enable next button
                           if (nextButton) enableButton(nextButton); // Use the element
                           
                           // Update summary
                           updateSummary();
                        } else {
                            console.error('Invalid API key format:', apiKey);
                        }
                    }
                    
                    // Mark as selected
                    // Use the fresh NodeList inside the handler
                    const currentLinks = dropdownList.querySelectorAll('.quotequestionsdropdownlink');
                    currentLinks.forEach(l => l.classList.remove('selected'));
                    // Find the corresponding link in the current list to add class
                    const clickedLinkInCurrentList = Array.from(currentLinks).find(l => l.isEqualNode(newLink));
                    if (clickedLinkInCurrentList) clickedLinkInCurrentList.classList.add('selected');
                });
                
                // Set initial selected state if matches saved value
                if (apiKey) {
                   const keys = apiKey.split('.');
                   if (keys.length === 2 && api[keys[0]] && api[keys[0]][keys[1]] === newLink.textContent) {
                       newLink.classList.add('selected');
                       const displayElement = newToggle.querySelector('div');
                       if (displayElement) {
                           displayElement.textContent = newLink.textContent;
                       }
                   } else {
                       newLink.classList.remove('selected'); // Ensure not selected if doesn't match
                   }
                }
            });
        }
    });
}

// Setup card item selections (clicking on cards)
function setupCardSelections() {
    const cards = document.querySelectorAll('.quotequestionscarditem');
    
    cards.forEach(card => {
        // Check if this card is handled by setupYesNoButtons (by checking its ID)
        const handledByYesNo = [
            'quoteSecureYes', 'quoteSecureNo',
            'quoteZTNAYes', 'quoteZTNANo',
            'quoteThreatYes', 'quoteThreatNo',
            'quoteCASBYes', 'quoteCASBNo',
            'quoteDLPYes', 'quoteDLPNo',
            'quoteRBIYes', 'quoteRBINo'
        ].includes(card.id);

        if (handledByYesNo) {
            return; // Skip adding listener if handled by Yes/No setup
        }

        card.addEventListener('click', (e) => {
            const section = e.target.closest('.quotequestionssection');
            if (!section) return; // Should not happen
            const stepId = section.id;
            const container = e.target.closest('.quotequestionscardcontainer');
            if (!container) return; // Should not happen
            
            const value = card.getAttribute('data-value') || card.textContent.trim();
            
            // Unselect all items in the container
            container.querySelectorAll('.quotequestionscarditem').forEach(item => {
                item.classList.remove('selected');
            });
            
            // Select the clicked item
            card.classList.add('selected');
            
            // Enable the next button
            const nextButton = document.getElementById(`${stepId}Next`);
            if (nextButton) enableButton(nextButton);
            
            // Update API state based on step
            switch (stepId) {
                case 'quoteServiceType':
                    api.btQuoteParams.serviceType = value.toLowerCase(); // single or dual
                    break;
                    
                case 'quotePreferredIpAccess':
                    // Handles the 'preferred IP access' step
                    api.btQuoteParams.preferredIpBackbone = value;
                    break;

                case 'quoteDiverseIpNetwork': 
                    // Handles the 'diverse IP network' step (uses misspelled key to match applyState)
                    api.btQuoteParams.preferredDiverseIpBackbone = value; 
                    break;
                    
                case 'quoteConfiguration':
                    api.btQuoteParams.dualInternetConfig = value;
                    break;

                case 'quoteEtherwayBandwidth': // Add case for interface options
                    api.btQuoteParams.circuitInterface = value; 
                    break;
                    
                // Yes/No cases removed - handled by setupYesNoButtons

                case 'quoteContractTerms':
                    // Extract numbers from the text e.g. "12 Months" -> 12
                    const months = parseInt(value, 10);
                    api.btQuoteParams.contractTermMonths = months;
                    break;
                
                // Default case might be needed if other card selections exist
                default:
                    console.warn(`Unhandled card selection in step: ${stepId} with value: ${value}`);
                    break;
            }
            
            // Save state after each selection
            saveApiState();
            updateSummary(); // Update summary as well
        });
    });
}

// Helper function to select a card item in a particular step
function selectCardItem(stepId, value) {
    const section = document.getElementById(stepId);
    if (!section) return;
    
    const cards = section.querySelectorAll('.quotequestionscarditem');
    cards.forEach(card => {
        const cardValue = card.getAttribute('data-value') || card.textContent.trim();
        if (cardValue.toLowerCase() === value.toLowerCase()) {
            card.classList.add('selected');
            const nextButton = document.getElementById(`${stepId}Next`);
            if (nextButton) enableButton(nextButton);
        }
    });
}

// Submit the quote to the API
let isSubmitting = false; // Flag to prevent multiple simultaneous submissions

async function submitQuote() {
    if (isSubmitting) return; // Prevent multiple submissions
    
    isSubmitting = true;
    
    // Get references to UI elements
    const loader = document.getElementById('quotePOSTLoader');
    const errorDisplay = document.getElementById('submissionError');
    const responseText = document.getElementById('apiResponseText');
    
    // Show loader
    if (loader) loader.style.display = 'block';
    
    // Clear previous error/response messages
    if (errorDisplay) errorDisplay.style.display = 'none';
    if (responseText) responseText.style.display = 'none';
    
    try {
        // Log the current API state for debugging
        console.log('Current API state before submission:', JSON.stringify(api, null, 2));
        
        // Validate all required fields are set
        if (!api.btQuoteParams.contractTermMonths) {
            throw new Error('Please select a contract term before submitting.');
        }
        
        // More lenient location identifier check - it could be an empty string which is falsy
        // First, check if the property exists
        if (!api.locationIdentifier) {
            throw new Error('Location identifier object is missing. Please start again.');
        }
        
        // Now check if it has an id (which could be an empty string)
        if (!api.locationIdentifier.id && api.locationIdentifier.id !== '') {
            console.log('Location identifier issue:', api.locationIdentifier);
            throw new Error('Location identifier ID is missing. Please select an address.');
        }
        
        // Create the structure required by the API
        const btQuoteParams = {
            // Copy existing params
            ...api.btQuoteParams,
            
            // Ensure required values have defaults
            serviceType: api.btQuoteParams.serviceType || "single",
            circuitInterface: api.btQuoteParams.circuitInterface || "1 Gbit/s",
            circuitBandwidth: formatBandwidth(api.btQuoteParams.circuitBandwidth) || "100 Mbit/s",
            numberOfIpAddresses: api.btQuoteParams.numberOfIpAddresses || "Block /29 (8 LAN IP Addresses)",
            preferredIpBackbone: api.btQuoteParams.preferredIpBackbone || "BT",
            
            // API requires these fields even for single internet
            circuitTwoBandwidth: api.btQuoteParams.circuitTwoBandwidth || "100 Mbit/s",
            dualInternetConfig: api.btQuoteParams.dualInternetConfig || "Active / Active"
        };
        
        const securityQuoteParams = {
            // Set all required boolean fields to false by default if null
            secureIpDelivery: api.securityQuoteParams?.secureIpDelivery === true,
            ztnaRequired: api.securityQuoteParams?.ztnaRequired === true,
            noOfZtnaUsers: api.securityQuoteParams?.noOfZtnaUsers || 0,
            threatPreventionRequired: api.securityQuoteParams?.threatPreventionRequired === true,
            casbRequired: api.securityQuoteParams?.casbRequired === true,
            dlpRequired: api.securityQuoteParams?.dlpRequired === true,
            rbiRequired: api.securityQuoteParams?.rbiRequired === true
        };
        
        // Structure the request body with fields at both top level and nested
        const requestBody = {
            // Top level fields (seems to be what the API is expecting based on error)
            locationIdentifier: {...api.locationIdentifier},
            btQuoteParams: btQuoteParams,
            securityQuoteParams: securityQuoteParams,
            contractTermMonths: parseInt(api.btQuoteParams.contractTermMonths, 10) || 36,
            
            // Also include nested formQuoteItem just in case
            formQuoteItem: {
                locationIdentifier: {...api.locationIdentifier},
                btQuoteParams: btQuoteParams,
                securityQuoteParams: securityQuoteParams
            }
        };
        
        // Log the full request for debugging
        console.log('Submitting Quote:', JSON.stringify(requestBody, null, 2));
        
        // Call the quote API with the correct endpoint
        const response = await fetch('https://conencted-networks-quoting-api.vercel.app/api/quote', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        // Hide loader
        if (loader) loader.style.display = 'none';
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('API Error:', errorData);
            throw new Error(`API error: ${response.status} ${errorData.message || (errorData.error?.issues ? JSON.stringify(errorData.error.issues) : response.statusText)}`);
        }
        
        // Process successful response
        const result = await response.json();
        console.log('Quote submitted successfully:', result);
        
        // Initialize pricing cards with the API response
        initializePricingCards(result);
        
        // Navigate to the pricing cards section
        showStep('pricingCardsSection');
        
        // Hide the response message (we're showing cards instead)
        if (responseText) {
            responseText.style.display = 'none';
        }
        
        // Don't clear local storage yet - we'll do that after pricing selection
        
    } catch (error) {
        console.error('Error submitting quote:', error);
        
        // Hide loader
        if (loader) loader.style.display = 'none';
        
        // Display error message
        if (errorDisplay) {
            errorDisplay.textContent = error.message || 'An error occurred while submitting your quote. Please try again later.';
            errorDisplay.style.display = 'block';
        }
    } finally {
        // Reset submission flag
        isSubmitting = false;
    }
}

// Helper function to remove empty values from an object (recursively)
function removeEmptyValues(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    
    return Object.fromEntries(
        Object.entries(obj)
            .filter(([_, v]) => {
                // Keep zero values for noOfZtnaUsers (as they're significant)
                // Remove empty strings, null, undefined, and empty arrays/objects
                if (v === 0) return true;
                if (v === false) return true;
                if (!v) return false;
                if (typeof v === 'object' && Object.keys(v).length === 0) return false;
                return true;
            })
            .map(([k, v]) => {
                // If it's an object, recursively clean it
                if (v && typeof v === 'object' && !Array.isArray(v)) {
                    const cleaned = removeEmptyValues(v);
                    return [k, Object.keys(cleaned).length > 0 ? cleaned : null];
                }
                return [k, v];
            })
            .filter(([_, v]) => v !== null) // Remove null values after cleaning
    );
}

// Format bandwidth values correctly
function formatBandwidth(value) {
    if (!value) return "";
    
    if (value.includes('Mbps')) {
        return value.replace('Mbps', 'Mbit/s');
    } else if (value.includes('Gbps')) {
        return value.replace('Gbps', 'Gbit/s');
    }
    return value;
}

// Set up close buttons for all modals
function setupModalCloseButtons() {
    // Close button for quote modal
    const closeQuoteModalButton = document.getElementById('closeQuoteModal');
    if (closeQuoteModalButton) {
        closeQuoteModalButton.addEventListener('click', () => {
            document.getElementById('quoteQuestionsModal').style.display = 'none';
            
            // Optional: Reset to the initial view
            document.getElementById('initialView').style.display = 'block';
        });
    }
    
    // Close button for address modal (in case it's not already set up elsewhere)
    const closeAddressModalButton = document.getElementById('closeAddressModal');
    if (closeAddressModalButton) {
        closeAddressModalButton.addEventListener('click', () => {
            closeModal('addressLookupModal');
        });
    }
}

// Export the initialize function so it can be imported by main.js
export { initializeQuoteForm };
