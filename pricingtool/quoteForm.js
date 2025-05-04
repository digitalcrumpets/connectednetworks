// Address Lookup Script & API Initialization (Largely unchanged)
let selectedID = null;
let selectedPostcode = null;
let api = {}; // Initialize empty, will be populated from localStorage or defaults

const defaultApiStructure = {
  locationIdentifier: {
    id: null,
    postcode: null,
  },
  btQuoteParams: {
    serviceType: null, // 'single', 'dual'
    preferredIpBackbone: null,
    circuitInterface: null, // e.g., '1000BASE-LX', '10GBASE-LR'
    circuitBandwidth: null,
    numberOfIpAddresses: null,
    circuitTwoBandwidth: null,
    dualInternetConfig: null, // 'Active / Passive', 'Active / Active'
    preferredDiverseIpBackbone: null, // Note: Typo in original 'Diverse', kept for consistency unless schema changes
    contractTermMonths: null,
  },
  securityQuoteParams: {
    secureIpDelivery: null, // boolean
    ztnaRequired: null, // boolean
    noOfZtnaUsers: 0, // number
    threatPreventionRequired: null, // boolean
    casbRequired: null, // boolean
    dlpRequired: null, // boolean
    rbiRequired: null, // boolean
  },
};

// Function to safely get API data from localStorage or use defaults
const loadApiData = () => {
  let loadedData = {};
  try {
    const savedApiString = localStorage.getItem('api');
    if (savedApiString) {
      loadedData = JSON.parse(savedApiString);
      // Deep merge with defaults to ensure all keys exist
      api = deepMerge(structuredClone(defaultApiStructure), loadedData);
    } else {
      api = structuredClone(defaultApiStructure);
    }
  } catch (error) {
    console.error("Error parsing API from localStorage:", error);
    api = structuredClone(defaultApiStructure);
  }
  console.log("API Initialized/Loaded:", api);
};

// Helper for deep merging objects (useful for merging defaults and saved data)
const isObject = (item) => item && typeof item === 'object' && !Array.isArray(item);

const deepMerge = (target, source) => {
  Object.keys(source).forEach(key => {
    const targetValue = target[key];
    const sourceValue = source[key];

    if (isObject(targetValue) && isObject(sourceValue)) {
      deepMerge(targetValue, sourceValue);
    } else {
      // Only assign if sourceValue is not null/undefined, otherwise keep target's default
      if (sourceValue !== null && sourceValue !== undefined) {
         target[key] = sourceValue;
      } else if (targetValue === undefined) {
         // If target doesn't have the key at all, add it even if source is null
         target[key] = sourceValue;
      }
    }
  });
  return target;
};


// Function to reset API values to default
const resetApiToDefaults = () => {
  api = structuredClone(defaultApiStructure);
  saveApiData();
};

// Function to save the current API state to localStorage
const saveApiData = () => {
  try {
    localStorage.setItem('api', JSON.stringify(api));
    // Also save to backup - consider if this is truly necessary or just use 'api'
    localStorage.setItem('quoteBackup', JSON.stringify(api));
  } catch (error) {
    console.error("Error saving API data to localStorage:", error);
  }
};

// --- Utility Functions ---
const normalizePostcode = (postcode) => postcode.replace(/\s+/g, '').toUpperCase();
const isValidUKPostcode = (postcode) => /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i.test(postcode);

// Set nested property in the API object using dot notation string
const setApiValue = (key, value) => {
    if (!key) return;
    const keys = key.split('.');
    let current = api;
    for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
            current[keys[i]] = {}; // Create nested object if it doesn't exist
        }
        current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    console.log(`API updated: ${key} = ${value}`, api);
    saveApiData();
};

// Get nested property value
const getApiValue = (key) => {
     if (!key) return undefined;
     const keys = key.split('.');
     let current = api;
     for (let i = 0; i < keys.length; i++) {
         if (current === null || current === undefined || typeof current !== 'object') {
             return undefined; // Path does not exist
         }
         current = current[keys[i]];
     }
     return current;
}

// Remove empty/null/undefined values recursively (used for final submission)
const removeEmptyValues = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;

  return Object.entries(obj)
    .map(([key, value]) => [key, removeEmptyValues(value)]) // Recurse first
    .filter(([_, value]) => value !== null && value !== undefined && value !== "" && !(typeof value === 'object' && Object.keys(value).length === 0)) // Filter empty/null/undefined and empty objects
    .reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, Array.isArray(obj) ? [] : {}); // Handle arrays if necessary, though API structure doesn't use them here
};

// --- UI Helper Functions ---
const displayError = (containerId, message) => {
  const errorContainer = document.getElementById(containerId);
  if (errorContainer) {
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
    errorContainer.style.color = 'red';
  }
};

const hideError = (containerId) => {
  const errorContainer = document.getElementById(containerId);
  if (errorContainer) {
    errorContainer.style.display = 'none';
  }
};

const showLoader = (loaderId) => {
    const loader = document.getElementById(loaderId);
    if (loader) loader.style.display = 'flex';
}

const hideLoader = (loaderId) => {
    const loader = document.getElementById(loaderId);
    if (loader) loader.style.display = 'none';
}

const enableButton = (button) => button?.classList.remove("off");
const disableButton = (button) => button?.classList.add("off");

// --- Address Lookup Logic (Largely Unchanged) ---
const fetchAddressesFromAPI = async (postcode) => {
  const url = `https://conencted-networks-quoting-api.vercel.app/api/addresses?postcode=${encodeURIComponent(postcode)}`;
  showLoader('addressLookupLoader');
  hideError('addressLookUpError');

  try {
    const response = await fetch(url, { method: 'GET' });
    const data = await response.json();
    hideLoader('addressLookupLoader');

    if (response.ok) {
      return data;
    } else {
      console.error("Error fetching addresses:", data);
      displayError("addressLookUpError", data.message || "Failed to fetch addresses. Please try again later.");
      return [];
    }
  } catch (error) {
    hideLoader('addressLookupLoader');
    console.error("Error fetching addresses:", error);
    displayError("addressLookUpError", "An error occurred while fetching addresses. Please check your connection and try again.");
    return [];
  }
};

