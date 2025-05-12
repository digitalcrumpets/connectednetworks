// Defines the configuration for each step of the form

import { getApiValue } from './apiState.js'; // Needed for conditional logic

// Helper to get the value from different element types (will be moved to formElements.js later, but needed here for config)
// Consider passing this function or relevant state into config functions if needed.
const getElementValue = (element, config) => {
    if (!element) return null;

    if (config.valueAttr) {
        return element.getAttribute(config.valueAttr);
    }
    if (config.valueSource === 'textContent') {
        // Find the specific text element if nested (e.g., in dropdown toggle)
        const textDisplay = element.querySelector('div:nth-child(2)') || element;
        return textDisplay.textContent.trim();
    }
    if (config.type === 'yesno') {
        return element.matches(config.yesSelector);
    }
    if (config.type === 'numberInput') {
         const val = parseInt(element.value, 10);
         return isNaN(val) ? null : val;
    }
    // Default or other types
    return element.value || element.textContent.trim();
};


export const stepConfig = {
    // --- Step 1: Service Type ---
    quoteServiceType: {
        label: 'Service Type',
        type: 'selection',
        selector: '.quotequestionscarditem', // CSS selector for clickable items
        apiKey: 'btQuoteParams.serviceType',
        valueAttr: 'data-value',
        isRequired: true,
        navigation: {
            next: 'quotePreferredIpAccess',
            prev: null // First step
        },
        validationRules: {}
    },
    // --- Step 2: Preferred IP Access (Single or Dual) ---
    quotePreferredIpAccess: {
        label: 'Preferred IP Access',
        type: 'selection',
        selector: '.quotequestionscarditem',
        apiKey: 'btQuoteParams.preferredIpBackbone',
        valueAttr: 'data-value',
        isRequired: true,
        navigation: {
            next: 'quoteEtherwayBandwidth', // Go to interface selection
            prev: 'quoteServiceType'
        },
        // condition: () => getApiValue('btQuoteParams.serviceType') === 'single' // Example condition if needed
        validationRules: {}
    },
    // --- Step 3: Circuit Interface (Etherway Bandwidth) ---
    quoteEtherwayBandwidth: {
        label: 'Circuit Interface',
        type: 'selection',
        selector: '.quotequestionscarditem[data-value]', // Only items with data-value
        apiKey: 'btQuoteParams.circuitInterface',
        valueAttr: 'data-value',
        isRequired: true,
        navigation: {
            next: 'quoteEtherflowBandwidth',
            prev: 'quotePreferredIpAccess'
        },
        validationRules: {}
    },
    // --- Step 4: Circuit Bandwidth (Etherflow) ---
    quoteEtherflowBandwidth: {
        label: 'Circuit Bandwidth',
        type: 'dropdown',
        dropdownSelectors: {
            '1G': '#quoteEtherflow1GbitDropdown',
            '10G': '#quoteEtherflow10GbitDropdown'
        },
        apiKey: 'btQuoteParams.circuitBandwidth',
        valueSource: 'textContent',
        isRequired: true,
        navigation: {
            next: () => (getApiValue('btQuoteParams.serviceType') === 'dual' ? 'quoteConfiguration' : 'quoteNumberOfIPs'),
            prev: 'quoteEtherwayBandwidth'
        },
        validationRules: {}
    },
    // --- Step 5: Dual Config (Active/Passive) ---
     quoteConfiguration: {
        label: 'Dual Configuration',
        type: 'selection',
        selector: '.quotequestionscarditem',
        apiKey: 'btQuoteParams.dualInternetConfig',
        valueAttr: 'data-value',
        isRequired: true,
        navigation: {
            next: (value) => (value === 'Active / Active' ? 'quoteDiverseIpNetwork' : 'quoteNumberOfIPs'),
            prev: 'quoteEtherflowBandwidth'
        },
        condition: () => getApiValue('btQuoteParams.serviceType') === 'dual',
        validationRules: {}
    },
    // --- Step 6: Diverse IP Network (Active/Active Dual) ---
    quoteDiverseIpNetwork: {
        label: 'Diverse IP Backbone',
        type: 'selection',
        selector: '.quotequestionscarditem',
        apiKey: 'btQuoteParams.preferredDiverseIpBackbone', // Corrected key based on default structure (typo included)
        valueAttr: 'data-value',
        isRequired: true,
        navigation: {
            next: 'quoteCircuit2Bandwidth',
            prev: 'quoteConfiguration'
        },
        condition: () => getApiValue('btQuoteParams.serviceType') === 'dual' && getApiValue('btQuoteParams.dualInternetConfig') === 'Active / Active',
        validationRules: {}
    },
    // --- Step 7: Circuit 2 Bandwidth (Active/Active Dual) ---
     quoteCircuit2Bandwidth: {
        label: 'Circuit 2 Bandwidth',
        type: 'dropdown',
        dropdownSelectors: { // Depends on the *primary* circuit interface type
           '1G': '#quoteCircuit21GbitDropdown',
           '10G': '#quoteCircuit210GbitDropdown'
        },
        apiKey: 'btQuoteParams.circuitTwoBandwidth',
        valueSource: 'textContent',
        isRequired: true,
        navigation: {
            next: 'quoteNumberOfIPs',
            prev: 'quoteDiverseIpNetwork'
        },
        condition: () => getApiValue('btQuoteParams.serviceType') === 'dual' && getApiValue('btQuoteParams.dualInternetConfig') === 'Active / Active',
        validationRules: {}
    },
    // --- Step 8: Number of IPs ---
    quoteNumberOfIPs: {
        label: 'Number of IPs',
        type: 'dropdown',
        dropdownSelectors: { 'default': '#quoteNumberOfIPAddresses' },
        apiKey: 'btQuoteParams.numberOfIpAddresses',
        valueSource: 'textContent',
        isRequired: true,
        navigation: {
            next: 'quoteSecureIpDelivery',
            prev: () => {
                const serviceType = getApiValue('btQuoteParams.serviceType');
                const dualConfig = getApiValue('btQuoteParams.dualInternetConfig');
                if (serviceType === 'single') return 'quoteEtherflowBandwidth';
                if (serviceType === 'dual') {
                    return dualConfig === 'Active / Active' ? 'quoteCircuit2Bandwidth' : 'quoteConfiguration';
                }
                return 'quoteEtherflowBandwidth'; // Fallback
            }
        },
        validationRules: {}
    },
    // --- Security Section Start (Conditional) ---
    quoteSecureIpDelivery: {
        label: 'Secure IP Delivery',
        type: 'yesno',
        yesSelector: '#quoteSecureYes',
        noSelector: '#quoteSecureNo',
        apiKey: 'securityQuoteParams.secureIpDelivery',
        isRequired: true,
        navigation: {
            next: (value) => (value === true ? 'quoteZTNARequired' : 'quoteContractTerms'), // Go to ZTNA if yes, else skip to contract
            prev: 'quoteNumberOfIPs'
        },
        validationRules: {}
    },
    // --- Step 10: ZTNA Required ---
    quoteZTNARequired: {
        label: 'ZTNA Required',
        type: 'yesno',
        yesSelector: '#quoteZTNAYes',
        noSelector: '#quoteZTNANo',
        apiKey: 'securityQuoteParams.ztnaRequired',
        isRequired: true,
        navigation: {
            next: (value) => (value === true ? 'quoteZTNAUsers' : 'quoteThreatPrevention'), // Go to users if yes, else skip to threat prev
            prev: 'quoteSecureIpDelivery'
        },
        condition: () => getApiValue('securityQuoteParams.secureIpDelivery') === true,
        validationRules: {}
    },
    // --- Step 11: ZTNA Users ---
    quoteZTNAUsers: {
        label: 'Number of ZTNA Users',
        type: 'numberInput',
        inputSelector: '#quoteZTNAUsersInput-2',
        apiKey: 'securityQuoteParams.noOfZtnaUsers',
        isRequired: true,
        validationRules: { min: 1 }, // Example validation
        navigation: {
            next: 'quoteThreatPrevention',
            prev: 'quoteZTNARequired'
        },
        condition: () => getApiValue('securityQuoteParams.secureIpDelivery') === true && getApiValue('securityQuoteParams.ztnaRequired') === true
    },
    // --- Step 12: Threat Prevention ---
    quoteThreatPrevention: {
        label: 'Threat Prevention',
        type: 'yesno',
        yesSelector: '#quoteThreatYes',
        noSelector: '#quoteThreatNo',
        apiKey: 'securityQuoteParams.threatPreventionRequired',
        isRequired: true,
        navigation: {
            // Original logic seems to go to CASB if yes, RBI if no.
            // Let's verify if DLP should always be between CASB and RBI if CASB=yes
            next: (value) => (value === true ? 'quoteCASBRequired' : 'quoteRBIRequired'), // Go to CASB if yes, else skip to RBI
            prev: () => {
                const ztnaRequired = getApiValue('securityQuoteParams.ztnaRequired');
                console.log('Threat Prevention prev navigation - ZTNA Required:', ztnaRequired);
                return ztnaRequired === true ? 'quoteZTNAUsers' : 'quoteZTNARequired';
            }
        },
        condition: () => getApiValue('securityQuoteParams.secureIpDelivery') === true,
        validationRules: {}
    },
    // --- Step 13: CASB Required ---
    quoteCASBRequired: {
        label: 'CASB Required',
        type: 'yesno',
        yesSelector: '#quoteCASBYes',
        noSelector: '#quoteCASBNo',
        apiKey: 'securityQuoteParams.casbRequired',
        isRequired: true,
        navigation: {
            next: 'quoteDLPRequired', // Always go to DLP next if CASB is shown
            prev: 'quoteThreatPrevention'
        },
        // Condition: Show if Secure IP is true AND Threat Prevention is true
        condition: () => getApiValue('securityQuoteParams.secureIpDelivery') === true && getApiValue('securityQuoteParams.threatPreventionRequired') === true,
        validationRules: {}
    },
    // --- Step 14: DLP Required ---
    quoteDLPRequired: {
        label: 'DLP Required',
        type: 'yesno',
        yesSelector: '#quoteDLPYes',
        noSelector: '#quoteDLPNo',
        apiKey: 'securityQuoteParams.dlpRequired',
        isRequired: true,
        navigation: {
            next: 'quoteRBIRequired', // Go to RBI after DLP
            prev: 'quoteCASBRequired'
        },
        // Condition: Show if Secure IP is true AND Threat Prevention is true (which implies CASB was also shown)
        condition: () => getApiValue('securityQuoteParams.secureIpDelivery') === true && getApiValue('securityQuoteParams.threatPreventionRequired') === true,
        validationRules: {}
    },
    // --- Step 15: RBI Required ---
    quoteRBIRequired: {
        label: 'RBI Required',
        type: 'yesno',
        yesSelector: '#quoteRBIYes',
        noSelector: '#quoteRBINo',
        apiKey: 'securityQuoteParams.rbiRequired',
        isRequired: true,
        navigation: {
            next: 'quoteContractTerms',
            prev: () => {
                const tp = getApiValue('securityQuoteParams.threatPreventionRequired');
                // If Threat Prevention was true, previous was DLP.
                // If Threat Prevention was false, previous was Threat Prevention itself.
                return tp === true ? 'quoteDLPRequired' : 'quoteThreatPrevention';
            }
        },
        condition: () => getApiValue('securityQuoteParams.secureIpDelivery') === true,
        validationRules: {}
    },
    // --- Step 16: Contract Terms (Final Submit) ---
    quoteContractTerms: {
        label: 'Contract Term',
        type: 'finalSubmit',
        selector: '.quotequestionscarditem',
        apiKey: 'btQuoteParams.contractTermMonths',
        valueSource: 'textContent',
        valueType: 'number',
        isRequired: true,
        navigation: {
            // 'next' action is handled by the 'finalSubmit' type (calls submitQuote)
            prev: () => (getApiValue('securityQuoteParams.secureIpDelivery') === false ? 'quoteSecureIpDelivery' : 'quoteRBIRequired')
        },
        validationRules: {}
    },
    // --- Step 17: Pricing Cards ---
    pricingCardsSection: {
        label: 'Pricing Options',
        type: 'selection',
        selector: '.pricing-card',
        apiKey: 'btQuoteParams.selectedPricing',
        valueAttr: 'data-plan-name',
        isRequired: true,
        navigation: {
            next: 'contactInfoSection', // Changed from null to point to the contact info section
            prev: 'quoteContractTerms'
        },
        validationRules: {}
    },
    // --- Step 18: Contact Information ---
    contactInfoSection: {
        label: 'Contact Information',
        type: 'contactInfo', // New type for handling contact form fields
        apiKey: 'contactInfo',
        isRequired: true,
        navigation: {
            next: null, // This is the final step (submission happens on this step)
            prev: 'pricingCardsSection'
        },
        validationRules: {
            email: /.+@.+\..+/, // Simple email validation pattern
            required: ['name', 'email', 'phone'] // All fields are required
        }
    }
};

/**
 * Calculates the total number of steps potentially visible in the form.
 * This is a simplified version and might need refinement if complex conditional paths exist.
 * It counts all steps initially, assuming conditions might become true.
 */
export const getTotalSteps = () => {
    // A more accurate count might traverse the likely path based on defaults
    // or count only non-conditional steps + conditionally reachable ones.
    // For a basic progress bar, counting all defined steps might be sufficient.
    return Object.keys(stepConfig).length;
};

/**
 * Gets the configuration for a specific step.
 * @param {string} stepId - The ID of the step.
 * @returns {object|null} The configuration object or null if not found.
 */
export const getConfig = (stepId) => {
    return stepConfig[stepId] || null;
};

/**
 * Gets the list of all step IDs in order.
 * @returns {string[]} Array of step IDs.
 */
export const getAllStepIds = () => {
    return Object.keys(stepConfig);
};