const displayResults = (addresses) => {
  const resultsContainer = document.getElementById('postcodeResults');
  const templateItem = document.getElementById('postcodeResultItem'); // Assuming this is a template element

  // Clear previous results
  resultsContainer.querySelectorAll('.dynamic-item').forEach((item) => item.remove());

  if (!addresses || addresses.length === 0) {
    displayError("addressLookUpError", "We couldn't find any addresses for that postcode. Please confirm your postcode and try again.");
    return;
  }

  hideError('addressLookUpError');

  addresses.forEach((address) => {
    // Ensure templateItem exists and is a valid node to clone
    if (!templateItem || typeof templateItem.cloneNode !== 'function') {
        console.error("Template item 'postcodeResultItem' not found or invalid.");
        return; // Exit loop iteration if template is missing
    }
    const resultItem = templateItem.cloneNode(true);
    resultItem.classList.add('dynamic-item'); // Mark as dynamically added
    resultItem.id = `address-${address.id}`; // Give it a unique ID if needed
    resultItem.textContent = address.fullAddress;
    resultItem.dataset.id = address.id;
    resultItem.dataset.postcode = address.postcode; // Store postcode too
    resultItem.style.display = 'block'; // Make it visible

    resultItem.addEventListener('click', () => {
      selectedID = address.id;
      selectedPostcode = address.postcode;

      // Update API object
      setApiValue('locationIdentifier.id', selectedID);
      setApiValue('locationIdentifier.postcode', selectedPostcode);
      // No need to saveApiData here, setApiValue does it.

      // Hide address lookup modal and show quote questions modal
      document.getElementById('addressLookupModal').style.display = 'none';
      const quoteQuestionsModal = document.getElementById('quoteQuestionsModal');
      if (quoteQuestionsModal) {
        quoteQuestionsModal.style.display = 'flex';
        // Start the quote flow from the first step
        showStep(Object.keys(stepConfig)[0]); // Show the first configured step
      }
    });

    resultsContainer.appendChild(resultItem);
  });

  openModal('addressLookupModal'); // Open the modal containing the results
};

// Open modal function (Generic)
const openModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if (modal) {
      modal.style.opacity = 0;
      modal.style.display = 'flex'; // Or 'block' depending on layout
      setTimeout(() => {
        modal.style.opacity = 1;
      }, 10); // Small delay for transition effect
  }
};

// Initialize Address Lookup Button and Input
const initializeAddressLookup = () => {
    const button = document.getElementById('lookupAddressButton');
    const postcodeInput = document.getElementById('userPostcode');

    const handlePostcodeLookup = async () => {
        const postcode = normalizePostcode(postcodeInput.value.trim());

        if (!postcode) {
            displayError('addressLookUpError', 'Please enter a postcode.');
            return;
        }
        if (!isValidUKPostcode(postcode)) {
            displayError('addressLookUpError', 'Please enter a valid UK postcode.');
            return;
        }

        // Reset API object to default values ONLY if starting fresh
        // If retrieving, we skip this. For now, assume new lookup resets.
        resetApiToDefaults();
        hideError('addressLookUpError');

        const results = await fetchAddressesFromAPI(postcode);
        displayResults(results); // displayResults handles showing modal and errors
    };

    button?.addEventListener('click', handlePostcodeLookup);
    postcodeInput?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handlePostcodeLookup();
        }
    });
};

// --- Step Configuration ---

// Helper to get the value from different element types
const getElementValue = (element, config) => {
    if (!element) return null;

    if (config.valueAttr) {
        return element.getAttribute(config.valueAttr);
    }
    if (config.valueSource === 'textContent') {
        return element.textContent.trim();
    }
     if (config.valueSource === 'id') {
        // Special case for Yes/No where ID determines boolean
        if (config.yesSelector && element.matches(config.yesSelector)) return true;
        if (config.noSelector && element.matches(config.noSelector)) return false;
        return null; // Should not happen if selectors are correct
    }
    if (element.tagName === 'INPUT') {
        return element.value;
    }
    // Default fallback or specific logic if needed
    return element.dataset.value || element.textContent.trim();
};

// Configuration object for each step
const stepConfig = {
    quoteServiceType: {
        type: 'selection', // Clickable cards
        selector: '.quotequestionscarditem',
        apiKey: 'btQuoteParams.serviceType',
        valueAttr: 'data-value', // Get value from data-value attribute
        navigation: {
            next: (value) => (value === 'single' ? 'quotePreferredIpAccess' : 'quoteEtherwayBandwidth'),
            prev: null // Cannot go back from the first step via button
        }
    },
    quotePreferredIpAccess: {
        type: 'selection',
        selector: '.quotequestionscarditem',
        apiKey: 'btQuoteParams.preferredIpBackbone',
        valueAttr: 'data-value',
        navigation: {
            next: 'quoteEtherwayBandwidth',
            prev: 'quoteServiceType'
        },
        condition: () => api.btQuoteParams.serviceType === 'single' // Only show if serviceType is single
    },
    quoteEtherwayBandwidth: { // Renamed Step 3 for clarity (Interface selection)
        type: 'selection',
        selector: '.quotequestionscarditem[data-value]', // Only items with data-value
        apiKey: 'btQuoteParams.circuitInterface',
        valueAttr: 'data-value',
        onDisplay: (stepElement) => { // Custom logic when step is displayed
            // Hide/show 1G/10G option containers initially is handled by CSS/HTML structure.
            // Add listeners to the main 1Gbit/10Gbit *choice* buttons if they exist
            const btn1G = stepElement.querySelector('#quote1GbitButton'); // Button to SHOW 1G options
            const btn10G = stepElement.querySelector('#quote10GbitButton'); // Button to SHOW 10G options
            const options1G = stepElement.querySelector('#quote1GbitOptions');
            const options10G = stepElement.querySelector('#quote10GbitOptions');

            const setupInterfaceButtons = () => {
                 if (btn1G && btn10G && options1G && options10G) {
                     const selectInterfaceType = (type) => {
                         if (type === '1G') {
                             options1G.style.display = 'flex';
                             options10G.style.display = 'none';
                             btn1G.classList.add('interface-selected'); // Visual feedback
                             btn10G.classList.remove('interface-selected');
                             // Clear selection in the *other* group if needed
                             options10G.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
                         } else if (type === '10G') {
                             options10G.style.display = 'flex';
                             options1G.style.display = 'none';
                             btn10G.classList.add('interface-selected');
                             btn1G.classList.remove('interface-selected');
                             options1G.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
                         }
                         // Reset the actual API value when changing interface type group
                         // Let the specific option click set the final value.
                         // setApiValue('btQuoteParams.circuitInterface', null); // Or handled by selection click
                     };

                     btn1G.onclick = () => selectInterfaceType('1G');
                     btn10G.onclick = () => selectInterfaceType('10G');

                     // Initial state based on saved data if applicable
                     const currentInterface = getApiValue('btQuoteParams.circuitInterface');
                     if (currentInterface) {
                         if (currentInterface.startsWith('1000B')) selectInterfaceType('1G');
                         else if (currentInterface.startsWith('10G')) selectInterfaceType('10G');
                     } else {
                         // Default: hide both option sets until a type is chosen? Or show 1G?
                         options1G.style.display = 'none';
                         options10G.style.display = 'none';
                     }
                 }
            };
            setupInterfaceButtons();
        },
        navigation: {
            next: 'quoteEtherflowBandwidth',
            prev: () => (api.btQuoteParams.serviceType === 'single' ? 'quotePreferredIpAccess' : 'quoteServiceType')
        }
    },
    quoteEtherflowBandwidth: { // Step 4 (Bandwidth selection via dropdown)
        type: 'dropdown',
        // Selectors identify the *container* for each dropdown type
        dropdownSelectors: {
           '1G': '#quoteEtherflow1GbitDropdown', // Show if circuitInterface starts with 1000B
           '10G': '#quoteEtherflow10GbitDropdown' // Show if circuitInterface starts with 10G
        },
        apiKey: 'btQuoteParams.circuitBandwidth',
        valueSource: 'textContent', // Get value from the dropdown link text
        navigation: {
            next: () => (api.btQuoteParams.serviceType === 'dual' ? 'quoteConfiguration' : 'quoteNumberOfIPs'),
            prev: 'quoteEtherwayBandwidth'
        }
    },
     quoteConfiguration: { // Step 5 (Active/Passive for Dual)
        type: 'selection',
        selector: '.quotequestionscarditem',
        apiKey: 'btQuoteParams.dualInternetConfig',
        valueAttr: 'data-value',
        navigation: {
            next: (value) => (value === 'Active / Active' ? 'quoteDiverseIpNetwork' : 'quoteNumberOfIPs'),
            prev: 'quoteEtherflowBandwidth'
        },
        condition: () => api.btQuoteParams.serviceType === 'dual'
    },
    quoteDiverseIpNetwork: { // Step 6 (Preferred IP for Active/Active Dual)
        type: 'selection',
        selector: '.quotequestionscarditem',
        apiKey: 'btQuoteParams.preferredIpBackbone', // Note: API structure uses same key as single? Check if correct. Original code did this. Assumed correct. If requires different key like 'preferredDiverseIpBackbone', update here.
        valueAttr: 'data-value',
        navigation: {
            next: 'quoteCircuit2Bandwidth',
            prev: 'quoteConfiguration'
        },
        condition: () => api.btQuoteParams.serviceType === 'dual' && api.btQuoteParams.dualInternetConfig === 'Active / Active'
    },
     quoteCircuit2Bandwidth: { // Step 7 (Circuit 2 Bandwidth for Active/Active Dual)
        type: 'dropdown',
        dropdownSelectors: { // Depends on the *primary* circuit interface type
           '1G': '#quoteCircuit21GbitDropdown',
           '10G': '#quoteCircuit210GbitDropdown'
        },
        apiKey: 'btQuoteParams.circuitTwoBandwidth',
        valueSource: 'textContent',
        navigation: {
            next: 'quoteNumberOfIPs',
            prev: 'quoteDiverseIpNetwork'
        },
        condition: () => api.btQuoteParams.serviceType === 'dual' && api.btQuoteParams.dualInternetConfig === 'Active / Active'
    },
    quoteNumberOfIPs: { // Step 8
        type: 'dropdown',
        dropdownSelectors: { 'default': '#quoteNumberOfIPAddresses' }, // Only one dropdown here
        apiKey: 'btQuoteParams.numberOfIpAddresses',
        valueSource: 'textContent',
        navigation: {
            next: 'quoteSecureIpDelivery',
            prev: () => {
                const serviceType = api.btQuoteParams.serviceType;
                const dualConfig = api.btQuoteParams.dualInternetConfig;
                if (serviceType === 'single') return 'quoteEtherflowBandwidth';
                if (serviceType === 'dual') {
                    return dualConfig === 'Active / Active' ? 'quoteCircuit2Bandwidth' : 'quoteConfiguration';
                }
                return 'quoteEtherflowBandwidth'; // Fallback
            }
        }
    },
    quoteSecureIpDelivery: { // Step 9
        type: 'yesno',
        yesSelector: '#quoteSecureYes',
        noSelector: '#quoteSecureNo',
        apiKey: 'securityQuoteParams.secureIpDelivery',
        navigation: {
            next: (value) => (value ? 'quoteZTNARequired' : 'quoteContractTerms'),
            prev: 'quoteNumberOfIPs'
        }
    },
    quoteZTNARequired: { // Step 10
        type: 'yesno',
        yesSelector: '#quoteZTNAYes',
        noSelector: '#quoteZTNANo',
        apiKey: 'securityQuoteParams.ztnaRequired',
        navigation: {
            next: (value) => (value ? 'quoteZTNAUsers' : 'quoteThreatPrevention'),
            prev: 'quoteSecureIpDelivery'
        },
        condition: () => api.securityQuoteParams.secureIpDelivery === true
    },
    quoteZTNAUsers: { // Step 11
        type: 'numberInput',
        inputSelector: '#quoteZTNAUsersInput-2',
        apiKey: 'securityQuoteParams.noOfZtnaUsers',
        navigation: {
            next: 'quoteThreatPrevention',
            prev: 'quoteZTNARequired'
        },
        condition: () => api.securityQuoteParams.secureIpDelivery === true && api.securityQuoteParams.ztnaRequired === true
    },
    quoteThreatPrevention: { // Step 12
        type: 'yesno',
        yesSelector: '#quoteThreatYes',
        noSelector: '#quoteThreatNo',
        apiKey: 'securityQuoteParams.threatPreventionRequired',
        navigation: {
            next: (value) => (value ? 'quoteCASBRequired' : 'quoteRBIRequired'), // If yes go CASB, if no skip to RBI
            prev: () => (api.securityQuoteParams.ztnaRequired ? 'quoteZTNAUsers' : 'quoteZTNARequired')
        },
        condition: () => api.securityQuoteParams.secureIpDelivery === true
    },
    quoteCASBRequired: { // Step 13
        type: 'yesno',
        yesSelector: '#quoteCASBYes',
        noSelector: '#quoteCASBNo',
        apiKey: 'securityQuoteParams.casbRequired',
        navigation: {
            next: (value) => (value ? 'quoteDLPRequired' : 'quoteRBIRequired'), // If yes go DLP, if no skip to RBI
            prev: 'quoteThreatPrevention'
        },
        condition: () => api.securityQuoteParams.secureIpDelivery === true && api.securityQuoteParams.threatPreventionRequired === true
    },
    quoteDLPRequired: { // Step 14
        type: 'yesno',
        yesSelector: '#quoteDLPYes',
        noSelector: '#quoteDLPNo',
        apiKey: 'securityQuoteParams.dlpRequired',
        navigation: {
            next: 'quoteRBIRequired',
            prev: 'quoteCASBRequired'
        },
        condition: () => api.securityQuoteParams.secureIpDelivery === true && api.securityQuoteParams.threatPreventionRequired === true && api.securityQuoteParams.casbRequired === true
    },
    quoteRBIRequired: { // Step 15
        type: 'yesno',
        yesSelector: '#quoteRBIYes',
        noSelector: '#quoteRBINo',
        apiKey: 'securityQuoteParams.rbiRequired',
        navigation: {
            next: 'quoteContractTerms',
            prev: () => {
                // Logic from original code based on paths leading here
                const tp = api.securityQuoteParams.threatPreventionRequired;
                const casb = api.securityQuoteParams.casbRequired;
                const dlp = api.securityQuoteParams.dlpRequired; // Need DLP to determine if coming from there

                if (tp === true && casb === true && dlp === true) return 'quoteDLPRequired';
                if (tp === true && casb === true && dlp === false) return 'quoteDLPRequired'; // Still came via DLP step
                if (tp === true && casb === false) return 'quoteCASBRequired'; // Skipped DLP
                if (tp === false) return 'quoteThreatPrevention'; // Skipped CASB & DLP
                return 'quoteThreatPrevention'; // Fallback
            }
        },
        condition: () => api.securityQuoteParams.secureIpDelivery === true
    },
    quoteContractTerms: { // Step 16 - Final Step
        type: 'finalSubmit',
        selector: '.quotequestionscarditem',
        apiKey: 'btQuoteParams.contractTermMonths',
        valueSource: 'textContent', // Get value from text content
        valueType: 'number', // Convert value to number
        navigation: {
            // No 'next' step, this submits
            prev: () => (api.securityQuoteParams.secureIpDelivery === false ? 'quoteSecureIpDelivery' : 'quoteRBIRequired')
        }
    }
};

// --- Core Step Logic ---
let currentStepId = null;
const stepHistory = []; // Keep track of visited steps for back navigation

// Generic Dropdown Initializer
const initializeDropdownBehavior = (dropdownElement, stepId, config) => {
    const toggle = dropdownElement.querySelector('.quotequestionsdropdowntoggle');
    const list = dropdownElement.querySelector('.quotequestionsdropdownlist');
    const links = list?.querySelectorAll('.quotequestionsdropdownlink');
    const nextButton = document.getElementById(`${stepId}Next`);

    if (!toggle || !list || !links) {
        console.warn(`Dropdown structure incomplete in ${dropdownElement.id}`);
        return;
    }

    toggle.addEventListener('click', () => {
        const isOpen = list.style.display === 'block';
        list.style.display = isOpen ? 'none' : 'block';
        toggle.setAttribute('aria-expanded', !isOpen);
    });

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const selectedValue = getElementValue(link, config); // Use helper
            const valueToStore = config.valueType === 'number' ? parseInt(selectedValue, 10) : selectedValue;

            // Update toggle text more reliably
            const textDisplay = toggle.querySelector('div:nth-child(2)'); // Assuming second div holds the text
             if (textDisplay) textDisplay.textContent = selectedValue;
             else toggle.textContent = selectedValue; // Fallback

            links.forEach(l => l.classList.remove('selected'));
            link.classList.add('selected');
            
            // Add selected class to toggle for proper styling
            toggle.classList.add('selected');

            setApiValue(config.apiKey, valueToStore);
            enableButton(nextButton);

            list.style.display = 'none';
            toggle.setAttribute('aria-expanded', 'false');
        });
    });

     // Close dropdown if clicking outside
    document.addEventListener('click', (event) => {
        if (!dropdownElement.contains(event.target) && list.style.display === 'block') {
            list.style.display = 'none';
            toggle.setAttribute('aria-expanded', 'false');
        }
    }, true); // Use capture phase

     // Pre-select if value exists
    const currentValue = getApiValue(config.apiKey);
    if (currentValue !== null && currentValue !== undefined) {
        links.forEach(link => {
            const linkValue = getElementValue(link, config);
            // Ensure correct type comparison for numbers
            const compareValue = config.valueType === 'number' ? parseInt(linkValue, 10) : linkValue;

            if (compareValue === currentValue) {
                link.classList.add('selected');
                // Add selected class to toggle for proper styling
                toggle.classList.add('selected');
                const textDisplay = toggle.querySelector('div:nth-child(2)');
                if (textDisplay) textDisplay.textContent = linkValue;
                else toggle.textContent = linkValue; // Fallback
                enableButton(nextButton);
            }
        });
    } else {
        disableButton(nextButton); // Disable if no value
    }
};

// Submit Quote Function
const submitQuote = async (stepId) => {
    const submitButton = document.getElementById(`${stepId}Next`); // Assuming Next button acts as Submit here
    const loader = document.getElementById("quotePOSTLoader");
    const apiResponseText = document.getElementById("apiResponseText"); // Ensure this element exists

    if (submitButton?.classList.contains("off")) {
        displayError('quoteResponseError', "Please make a selection before submitting."); // Use a dedicated error display for this step
        return;
    }

    showLoader("quotePOSTLoader");
    hideError('quoteResponseError'); // Hide previous errors
    if (apiResponseText) apiResponseText.style.display = 'none'; // Hide previous success/fail message

    // 1. Prepare Payload - Start with full structure, then clean
    let requestBody = {
        locationIdentifier: api.locationIdentifier,
        btQuoteParams: api.btQuoteParams,
        securityQuoteParams: api.securityQuoteParams,
        // contractTermMonths is already inside btQuoteParams in this structure
    };

    // 2. Remove empty/null values recursively
    requestBody = removeEmptyValues(requestBody);

    // Add contractTermMonths explicitly if it was removed but exists (though removeEmptyValues should keep non-empty)
    if (api.btQuoteParams.contractTermMonths && !requestBody.btQuoteParams?.contractTermMonths) {
        if (!requestBody.btQuoteParams) requestBody.btQuoteParams = {};
        requestBody.btQuoteParams.contractTermMonths = api.btQuoteParams.contractTermMonths;
    }

    // 3. Add top-level contractTermMonths if API expects it there (adjust based on actual API spec)
    // If the API *really* expects contractTermMonths at the top level *in addition* or *instead* of nested:
    // requestBody.contractTermMonths = api.btQuoteParams.contractTermMonths;


    console.log("Submitting API Request:", JSON.stringify(requestBody, null, 2));

    try {
        const response = await fetch("https://conencted-networks-quoting-api.vercel.app/api/quote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
        });

        const responseData = await response.json(); // Try to parse JSON regardless of status

        hideLoader("quotePOSTLoader");

        if (response.ok) {
            console.log("Quote submitted successfully! Response:", responseData);
            if (apiResponseText) {
                apiResponseText.textContent = responseData.message || "Quote submitted successfully! Thank you.";
                apiResponseText.style.color = "green";
                apiResponseText.style.display = "block";
            }
            // Clear saved data on success
            localStorage.removeItem("api");
            localStorage.removeItem("quoteBackup");
            // Potentially hide the form or show a success screen
            document.getElementById('quoteQuestionsModalContent').style.display = 'none'; // Example: hide form content
             // Optionally display a dedicated success message area if apiResponseText isn't suitable
             const successMessageArea = document.getElementById('quoteSuccessMessage'); // Create this element if needed
             if(successMessageArea) {
                 successMessageArea.textContent = responseData.message || "Quote submitted successfully! Thank you.";
                 successMessageArea.style.display = 'block';
             }

        } else {
            console.error("Submission failed:", response.status, responseData);
            const errorMessage = responseData?.errors?.[0]?.message || responseData?.message || "Submission failed. Please review your selections or try again later.";
             if (apiResponseText) {
                apiResponseText.textContent = errorMessage;
                apiResponseText.style.color = "red";
                apiResponseText.style.display = "block";
             } else {
                 displayError('quoteResponseError', errorMessage); // Fallback error display
             }
        }
    } catch (error) {
        hideLoader("quotePOSTLoader");
        console.error("An error occurred while submitting the quote:", error);
         const errorMessage = "An network error occurred while submitting. Please check your connection and try again.";
         if (apiResponseText) {
             apiResponseText.textContent = errorMessage;
             apiResponseText.style.color = "red";
             apiResponseText.style.display = "block";
         } else {
             displayError('quoteResponseError', errorMessage);
         }
    }
};


// The Core Function to Display and Manage Steps
const showStep = (stepId) => {
    console.log(`Attempting to show step: ${stepId}`);

    const config = stepConfig[stepId];
    if (!config) {
        console.error(`Configuration for step ID '${stepId}' not found.`);
        return;
    }

    // Conditional Step Logic: Check if this step should be displayed
    if (config.condition && !config.condition()) {
        console.log(`Skipping step ${stepId} due to condition.`);
        // If skipping, decide where to go: try next logical step or handle error
        // This part needs careful thought. For now, let's assume navigation logic handles skipping.
        // If called directly, maybe try finding the *next* valid step? Risky.
        // Best practice: Ensure navigation logic correctly routes *around* conditional steps.
        return; // Don't display if condition is false
    }


    // Hide all steps first
    document.querySelectorAll(".quotequestionsstep").forEach((step) => {
        step.style.display = "none";
    });

    // Find the step element
    const stepElement = document.getElementById(stepId);
    if (!stepElement) {
        console.error(`Step element with ID '${stepId}' not found.`);
        return;
    }

    // Display the target step
    stepElement.style.display = "block";
    currentStepId = stepId; // Update current step tracker

    // Push to history *only* if it's different from the last step (avoid duplicates on refresh/internal calls)
    if (stepHistory.length === 0 || stepHistory[stepHistory.length - 1] !== stepId) {
       // Don't add if we just went back
       // Let the 'prev' button handle history popping
       // stepHistory.push(stepId); // Re-evaluate if manual history management is needed or if config is enough
    }
    console.log("Step history:", stepHistory);


    // --- Configure Elements and Event Listeners for this Step ---
    const nextButton = stepElement.querySelector(`#${stepId}Next`); // Find buttons within the current step element
    const prevButton = stepElement.querySelector(`#${stepId}Prev`);

    // Reset button states
    if (nextButton) disableButton(nextButton);
    if (prevButton) enableButton(prevButton); // Prev button is usually always enabled if it exists

    // Remove previous listeners to avoid duplication if showStep is called multiple times for the same step
    // This requires storing references or using anonymous functions carefully. A simpler way for now is
    // to rely on the configuration being processed once per display. Cloning nodes or more robust
    // event management might be needed if issues arise.

    // Handle different step types
    switch (config.type) {
        case 'selection':
        case 'yesno': // Yes/No often uses card-like items too
            const items = stepElement.querySelectorAll(config.selector || '.quotequestionscarditem'); // Use specific or default selector
            items.forEach(item => {
                 // Clone and replace to remove old listeners (simple method)
                // const newItem = item.cloneNode(true);
                // item.parentNode.replaceChild(newItem, item);
                 // OR rely on single attachment if showStep structure guarantees clean state

                item.onclick = (e) => { // Use onclick for simplicity here, or manage addEventListener
                    const targetItem = e.target.closest(config.selector || '.quotequestionscarditem');
                    if (!targetItem) return;

                    items.forEach(i => i.classList.remove('selected'));
                    targetItem.classList.add('selected');

                    let value = getElementValue(targetItem, config);
                    if (config.valueType === 'number') value = parseInt(value, 10);
                    if (config.type === 'yesno') {
                        value = getElementValue(targetItem, config); // Boolean based on ID match
                    }


                    setApiValue(config.apiKey, value);
                    if (nextButton) enableButton(nextButton);
                };
            });
             // Pre-select based on API data
            const currentValue = getApiValue(config.apiKey);
             if (currentValue !== null && currentValue !== undefined) {
                items.forEach(item => {
                     let itemValue = getElementValue(item, config);
                     if (config.valueType === 'number') itemValue = parseInt(itemValue, 10);
                     if (config.type === 'yesno') itemValue = getElementValue(item, config); // Boolean

                     // Handle boolean comparison carefully (true == 'true' is false)
                     if (typeof currentValue === 'boolean') {
                         if (itemValue === currentValue) {
                            item.classList.add('selected');
                            if (nextButton) enableButton(nextButton);
                         }
                     } else if (String(itemValue) === String(currentValue)) { // Compare as strings for simplicity unless number
                         item.classList.add('selected');
                         if (nextButton) enableButton(nextButton);
                     }
                });
            }
            break;

        case 'dropdown':
             // Hide all dropdowns first
             stepElement.querySelectorAll('.quotequestionsdropdown').forEach(dd => dd.style.display = 'none');

             // Determine which dropdown to show based on conditions (e.g., 1G vs 10G interface)
             let activeDropdownSelector = config.dropdownSelectors?.['default']; // Default if no specific conditions
             if (config.apiKey === 'btQuoteParams.circuitBandwidth' || config.apiKey === 'btQuoteParams.circuitTwoBandwidth') {
                 const interfaceType = getApiValue('btQuoteParams.circuitInterface');
                 if (interfaceType?.startsWith('1000B')) {
                     activeDropdownSelector = config.dropdownSelectors?.['1G'];
                 } else if (interfaceType?.startsWith('10G')) {
                     activeDropdownSelector = config.dropdownSelectors?.['10G'];
                 }
             }
             // Add more conditions here if other dropdowns depend on previous answers

             if (activeDropdownSelector) {
                 const activeDropdown = stepElement.querySelector(activeDropdownSelector);
                 if (activeDropdown) {
                     activeDropdown.style.display = 'block';
                     initializeDropdownBehavior(activeDropdown, stepId, config);
                 } else {
                     console.warn(`Active dropdown selector '${activeDropdownSelector}' not found in step ${stepId}`);
                 }
             } else {
                  console.warn(`No active dropdown determined for step ${stepId}`);
             }
            break;

        case 'numberInput':
            const input = stepElement.querySelector(config.inputSelector);
            if (input) {
                 // Restore value from API
                 const savedValue = getApiValue(config.apiKey);
                 if (savedValue !== null && savedValue !== undefined) {
                     input.value = savedValue;
                     if (parseInt(savedValue, 10) > 0) enableButton(nextButton); // Enable if valid saved value
                 } else {
                     input.value = ''; // Clear if no value
                     disableButton(nextButton);
                 }


                input.oninput = (e) => { // Use oninput
                    const value = parseInt(e.target.value, 10);
                    if (!isNaN(value) && value > 0) {
                        setApiValue(config.apiKey, value);
                        if (nextButton) enableButton(nextButton);
                    } else {
                         // Optionally clear API value if input becomes invalid/empty
                         // setApiValue(config.apiKey, 0); or setApiValue(config.apiKey, null);
                        if (nextButton) disableButton(nextButton);
                    }
                };
            }
            break;

        case 'finalSubmit':
             const submitItems = stepElement.querySelectorAll(config.selector);
             submitItems.forEach(item => {
                 item.onclick = (e) => { // Use onclick for simplicity
                     const targetItem = e.target.closest(config.selector);
                     if (!targetItem) return;

                     submitItems.forEach(i => i.classList.remove('selected'));
                     targetItem.classList.add('selected');

                     let value = getElementValue(targetItem, config);
                     if (config.valueType === 'number') value = parseInt(value, 10);

                     setApiValue(config.apiKey, value);
                     if (nextButton) enableButton(nextButton); // Enable the Submit button
                 };
             });
              // Pre-select based on API data
            const finalValue = getApiValue(config.apiKey);
             if (finalValue !== null && finalValue !== undefined) {
                 submitItems.forEach(item => {
                     let itemValue = getElementValue(item, config);
                     if (config.valueType === 'number') itemValue = parseInt(itemValue, 10);
                     if (String(itemValue) === String(finalValue)) {
                         item.classList.add('selected');
                         if (nextButton) enableButton(nextButton);
                     }
                 });
             }
             // Attach the submit action to the 'Next' button for this specific step type
             if (nextButton) {
                 nextButton.onclick = () => submitQuote(stepId); // Assign submit action
             }
            break;
    }

    // --- Navigation Button Listeners ---
    if (nextButton && config.type !== 'finalSubmit') { // Final submit has its own handler
        nextButton.onclick = () => {
            // Check if button is enabled
            if (nextButton.classList.contains('off')) {
                // Optionally show a message "Please make a selection"
                console.log("Next button disabled, selection required.");
                displayError(`step-${stepId}-error`, "Please make a selection to continue."); // Add error placeholders per step if needed
                return;
            }
             hideError(`step-${stepId}-error`);

            let nextStepId = null;
            if (typeof config.navigation.next === 'function') {
                const currentValue = getApiValue(config.apiKey);
                nextStepId = config.navigation.next(currentValue);
            } else {
                nextStepId = config.navigation.next;
            }

            if (nextStepId) {
                // Before showing next, check its condition
                let nextConfig = stepConfig[nextStepId];
                let safetyNet = 0; // Prevent infinite loop if conditions always skip
                while (nextConfig && nextConfig.condition && !nextConfig.condition() && safetyNet < 10) {
                     console.log(`Condition false for ${nextStepId}, trying next conditional step.`);
                     // Get the *next* step from the *skipped* step's config
                     let skippedValue = getApiValue(nextConfig.apiKey); // Value might be needed for next decision
                     if (typeof nextConfig.navigation.next === 'function') {
                        nextStepId = nextConfig.navigation.next(skippedValue); // Determine next based on skipped step's logic
                     } else {
                        nextStepId = nextConfig.navigation.next;
                     }
                     nextConfig = stepConfig[nextStepId];
                     safetyNet++;
                }

                if (nextStepId && safetyNet < 10) {
                    if (!stepHistory.includes(stepId)) { // Add current step before moving next
                        stepHistory.push(stepId);
                    }
                    showStep(nextStepId);
                } else if (safetyNet >= 10) {
                     console.error("Potential infinite loop detected in step navigation conditions.");
                } else {
                    console.log("End of flow reached or next step missing.");
                }

            } else {
                console.log("End of flow reached or next step not defined.");
                // Potentially submit form or show summary if it's the intended end
            }
        };
    }

    if (prevButton) {
        prevButton.onclick = () => {
            // Clear the API value for the *current* step when going back
            // This forces re-selection if the user comes forward again.
            // Consider if this is desired behavior. If not, remove this line.
            // setApiValue(config.apiKey, defaultApiStructure[config.apiKey.split('.')[0]][config.apiKey.split('.')[1]]); // Reset to default
            // Alternative: Just navigate back, keep data
            // setApiValue(config.apiKey, null); // Or set to null
            // saveApiData(); // Save the cleared state

            let prevStepId = null;
            let previousStepFromHistory = stepHistory.pop(); // Get the actual previous step visited

            if (previousStepFromHistory) {
                 prevStepId = previousStepFromHistory;
                 console.log(`Going back to history step: ${prevStepId}`);
            } else {
                 // Fallback to config if history is empty (e.g., direct load)
                 if (typeof config.navigation.prev === 'function') {
                     prevStepId = config.navigation.prev();
                 } else {
                     prevStepId = config.navigation.prev;
                 }
                  console.log(`Going back to config step: ${prevStepId}`);
            }


            if (prevStepId) {
                // Check condition of the step we are going back TO
                 let prevConfig = stepConfig[prevStepId];
                 let safetyNet = 0;
                 while(prevConfig && prevConfig.condition && !prevConfig.condition() && safetyNet < 10) {
                     console.log(`Condition false for previous step ${prevStepId}, trying previous again.`);
                     // Pop from history again or use config's prev logic repeatedly
                     previousStepFromHistory = stepHistory.pop();
                     if (previousStepFromHistory) {
                         prevStepId = previousStepFromHistory;
                     } else {
                         if (typeof prevConfig.navigation.prev === 'function') {
                             prevStepId = prevConfig.navigation.prev();
                         } else {
                             prevStepId = prevConfig.navigation.prev;
                         }
                     }
                     prevConfig = stepConfig[prevStepId];
                     safetyNet++;
                 }

                 if (prevStepId && safetyNet < 10) {
                     showStep(prevStepId);
                 } else if (safetyNet >= 10) {
                     console.error("Potential infinite loop detected going back through conditional steps.");
                 } else {
                      console.log("Start of flow reached or previous step missing.");
                 }

            } else {
                console.log("Start of flow reached.");
                // Potentially close modal or go to a start screen
                const quoteQuestionsModal = document.getElementById('quoteQuestionsModal');
                if (quoteQuestionsModal) quoteQuestionsModal.style.display = 'none';
                // Maybe show address lookup again? Depends on desired UX.
            }
        };
    }

    // Custom logic to run when a step is displayed (e.g., for complex setups like interface buttons)
    if (config.onDisplay && typeof config.onDisplay === 'function') {
        config.onDisplay(stepElement);
    }
};


// --- Retrieve Previous Quote Logic ---

// Map saved API data to UI elements using the configuration
const mapSavedDataToUI = () => {
    console.log("Mapping saved data to UI:", api);
    Object.keys(stepConfig).forEach(stepId => {
        const config = stepConfig[stepId];
        const stepElement = document.getElementById(stepId);
        if (!stepElement || !config.apiKey) return; // Skip if no element or no data binding

        const savedValue = getApiValue(config.apiKey);

        if (savedValue !== null && savedValue !== undefined && savedValue !== '' && !(typeof savedValue === 'number' && savedValue === 0 && config.apiKey === 'securityQuoteParams.noOfZtnaUsers')) { // Check for actual value (allow 0 users if explicitly set and > 0 logic handles enabling next)
            console.log(`Mapping value for ${stepId} (${config.apiKey}): ${savedValue}`);
            switch (config.type) {
                case 'selection':
                case 'yesno':
                     const items = stepElement.querySelectorAll(config.selector || '.quotequestionscarditem');
                     items.forEach(item => {
                         let itemValue = getElementValue(item, config);
                          if (config.valueType === 'number') itemValue = parseInt(itemValue, 10);
                         if (config.type === 'yesno') itemValue = getElementValue(item, config); // Boolean

                         // Robust comparison for different types
                          if (typeof savedValue === 'boolean') {
                            if (itemValue === savedValue) item.classList.add('selected');
                          } else if (String(itemValue) === String(savedValue)) {
                              item.classList.add('selected');
                          }
                     });
                    break;

                case 'dropdown':
                    // Dropdown initialization within showStep handles pre-selection
                    // We might need to ensure the correct dropdown container is visible first
                     if (config.apiKey === 'btQuoteParams.circuitBandwidth' || config.apiKey === 'btQuoteParams.circuitTwoBandwidth') {
                         const interfaceType = getApiValue('btQuoteParams.circuitInterface');
                         let activeDropdownSelector = null;
                         if (interfaceType?.startsWith('1000B')) activeDropdownSelector = config.dropdownSelectors?.['1G'];
                         else if (interfaceType?.startsWith('10G')) activeDropdownSelector = config.dropdownSelectors?.['10G'];

                         if (activeDropdownSelector) {
                             const activeDropdown = stepElement.querySelector(activeDropdownSelector);
                             if(activeDropdown) activeDropdown.style.display = 'block'; // Ensure it's visible
                         }
                     } else if (config.dropdownSelectors?.['default']) {
                         const defaultDropdown = stepElement.querySelector(config.dropdownSelectors['default']);
                          if(defaultDropdown) defaultDropdown.style.display = 'block';
                     }
                     // initializeDropdownBehavior called by showStep will handle the rest
                    break;

                case 'numberInput':
                    const input = stepElement.querySelector(config.inputSelector);
                    if (input) input.value = savedValue;
                    break;

                 case 'finalSubmit': // Same logic as selection for pre-filling
                     const submitItems = stepElement.querySelectorAll(config.selector);
                      submitItems.forEach(item => {
                         let itemValue = getElementValue(item, config);
                          if (config.valueType === 'number') itemValue = parseInt(itemValue, 10);
                         if (String(itemValue) === String(savedValue)) {
                             item.classList.add('selected');
                         }
                     });
                    break;
            }
        }
    });
};

const retrievePreviousQuote = () => {
    // loadApiData() should already have been called on page load.
    // Check if there's actually saved data beyond defaults.
    const savedApiString = localStorage.getItem("api");
    if (!savedApiString || savedApiString === JSON.stringify(defaultApiStructure) || savedApiString === '{}') {
        alert("No saved quote progress found. Please start a new quote.");
        resetApiToDefaults(); // Ensure clean state
        return;
    }

     // loadApiData(); // Called on load, ensure it's up-to-date if needed


    // Determine the last completed step by checking API values against the config
    let lastCompletedStepId = null;
    const stepIds = Object.keys(stepConfig);

    for (let i = stepIds.length - 1; i >= 0; i--) {
        const stepId = stepIds[i];
        const config = stepConfig[stepId];

        // Skip steps that wouldn't have been shown based on current data
        if (config.condition && !config.condition()) {
            continue;
        }

        if (config.apiKey) {
            const value = getApiValue(config.apiKey);
            // Check if value is meaningfully set (not null, undefined, empty string, or specific defaults like 0 for ZTNA users unless intended)
            let isSet = value !== null && value !== undefined && value !== '';
             if (config.apiKey === 'securityQuoteParams.noOfZtnaUsers' && value === 0) {
                 // Only consider 0 users set if ztnaRequired is true
                 isSet = getApiValue('securityQuoteParams.ztnaRequired') === true;
             }


            if (isSet) {
                lastCompletedStepId = stepId;
                console.log(`Resuming: Found set value for ${config.apiKey} at step ${stepId}. Value: ${value}`);
                break; // Found the latest step with data
            }
        } else if (config.type === 'finalSubmit') {
             // If the submit step itself requires a selection that maps to an API key
             const submitValue = getApiValue(config.apiKey); // Check the relevant key
             if (submitValue !== null && submitValue !== undefined) {
                 lastCompletedStepId = stepId;
                 break;
             }
        }
    }

    // Determine the step to *show* (usually the one *after* the last completed one)
    let stepToShow = null;
    if (lastCompletedStepId) {
        const lastConfig = stepConfig[lastCompletedStepId];
        let nextStepId = null;
        // Calculate next step based on the *value* of the last completed step
        const lastValue = getApiValue(lastConfig.apiKey);
        if (typeof lastConfig.navigation.next === 'function') {
            nextStepId = lastConfig.navigation.next(lastValue);
        } else {
            nextStepId = lastConfig.navigation.next;
        }
        stepToShow = nextStepId; // Aim for the step after the last completed one

        // If the calculated next step doesn't exist (end of flow?), show the last completed step itself
        if (!stepToShow || !stepConfig[stepToShow]) {
           stepToShow = lastCompletedStepId;
        }

        // Handle conditional skipping for the target step
        let nextConfig = stepConfig[stepToShow];
        let safetyNet = 0;
        while(nextConfig && nextConfig.condition && !nextConfig.condition() && safetyNet < 10) {
            console.log(`Resume skip: Condition false for ${stepToShow}, trying next.`);
            let skippedValue = getApiValue(nextConfig.apiKey);
            if(typeof nextConfig.navigation.next === 'function') {
                stepToShow = nextConfig.navigation.next(skippedValue);
            } else {
                stepToShow = nextConfig.navigation.next;
            }
            nextConfig = stepConfig[stepToShow];
            safetyNet++;
        }
         if (safetyNet >= 10) {
            console.error("Infinite loop detected finding resume step.");
            stepToShow = Object.keys(stepConfig)[0]; // Fallback to first step
         }


    } else {
        // No steps completed, start from the beginning
        stepToShow = Object.keys(stepConfig)[0];
    }


    if (!stepToShow || !stepConfig[stepToShow]) {
         console.warn("Could not determine step to show, defaulting to first step.");
         stepToShow = Object.keys(stepConfig)[0]; // Fallback
    }


    console.log(`Determined step to resume at: ${stepToShow}`);

    // Hide postcode modal and show quote questions modal
    document.getElementById('addressLookupModal').style.display = 'none';
    const quoteQuestionsModal = document.getElementById('quoteQuestionsModal');
    if (quoteQuestionsModal) {
        quoteQuestionsModal.style.display = 'flex';
    }

    // Map ALL saved data to the UI elements before showing the step
    mapSavedDataToUI();

    // Show the determined step
    showStep(stepToShow);

    // Rebuild history up to the resume point (optional but good for back button)
    stepHistory.length = 0; // Clear history
    let currentNavStep = Object.keys(stepConfig)[0];
    let safetyCount = 0;
    while(currentNavStep && currentNavStep !== stepToShow && safetyCount < 50) {
        const currentNavConfig = stepConfig[currentNavStep];
        if (!currentNavConfig) break;

        // Add to history if not conditional or condition met
        if (!currentNavConfig.condition || currentNavConfig.condition()) {
            stepHistory.push(currentNavStep);
        } else {
             console.log(`Skipping ${currentNavStep} in history rebuild (condition false)`);
        }


        // Find next step based on saved value
        const currentNavValue = getApiValue(currentNavConfig.apiKey);
        let nextNavStepId = null;
        if (typeof currentNavConfig.navigation.next === 'function') {
            nextNavStepId = currentNavConfig.navigation.next(currentNavValue);
        } else {
            nextNavStepId = currentNavConfig.navigation.next;
        }
        currentNavStep = nextNavStepId;
        safetyCount++;
    }
    if (safetyCount >= 50) console.error("History rebuild exceeded safety limit.");
     console.log("Rebuilt history:", stepHistory);

};

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
    loadApiData(); // Load existing data or defaults first

    initializeAddressLookup();

    // Initialize Retrieve Previous Quote Button
    const retrieveButton = document.getElementById("retrievePrevQuote");
    if (retrieveButton) {
        const savedApiString = localStorage.getItem("api");
        let hasProgress = false;
        if (savedApiString && savedApiString !== '{}') {
             try {
                 const savedData = JSON.parse(savedApiString);
                 // Check if it has more than just empty/default locationIdentifier
                 if (Object.keys(savedData.btQuoteParams || {}).some(k => savedData.btQuoteParams[k] !== null && savedData.btQuoteParams[k] !== '') ||
                     Object.keys(savedData.securityQuoteParams || {}).some(k => savedData.securityQuoteParams[k] !== null))
                 {
                      // More robust check: Has *any* key beyond locationIdentifier been set?
                      const checkProgress = (obj) => {
                         if (!obj || typeof obj !== 'object') return false;
                         return Object.keys(obj).some(key => {
                             if (key === 'locationIdentifier') return false; // Ignore location
                             const value = obj[key];
                             if (typeof value === 'object') return checkProgress(value);
                             return value !== null && value !== undefined && value !== '' && value !== 0; // Consider 0 as unset unless specific case like users
                         });
                      }
                     hasProgress = checkProgress(savedData);

                     // Specifically hide if a contract term is already selected (implies completion/near completion)
                      if (savedData?.btQuoteParams?.contractTermMonths > 0) {
                          hasProgress = false; // Don't show retrieve if already submitted/at last step
                          console.log("Hiding retrieve button: Contract term found.");
                      }
                 }


             } catch(e) { console.error("Error checking saved data for progress", e); }
        }


        if (hasProgress) {
            // Show the entire previous quote section, not just the button
            const previousQuoteSection = document.getElementById("previousQuoteSection");
            if (previousQuoteSection) {
                previousQuoteSection.style.display = "block";
            }
            
            retrieveButton.addEventListener("click", retrievePreviousQuote);
        } else {
            // Hide the entire section when no progress is available
            const previousQuoteSection = document.getElementById("previousQuoteSection");
            if (previousQuoteSection) {
                previousQuoteSection.style.display = "none";
            }
        }
    }

    // Note: The actual quote form steps (#quoteQuestionsModal) are only shown
    // after address selection or retrieving a previous quote.
    // showStep() is called within those actions.
});