// Address Lookup Script
let selectedID = null;
let selectedPostcode = null;

// Initialize API object
let api;
try {
  api = JSON.parse(localStorage.getItem('api')) || {
    locationIdentifier: {
      postcode: null,
    },
    btQuoteParams: {
      serviceType: null,
      preferredIpBackbone: null,
      circuitInterface: null,
      circuitBandwidth: null,
      numberOfIpAddresses: null,
      circuitTwoBandwidth: null,
      dualInternetConfig: null,
    },
    securityQuoteParams: {
      secureIpDelivery: null,
      ztnaRequired: null,
      noOfZtnaUsers: 0,
      threatPreventionRequired: null,
      casbRequired: null,
      dlpRequired: null,
      rbiRequired: null,
    },
  };
} catch (error) {
  console.error("Error parsing API from localStorage:", error);
}

// Function to reset API values to default
const resetApiToDefaults = () => {
  api = {
    locationIdentifier: {
      postcode: null,
    },
    btQuoteParams: {
      serviceType: null,
      preferredIpBackbone: null,
      circuitInterface: null,
      circuitBandwidth: null,
      numberOfIpAddresses: null,
      circuitTwoBandwidth: null,
      dualInternetConfig: null,
    },
    securityQuoteParams: {
      secureIpDelivery: null,
      ztnaRequired: null,
      noOfZtnaUsers: 0,
      threatPreventionRequired: null,
      casbRequired: null,
      dlpRequired: null,
      rbiRequired: null,
    },
  };
  localStorage.setItem('api', JSON.stringify(api));
};

// Normalize postcode
const normalizePostcode = (postcode) => postcode.replace(/\s+/g, '').toUpperCase();

// Validate UK postcode
const isValidUKPostcode = (postcode) => /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i.test(postcode);

// Fetch addresses from the API
const fetchAddressesFromAPI = async (postcode) => {
  const url = `https://conencted-networks-quoting-api.vercel.app/api/addresses?postcode=${encodeURIComponent(postcode)}`;
  const options = { method: 'GET' };

  const loader = document.getElementById('addressLookupLoader');
  loader.style.display = 'flex';

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    loader.style.display = 'none';

    if (response.ok) {
      return data;
    } else {
      console.error("Error fetching addresses:", data);
      displayError("Failed to fetch addresses. Please try again later.");
      return [];
    }
  } catch (error) {
    loader.style.display = 'none';
    console.error("Error fetching addresses:", error);
    displayError("An error occurred while fetching addresses. Please try again.");
    return [];
  }
};

// Display results
const displayResults = (addresses) => {
  const resultsContainer = document.getElementById('postcodeResults');
  const templateItem = document.getElementById('postcodeResultItem');

  if (addresses.length === 0) {
    displayError("We couldn't find your address. Please confirm your postcode and try again.");
    return;
  }

  resultsContainer.querySelectorAll('.dynamic-item').forEach((item) => item.remove());

  addresses.forEach((address) => {
    const resultItem = templateItem.cloneNode(true);
    resultItem.classList.add('dynamic-item');
    resultItem.textContent = address.fullAddress;
    resultItem.dataset.id = address.id;
    resultItem.style.display = 'block';

    resultItem.addEventListener('click', () => {
      selectedID = address.id;
      selectedPostcode = address.postcode;

      // Update API object
      api.locationIdentifier.postcode = selectedPostcode;
      api.locationIdentifier.id = selectedID;

      // Save updated API object to localStorage
      localStorage.setItem('api', JSON.stringify(api));

      // Hide address lookup modal and show quote questions modal
      document.getElementById('addressLookupModal').style.display = 'none';
      const quoteQuestionsModal = document.getElementById('quoteQuestionsModal');
      if (quoteQuestionsModal) {
        quoteQuestionsModal.style.display = 'flex';
      }
    });

    resultsContainer.appendChild(resultItem);
  });

  openModal();
};

// Display error
const displayError = (message) => {
  const errorContainer = document.getElementById('addressLookUpError');
  errorContainer.textContent = message;
  errorContainer.style.display = 'block';
  errorContainer.style.color = 'red';
};

// Open modal
const openModal = () => {
  const modal = document.getElementById('addressLookupModal');
  modal.style.opacity = 0;
  modal.style.display = 'flex';
  setTimeout(() => {
    modal.style.opacity = 1;
  }, 0);
};

// Initialize Address Lookup
document.addEventListener("DOMContentLoaded", () => {
  const button = document.getElementById('lookupAddressButton');
  const postcodeInput = document.getElementById('userPostcode');

  // Function to handle postcode lookup
  const handlePostcodeLookup = async () => {
    const postcode = normalizePostcode(postcodeInput.value.trim());

    if (!postcode) {
      displayError('Please enter a postcode.');
      return;
    }

    if (!isValidUKPostcode(postcode)) {
      displayError('Please enter a valid postcode.');
      return;
    }

    // Reset API object to default values
    resetApiToDefaults();

    document.getElementById('addressLookUpError').style.display = 'none';

    const results = await fetchAddressesFromAPI(postcode);
    if (results.length > 0) {
      displayResults(results);
    } else {
      displayError("We couldn't find your address. Please confirm your postcode and try again.");
    }
  };

  // Add click event to the button
  button.addEventListener('click', handlePostcodeLookup);

  // Add keydown event to the input field for the Enter key
  postcodeInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault(); // Prevent default form submission or page refresh
      handlePostcodeLookup(); // Call the postcode lookup function
    }
  });
});

// Check if backup quote exists
document.addEventListener("DOMContentLoaded", () => {
  const retrieveButton = document.getElementById("retrievePrevQuote");

  if (retrieveButton) {
    // Check if a previous quote exists in localStorage
    const savedApi = localStorage.getItem("api");
    let apiData = null;

    try {
      apiData = savedApi ? JSON.parse(savedApi) : null;
    } catch (error) {
      console.error("Error parsing saved API:", error);
    }

    // Hide button if contractTermMonths has a valid value greater than 0
    if (apiData?.btQuoteParams?.contractTermMonths > 0) {
      retrieveButton.style.display = "none"; // Hide button
    } else if (savedApi && savedApi !== "{}") {
      retrieveButton.style.display = "block"; // Show button
    } else {
      retrieveButton.style.display = "none"; // Hide button
    }

    // Attach click event listener if the button is visible
    if (retrieveButton.style.display === "block") {
      retrieveButton.addEventListener("click", retrievePreviousQuote);
    }
  }
});

// Remove empty values from API body
const removeEmptyValues = (obj) => {
  return Object.entries(obj)
    .filter(([_, v]) => v !== null && v !== undefined && v !== "")
    .reduce(
      (acc, [key, value]) => ({
        ...acc,
        [key]: value && typeof value === "object" ? removeEmptyValues(value) : value,
      }),
      {}
    );
};

// Retrieve previous quote progress from localStorage
const retrievePreviousQuote = () => {
  // Retrieve API data from localStorage
  let savedApi = localStorage.getItem("api");
  if (!savedApi) {
    alert("No saved quote found. Please start a new quote.");
    return;
  }

  try {
    savedApi = JSON.parse(savedApi);

    // Update global API object
    api = savedApi;

    // Determine the current step based on saved API data
    let currentStep = "quoteServiceType"; // Default to the first step

    if (api.btQuoteParams?.serviceType) currentStep = "quotePreferredIpAccess";
    if (api.btQuoteParams?.preferredIpBackbone) currentStep = "quoteEtherwayBandwidth";
    if (api.btQuoteParams?.circuitInterface) currentStep = "quoteEtherflowBandwidth";
    if (api.btQuoteParams?.dualInternetConfig) currentStep = "quoteConfiguration";
    if (api.btQuoteParams?.preferredDivereseIpBackbone) currentStep = "quoteDiverseIpNetwork";
    if (api.btQuoteParams?.circuitTwoBandwidth) currentStep = "quoteCircuit2Bandwidth";
    if (api.btQuoteParams?.numberOfIpAddresses) currentStep = "quoteNumberOfIPs";
    if (api.securityQuoteParams?.secureIpDelivery !== null) currentStep = "quoteSecureIpDelivery";
    if (api.securityQuoteParams?.ztnaRequired !== null) currentStep = "quoteZTNARequired";
    if (api.securityQuoteParams?.noOfZtnaUsers) currentStep = "quoteZTNAUsers";
    if (api.securityQuoteParams?.threatPreventionRequired !== null) currentStep = "quoteThreatPrevention";
    if (api.securityQuoteParams?.casbRequired !== null) currentStep = "quoteCASBRequired";
    if (api.securityQuoteParams?.dlpRequired !== null) currentStep = "quoteDLPRequired";
    if (api.securityQuoteParams?.rbiRequired !== null) currentStep = "quoteRBIRequired";
    if (api.btQuoteParams?.contractTermMonths) currentStep = "quoteContractTerms";

    // Map retrieved data to UI
    mapSavedDataToUI(api);

    // Hide postcode modal and navigate to the last saved step
    const modal = document.getElementById("addressLookupModal");
    if (modal) {
      modal.style.display = "none";
    }

    // Show quote questions modal
    const quoteQuestionsModal = document.getElementById("quoteQuestionsModal");
    if (quoteQuestionsModal) {
      quoteQuestionsModal.style.display = "flex";
    }

showStep(currentStep);

} catch (error) {
    console.error("An error occurred while retrieving your saved quote. Please start a new quote.");
}
};

// Map saved API data to UI elements
const mapSavedDataToUI = (savedApi) => {
  // Service Type
  if (savedApi.btQuoteParams?.serviceType) {
    document
      .querySelector(`[data-value="${savedApi.btQuoteParams.serviceType}"]`)
      ?.classList.add("selected");
  }

  // Preferred IP Backbone
  if (savedApi.btQuoteParams?.preferredIpBackbone) {
    document
      .querySelector(`#quotePreferredIpAccess [data-value="${savedApi.btQuoteParams.preferredIpBackbone}"]`)
      ?.classList.add("selected");
  }

  // Circuit Interface
  if (savedApi.btQuoteParams?.circuitInterface) {
    document
      .querySelector(`[data-value="${savedApi.btQuoteParams.circuitInterface}"]`)
      ?.classList.add("selected");
  }

  // Circuit Bandwidth
  if (savedApi.btQuoteParams?.circuitBandwidth) {
    document
      .querySelector(`#quoteEtherflowBandwidth [data-value="${savedApi.btQuoteParams.circuitBandwidth}"]`)
      ?.classList.add("selected");
  }

  // Dual Internet Config
  if (savedApi.btQuoteParams?.dualInternetConfig) {
    document
      .querySelector(`[data-value="${savedApi.btQuoteParams.dualInternetConfig}"]`)
      ?.classList.add("selected");
  }

  // Preferred Diverse IP Backbone (for Dual Internet)
  if (savedApi.btQuoteParams?.preferredDivereseIpBackbone) {
    document
      .querySelector(`#quoteDiverseIpNetwork [data-value="${savedApi.btQuoteParams.preferredDivereseIpBackbone}"]`)
      ?.classList.add("selected");
  }

  // Circuit Two Bandwidth (for Dual Internet)
  if (savedApi.btQuoteParams?.circuitTwoBandwidth) {
    document
      .querySelector(`#quoteCircuit2Bandwidth [data-value="${savedApi.btQuoteParams.circuitTwoBandwidth}"]`)
      ?.classList.add("selected");
  }

  // Number of IP Addresses
  if (savedApi.btQuoteParams?.numberOfIpAddresses) {
    document
      .querySelector(`#quoteNumberOfIPs [data-value="${savedApi.btQuoteParams.numberOfIpAddresses}"]`)
      ?.classList.add("selected");
  }

  // Secure IP Delivery
  if (savedApi.securityQuoteParams?.secureIpDelivery !== null) {
    const secureButtonId = savedApi.securityQuoteParams.secureIpDelivery
      ? "quoteSecureYes"
      : "quoteSecureNo";
    document.getElementById(secureButtonId)?.classList.add("selected");
  }

  // ZTNA Required
  if (savedApi.securityQuoteParams?.ztnaRequired !== null) {
    const ztnaButtonId = savedApi.securityQuoteParams.ztnaRequired
      ? "quoteZTNAYes"
      : "quoteZTNANo";
    document.getElementById(ztnaButtonId)?.classList.add("selected");
  }

  // Number of ZTNA Users
  if (savedApi.securityQuoteParams?.noOfZtnaUsers) {
    const inputField = document.getElementById("quoteZTNAUsersInput-2");
    if (inputField) {
      inputField.value = savedApi.securityQuoteParams.noOfZtnaUsers;
    }
  }

  // Threat Prevention Required
  if (savedApi.securityQuoteParams?.threatPreventionRequired !== null) {
    const threatButtonId = savedApi.securityQuoteParams.threatPreventionRequired
      ? "quoteThreatYes"
      : "quoteThreatNo";
    document.getElementById(threatButtonId)?.classList.add("selected");
  }

  // CASB Required
  if (savedApi.securityQuoteParams?.casbRequired !== null) {
    const casbButtonId = savedApi.securityQuoteParams.casbRequired
      ? "quoteCASBYes"
      : "quoteCASBNo";
    document.getElementById(casbButtonId)?.classList.add("selected");
  }

  // DLP Required
  if (savedApi.securityQuoteParams?.dlpRequired !== null) {
    const dlpButtonId = savedApi.securityQuoteParams.dlpRequired
      ? "quoteDLPYes"
      : "quoteDLPNo";
    document.getElementById(dlpButtonId)?.classList.add("selected");
  }

  // RBI Required
  if (savedApi.securityQuoteParams?.rbiRequired !== null) {
    const rbiButtonId = savedApi.securityQuoteParams.rbiRequired
      ? "quoteRBIYes"
      : "quoteRBINo";
    document.getElementById(rbiButtonId)?.classList.add("selected");
  }

  // Contract Term Months
  if (savedApi.btQuoteParams?.contractTermMonths) {
    const contractCard = document.querySelector(
      `#quoteContractTerms .quotequestionscarditem .quotequestionsitemtitle:contains("${savedApi.btQuoteParams.contractTermMonths}")`
    );
    if (contractCard) {
      contractCard.classList.add("selected");
    }
  }
};

// Attach the function to the "Retrieve Previous Quote" button
document.addEventListener("DOMContentLoaded", () => {
  const retrieveButton = document.getElementById("retrievePrevQuote");
  if (retrieveButton) {
    retrieveButton.addEventListener("click", retrievePreviousQuote);
  }
});

function showStep(stepId) {
  document.querySelectorAll(".quotequestionsstep").forEach((step) => {
    step.style.display = "none";
  });

  const stepToShow = document.getElementById(stepId);
  if (stepToShow) {
    stepToShow.style.display = "block";

    // Enable "Next" and "Prev" buttons dynamically
    const nextButton = document.getElementById(`${stepId}Next`);
    const prevButton = document.getElementById(`${stepId}Prev`);

    // Check if there's already a selection for the step
    const selectedItem = stepToShow.querySelector(".selected");

    if (nextButton) {
      if (selectedItem) {
        nextButton.classList.remove("off"); // Enable "Next" if something is selected
      } else {
        nextButton.classList.add("off"); // Disable "Next" if nothing is selected
      }
    }

    if (prevButton) {
      prevButton.classList.remove("off"); // Always enable "Prev"
    }

    console.log(`Showing step: ${stepId}`);
    manageNavigationButtons(stepId);
  } else {
    console.error(`Step with ID '${stepId}' not found.`);
  }
}

function manageNavigationButtons(stepId) {
  document.querySelectorAll(".quotestepbutton").forEach((button) => {
    button.style.display = "none";
  });

  const prevButton = document.getElementById(`${stepId}Prev`);
  if (prevButton) {
    prevButton.style.display = "block";
    prevButton.classList.remove("off");
  }

  const nextButton = document.getElementById(`${stepId}Next`);
  if (nextButton) {
    nextButton.style.display = "block";
  }
}

function enableButton(buttonId) {
  const button = document.getElementById(buttonId);
  if (button) button.classList.remove("off");
}

function disableButton(buttonId) {
  const button = document.getElementById(buttonId);
  if (button) button.classList.add("off");
}

function handleSelection(event, key, valueKey = null) {
  let target = event.target;
  if (!target.hasAttribute("data-value")) {
    target = target.closest("[data-value]");
  }
  if (!target) return;

  const parent = target.parentElement;
  const selectedValue = valueKey ? target.getAttribute(valueKey) : target.textContent.trim();

  parent.querySelectorAll(".selected").forEach((item) => item.classList.remove("selected"));
  target.classList.add("selected");

  if (key.includes(".")) {
    const keys = key.split(".");
    api[keys[0]][keys[1]] = selectedValue;
  } else {
    api[key] = selectedValue;
  }

  localStorage.setItem("api", JSON.stringify(api));
  localStorage.setItem("quoteBackup", JSON.stringify(api));
  
  console.log("Updated API object:", api);
}

function initializeDropdown(dropdownId, key, nextButtonId) {
  const dropdownToggle = document.querySelector(`#${dropdownId} .quotequestionsdropdowntoggle`);
  const dropdownList = document.querySelector(`#${dropdownId} .quotequestionsdropdownlist`);
  const dropdownLinks = dropdownList.querySelectorAll(".quotequestionsdropdownlink");

  dropdownToggle.addEventListener("click", () => {
    const isDropdownOpen = dropdownToggle.getAttribute("aria-expanded") === "true";
    dropdownToggle.setAttribute("aria-expanded", !isDropdownOpen);
    dropdownList.style.display = isDropdownOpen ? "none" : "block";
  });

  dropdownLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const selectedValue = link.textContent.trim();
      const toggleTextContainer = dropdownToggle.querySelector("div:nth-child(2)");
      if (toggleTextContainer) {
        toggleTextContainer.textContent = selectedValue;
      }

      dropdownLinks.forEach((l) => l.classList.remove("selected"));
      link.classList.add("selected");

      if (key.includes(".")) {
        const keys = key.split(".");
        api[keys[0]][keys[1]] = selectedValue;
      } else {
        api[key] = selectedValue;
      }

      localStorage.setItem("api", JSON.stringify(api));
      localStorage.setItem("quoteBackup", JSON.stringify(api));
      console.log("Updated API object:", api);

      enableButton(nextButtonId);

      dropdownList.style.display = "none";
      dropdownToggle.setAttribute("aria-expanded", "false");
    });
  });

  // Ensure "Next" button is enabled if there's a selection
  const selectedItem = document.querySelector(`#${dropdownId} .selected`);
  if (selectedItem) {
    enableButton(nextButtonId);
  }
}

function initializeSelections(stepId, key, nextButtonId) {
  document.querySelectorAll(`#${stepId} [data-value]`).forEach((el) => {
    el.addEventListener("click", (e) => {
      handleSelection(e, key, "data-value");
      enableButton(nextButtonId);
    });
  });
}

function initializeNavigation(currentStepId, nextStepId, prevStepId = null) {
  if (prevStepId) {
    const prevButton = document.getElementById(`${currentStepId}Prev`);
    if (prevButton) {
      prevButton.addEventListener("click", () => {
        clearApiValueForStep(currentStepId);
        showStep(prevStepId);
      });
    }
  }
}

function clearApiValueForStep(stepId) {
  switch (stepId) {
    case "quoteServiceType":
      api.btQuoteParams.serviceType = null;
      break;
    case "quotePreferredIpAccess":
      api.btQuoteParams.preferredIpBackbone = null;
      break;
    case "quoteEtherwayBandwidth":
      api.btQuoteParams.circuitInterface = null;
      break;
    case "quoteEtherflowBandwidth":
      api.btQuoteParams.circuitBandwidth = null;
      break;
    case "quoteConfiguration":
      api.btQuoteParams.dualInternetConfig = null;
      break;
    case "quoteDiverseIpNetwork":
      api.btQuoteParams.preferredIpBackbone = null;
      break;
    case "quoteCircuit2Bandwidth":
      api.btQuoteParams.circuitTwoBandwidth = null;
      break;
    case "quoteNumberOfIPs":
      api.btQuoteParams.numberOfIpAddresses = null;
      break;
    case "quoteSecureIpDelivery":
      api.securityQuoteParams.secureIpDelivery = null;
      break;
    case "quoteZTNARequired":
      api.securityQuoteParams.ztnaRequired = null;
      break;
    case "quoteZTNAUsers":
      api.securityQuoteParams.noOfZtnaUsers = 0;
      break;
    case "quoteThreatPrevention":
      api.securityQuoteParams.threatPreventionRequired = null;
      break;
    case "quoteCASBRequired":
      api.securityQuoteParams.casbRequired = null;
      break;
    case "quoteDLPRequired":
      api.securityQuoteParams.dlpRequired = null;
      break;
    case "quoteRBIRequired":
      api.securityQuoteParams.rbiRequired = null;
      break;
    case "quoteContractTerms":
      api.contractTermMonths = null;
      break;
    default:
      console.error(`No API value to clear for step ID '${stepId}'.`);
  }

  localStorage.setItem("api", JSON.stringify(api));
  localStorage.setItem("quoteBackup", JSON.stringify(api));
  console.log(`Cleared API value for step: ${stepId}`, api);
}

// Initialize the Form
function initializeForm() {
  initializeStep1();
  initializeStep2PreferredIp();
  initializeStep3Interface();
  initializeStep4CircuitBandwidth();
  initializeStep5ActiveConfig();
  initializeStep6PreferredIpDual();
  initializeStep7Circuit2Bandwidth();
  initializeStep8NumberOfIPs();
  initializeStep9SecureIpDelivery();
  initializeStep10ZTNARequired();
  initializeStep11ZTNAUsers();
  initializeStep12ThreatPrevention();
  initializeStep13CASBRequired();
  initializeStep14DLPRequired();
  initializeStep15RBIRequired();
  initializeStep16ContractTerms();

  // Show the first step
  showStep("quoteServiceType");
}

// Step 1: Service Type Selection
function initializeStep1() {
  initializeSelections("quoteServiceType", "btQuoteParams.serviceType", "quoteServiceTypeNext");

  const nextButtonStep1 = document.getElementById("quoteServiceTypeNext");
  if (nextButtonStep1) {
    nextButtonStep1.addEventListener("click", () => {
      const serviceType = api.btQuoteParams.serviceType;
      console.log("Service Type selected:", serviceType);
      if (serviceType === "single") {
        showStep("quotePreferredIpAccess");
      } else if (serviceType === "dual") {
        showStep("quoteEtherwayBandwidth");
      } else {
        console.error("Service Type is not set correctly:", serviceType);
      }
    });
  }

  // Navigation Buttons
  initializeNavigation("quoteServiceType", null, null);
}

// Step 2: Preferred IP Access (For Single Internet)
function initializeStep2PreferredIp() {
  initializeSelections("quotePreferredIpAccess", "btQuoteParams.preferredIpBackbone", "quotePreferredIpAccessNext");

  const nextButtonStep2 = document.getElementById("quotePreferredIpAccessNext");
  if (nextButtonStep2) {
    nextButtonStep2.addEventListener("click", () => {
      showStep("quoteEtherwayBandwidth");
    });
  }

  // Navigation Buttons
  initializeNavigation("quotePreferredIpAccess", "quoteEtherwayBandwidth", "quoteServiceType");
}

// Step 3: Select Etherway Bandwidth
function initializeStep3Interface() {
  // Handle selection for interface options (1Gbit and 10Gbit)
  document.getElementById("quote1GbitButton").addEventListener("click", () => {
    // Show 1Gbit options
    document.getElementById("quote1GbitOptions").style.display = "flex";
    document.getElementById("quote10GbitOptions").style.display = "none";
    api.btQuoteParams.circuitInterface = ""; // Reset value
    // Remove selection from 10Gbit options
    document.querySelectorAll("#quote10GbitOptions .selected").forEach((el) => el.classList.remove("selected"));
  });

  document.getElementById("quote10GbitButton").addEventListener("click", () => {
    // Show 10Gbit options
    document.getElementById("quote10GbitOptions").style.display = "flex";
    document.getElementById("quote1GbitOptions").style.display = "none";
    api.btQuoteParams.circuitInterface = ""; // Reset value
    // Remove selection from 1Gbit options
    document.querySelectorAll("#quote1GbitOptions .selected").forEach((el) => el.classList.remove("selected"));
  });

  // Initialize selections for 1Gbit and 10Gbit options
  initializeSelections("quote1GbitOptions", "btQuoteParams.circuitInterface", "quoteEtherwayBandwidthNext");
  initializeSelections("quote10GbitOptions", "btQuoteParams.circuitInterface", "quoteEtherwayBandwidthNext");

  const nextButtonStep3 = document.getElementById("quoteEtherwayBandwidthNext");
  if (nextButtonStep3) {
    nextButtonStep3.addEventListener("click", () => {
      showStep("quoteEtherflowBandwidth");
    });
  }

  // Set up navigation buttons
document.addEventListener("DOMContentLoaded", () => {
  const prevButton = document.getElementById("quoteEtherwayBandwidthPrev");
  if (prevButton) {
    prevButton.addEventListener("click", () => {
      console.log("Prev button clicked. Current serviceType:", api.btQuoteParams.serviceType);
      if (api.btQuoteParams.serviceType === "dual") {
        showStep("quoteServiceType"); // Go back to service type for "dual"
      } else if (api.btQuoteParams.serviceType === "single") {
        showStep("quotePreferredIpAccess"); // Go back to preferred IP access for "single"
      } else {
        console.error("Invalid serviceType:", api.btQuoteParams.serviceType);
      }
    });
  } else {
    console.error("Prev button not found in DOM.");
  }
});
  initializeNavigation("quoteEtherwayBandwidth", "quoteEtherflowBandwidth", "quotePreferredIpAccess");
}

// Step 4: Etherflow Bandwidth (Circuit Bandwidth)
function initializeStep4CircuitBandwidth() {
  // Initialize dropdowns
  initializeDropdown("quoteEtherflow1GbitDropdown", "btQuoteParams.circuitBandwidth", "quoteEtherflowBandwidthNext");
  initializeDropdown("quoteEtherflow10GbitDropdown", "btQuoteParams.circuitBandwidth", "quoteEtherflowBandwidthNext");

  const nextButtonStep4 = document.getElementById("quoteEtherflowBandwidthNext");
  if (nextButtonStep4) {
    nextButtonStep4.addEventListener("click", () => {
      const serviceType = api.btQuoteParams.serviceType;
      if (serviceType === "dual") {
        showStep("quoteConfiguration");
      } else {
        showStep("quoteNumberOfIPs");
      }
    });
  }

  // When showing this step, display the appropriate dropdown
  const originalShowStep = showStep;
  showStep = function (stepId) {
    if (stepId === "quoteEtherflowBandwidth") {
      // Hide both dropdowns initially
      document.getElementById("quoteEtherflow1GbitDropdown").style.display = "none";
      document.getElementById("quoteEtherflow10GbitDropdown").style.display = "none";

      // Show the appropriate dropdown based on circuitInterfaceType
      if (api.btQuoteParams.circuitInterface.startsWith("1000B")) {
        document.getElementById("quoteEtherflow1GbitDropdown").style.display = "block";
      } else if (api.btQuoteParams.circuitInterface.startsWith("10G")) {
        document.getElementById("quoteEtherflow10GbitDropdown").style.display = "block";
      } else {
        console.error("Circuit Interface Type not set correctly:", api.btQuoteParams.circuitInterfaceType);
      }
    }
    // Call the original showStep function
    originalShowStep(stepId);
  };

  // Navigation Buttons
  initializeNavigation("quoteEtherflowBandwidth", "nextStep", "quoteEtherwayBandwidth");
}

// Helper Functions
function initializeDropdown(dropdownId, key, nextButtonId) {
  const dropdownToggle = document.querySelector(`#${dropdownId} .quotequestionsdropdowntoggle`);
  const dropdownList = document.querySelector(`#${dropdownId} .quotequestionsdropdownlist`);
  const dropdownLinks = dropdownList.querySelectorAll(".quotequestionsdropdownlink");

  dropdownToggle.addEventListener("click", () => {
    dropdownList.style.display = dropdownList.style.display === "block" ? "none" : "block";
  });

  dropdownLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const selectedValue = link.textContent.trim();
      dropdownToggle.querySelector("div:nth-child(2)").textContent = selectedValue; // Update the toggle text

      // Remove selected class from all links
      dropdownLinks.forEach((l) => l.classList.remove("selected"));
      link.classList.add("selected");

      // Update the API object
      if (key.includes(".")) {
        const keys = key.split(".");
        api[keys[0]][keys[1]] = selectedValue;
      } else {
        api[key] = selectedValue;
      }

      // Save the updated api object to localStorage
      localStorage.setItem('api', JSON.stringify(api));

      console.log("Updated API object:", api); // Debugging output

      enableButton(nextButtonId);

      // Close the dropdown
      dropdownList.style.display = "none";
    });
  });
}

// Step 5: Configuration (Active / Active or Active / Passive)
function initializeStep5ActiveConfig() {
  initializeSelections("quoteConfiguration", "btQuoteParams.dualInternetConfig", "quoteConfigurationNext");

  const nextButtonStep5 = document.getElementById("quoteConfigurationNext");
  if (nextButtonStep5) {
    nextButtonStep5.addEventListener("click", () => {
      const config = api.btQuoteParams.dualInternetConfig;
      if (config === "Active / Passive") {
        showStep("quoteNumberOfIPs");
      } else if (config === "Active / Active") {
        showStep("quoteDiverseIpNetwork");
      } else {
        console.error("Dual Internet Config is not set correctly:", config);
      }
    });
  }

  // Navigation Buttons
  initializeNavigation("quoteConfiguration", "nextStep", "quoteEtherflowBandwidth");
}

// Step 6: Preferred Diverse IP Network (For Active / Active)
function initializeStep6PreferredIpDual() {
  initializeSelections("quoteDiverseIpNetwork", "btQuoteParams.preferredIpBackbone", "quoteDiverseIpNetworkNext");

  const nextButtonStep6 = document.getElementById("quoteDiverseIpNetworkNext");
  if (nextButtonStep6) {
    nextButtonStep6.addEventListener("click", () => {
      showStep("quoteCircuit2Bandwidth");
    });
  }

  // Navigation Buttons
  initializeNavigation("quoteDiverseIpNetwork", "quoteCircuit2Bandwidth", "quoteConfiguration");
}

// Step 7: Circuit 2 Bandwidth
function initializeStep7Circuit2Bandwidth() {
  // Initialize dropdowns
  initializeDropdown("quoteCircuit21GbitDropdown", "btQuoteParams.circuitTwoBandwidth", "quoteCircuit2BandwidthNext");
  initializeDropdown("quoteCircuit210GbitDropdown", "btQuoteParams.circuitTwoBandwidth", "quoteCircuit2BandwidthNext");

  const nextButtonStep7 = document.getElementById("quoteCircuit2BandwidthNext");
  if (nextButtonStep7) {
    nextButtonStep7.addEventListener("click", () => {
      showStep("quoteNumberOfIPs");
    });
  }

  // When showing this step, display the appropriate dropdown
  const originalShowStep = showStep;
  showStep = function (stepId) {
    if (stepId === "quoteCircuit2Bandwidth") {
      // Hide both dropdowns initially
      document.getElementById("quoteCircuit21GbitDropdown").style.display = "none";
      document.getElementById("quoteCircuit210GbitDropdown").style.display = "none";

      // Show the appropriate dropdown based on circuitInterface
      if (api.btQuoteParams.circuitInterface.startsWith("1000B")) {
        document.getElementById("quoteCircuit21GbitDropdown").style.display = "block";
      } else if (api.btQuoteParams.circuitInterface.startsWith("10G")) {
        document.getElementById("quoteCircuit210GbitDropdown").style.display = "block";
      } else {
        console.error("Circuit Two Interface Type not set correctly:", api.btQuoteParams.circuitInterface);
      }
    }
    // Call the original showStep function
    originalShowStep(stepId);
  };

  // Navigation Buttons
  initializeNavigation("quoteCircuit2Bandwidth", "quoteNumberOfIPs", "quoteDiverseIpNetwork");
}

// Step 8 Select Number of IPs
function initializeStep8NumberOfIPs() {
  initializeDropdown("quoteNumberOfIPAddresses", "btQuoteParams.numberOfIpAddresses", "quoteNumberOfIPsNext");

  const nextButtonStep8 = document.getElementById("quoteNumberOfIPsNext");
  if (nextButtonStep8) {
    nextButtonStep8.addEventListener("click", () => {
      showStep("quoteSecureIpDelivery"); // Navigate to the Secure IP Delivery step
    });
  }

  // Set up navigation buttons
  const prevButton = document.getElementById("quoteNumberOfIPsPrev");
  if (prevButton) {
    prevButton.addEventListener("click", () => {
      const serviceType = api.btQuoteParams.serviceType;
      const dualConfig = api.btQuoteParams.dualInternetConfig;

      if (serviceType === "dual") {
        if (dualConfig === "Active / Active") {
          showStep("quoteCircuit2Bandwidth"); // Navigate to Circuit 2 Bandwidth for Active / Active
        } else if (dualConfig === "Active / Passive") {
          showStep("quoteConfiguration"); // Navigate to Configuration for Active / Passive
        } else {
          console.error("Invalid dual internet configuration:", dualConfig);
        }
      } else if (serviceType === "single") {
        showStep("quoteEtherflowBandwidth"); // Navigate to Etherflow Bandwidth for Single Internet
      } else {
        console.error("Invalid service type:", serviceType);
      }
    });
  }

  initializeNavigation("quoteNumberOfIPs", "quoteSecureIpDelivery", null);
}

// Step 9: Secure IP Delivery
function initializeStep9SecureIpDelivery() {
  // Elements
  const secureYesButton = document.getElementById("quoteSecureYes");
  const secureNoButton = document.getElementById("quoteSecureNo");
  const nextButton = document.getElementById("quoteSecureIpDeliveryNext");

  // Add click event listeners for "Yes" and "No" buttons
  [secureYesButton, secureNoButton].forEach((button) => {
    button.addEventListener("click", (e) => {
      // Remove "selected" from all options
      document
        .querySelectorAll("#quoteSecureIpDelivery .quotequestionscarditem")
        .forEach((item) => item.classList.remove("selected"));

      // Add "selected" to the clicked option
      button.classList.add("selected");

      // Update the API object with the selection
      const selectedValue = button.id === "quoteSecureYes" ? true : false;
      api.securityQuoteParams = api.securityQuoteParams || {}; // Ensure nested object exists
      api.securityQuoteParams.secureIpDelivery = selectedValue;

      // Save to localStorage
      localStorage.setItem("api", JSON.stringify(api));
      localStorage.setItem("quoteBackup", JSON.stringify(api));
      console.log("Updated API object:", api); // Debugging output

      // Enable the "Next" button
      nextButton.classList.remove("off");
    });
  });

  // Add click event listener for the "Next" button
  nextButton.addEventListener("click", () => {
    if (!nextButton.classList.contains("off")) {
      const secureIpValue = api.securityQuoteParams?.secureIpDelivery;

      // Navigate based on selection
      if (secureIpValue === true) {
        showStep("quoteZTNARequired"); // Go to ZTNA question step
      } else if (secureIpValue === false) {
        showStep("quoteContractTerms"); // Skip to Contract Terms
      }
    }
  });

  // Add "Previous" button functionality
  const prevButton = document.getElementById("quoteSecureIpDeliveryPrev");
  if (prevButton) {
    prevButton.addEventListener("click", () => {
      showStep("quoteNumberOfIPs"); // Previous step logic
    });
  }
  initializeNavigation("quoteSecureIpDelivery", "quoteZTNARequired", "quoteNumberOfIPs");
}

// Step 10: ZTNA Required
function initializeStep10ZTNARequired() {
  const ztnaYesButton = document.getElementById("quoteZTNAYes");
  const ztnaNoButton = document.getElementById("quoteZTNANo");
  const nextButton = document.getElementById("quoteZTNARequiredNext");

  [ztnaYesButton, ztnaNoButton].forEach((button) => {
    button.addEventListener("click", (e) => {
      document
        .querySelectorAll("#quoteZTNARequired .quotequestionscarditem")
        .forEach((item) => item.classList.remove("selected"));

      button.classList.add("selected");

      const selectedValue = button.id === "quoteZTNAYes" ? true : false;
      api.securityQuoteParams = api.securityQuoteParams || {};
      api.securityQuoteParams.ztnaRequired = selectedValue;

      localStorage.setItem("api", JSON.stringify(api));
      localStorage.setItem("quoteBackup", JSON.stringify(api));
      console.log("Updated API object:", api);

      nextButton.classList.remove("off");
    });
  });

  nextButton.addEventListener("click", () => {
    if (!nextButton.classList.contains("off")) {
      const ztnaRequired = api.securityQuoteParams?.ztnaRequired;

      if (ztnaRequired === true) {
        showStep("quoteZTNAUsers"); // Proceed to ZTNA Users
      } else {
        showStep("quoteThreatPrevention"); // Skip to Threat Prevention
      }
    }
  });

  const prevButton = document.getElementById("quoteZTNARequiredPrev");
  if (prevButton) {
    prevButton.addEventListener("click", () => {
      showStep("quoteSecureIpDelivery");
    });
  }
  initializeNavigation("quoteZTNARequired", "quoteZTNAUsers", "quoteSecureIpDelivery");
}

function initializeStep11ZTNAUsers() {
  const inputField = document.getElementById("quoteZTNAUsersInput-2");
  const nextButton = document.getElementById("quoteZTNAUsersNext");

  inputField.addEventListener("input", (e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0) {
      api.securityQuoteParams = api.securityQuoteParams || {};
      api.securityQuoteParams.noOfZtnaUsers = value;

      localStorage.setItem("api", JSON.stringify(api));
      localStorage.setItem("quoteBackup", JSON.stringify(api));
      console.log("Updated API object:", api);

      nextButton.classList.remove("off");
    } else {
      nextButton.classList.add("off");
    }
  });

  nextButton.addEventListener("click", () => {
    if (!nextButton.classList.contains("off")) {
      showStep("quoteThreatPrevention");
    }
  });

  const prevButton = document.getElementById("quoteZTNAUsersPrev");
  if (prevButton) {
    prevButton.addEventListener("click", () => {
      showStep("quoteZTNARequired");
    });
  }
  initializeNavigation("quoteZTNAUsers", "quoteThreatPrevention", "quoteZTNARequired");
}

// Step 12: Threat Prevention
function initializeStep12ThreatPrevention() {
  const threatYesButton = document.getElementById("quoteThreatYes");
  const threatNoButton = document.getElementById("quoteThreatNo");
  const nextButton = document.getElementById("quoteThreatPreventionNext");

  // Add click event listeners for "Yes" and "No" buttons
  [threatYesButton, threatNoButton].forEach((button) => {
    button.addEventListener("click", (e) => {
      document
        .querySelectorAll("#quoteThreatPrevention .quotequestionscarditem")
        .forEach((item) => item.classList.remove("selected"));

      button.classList.add("selected");

      const selectedValue = button.id === "quoteThreatYes" ? true : false;
      api.securityQuoteParams = api.securityQuoteParams || {};
      api.securityQuoteParams.threatPreventionRequired = selectedValue;

      localStorage.setItem("api", JSON.stringify(api));
      localStorage.setItem("quoteBackup", JSON.stringify(api));
      console.log("Updated API object:", api);

      nextButton.classList.remove("off");
    });
  });

  // Add click event listener for the "Next" button
  nextButton.addEventListener("click", () => {
    if (!nextButton.classList.contains("off")) {
      const threatPrevention = api.securityQuoteParams?.threatPreventionRequired;

      if (threatPrevention === true) {
        showStep("quoteCASBRequired");
      } else {
        showStep("quoteRBIRequired");
      }
    }
  });

  // Add "Previous" button functionality
  const prevButton = document.getElementById("quoteThreatPreventionPrev");
  if (prevButton) {
    prevButton.addEventListener("click", () => {
      const ztnaRequired = api.securityQuoteParams?.ztnaRequired;
      if (ztnaRequired === true) {
        showStep("quoteZTNAUsers"); // Navigate to ZTNA Users step
      } else if (ztnaRequired === false) {
        showStep("quoteZTNARequired"); // Navigate to ZTNA Required step
      } else {
        console.error("Invalid ZTNA Required value:", ztnaRequired);
      }
    });
  }

  initializeNavigation("quoteThreatPrevention", "quoteCASBRequired", null);
}

function initializeStep13CASBRequired() {
  const casbYesButton = document.getElementById("quoteCASBYes");
  const casbNoButton = document.getElementById("quoteCASBNo");
  const nextButton = document.getElementById("quoteCASBRequiredNext");

  [casbYesButton, casbNoButton].forEach((button) => {
    button.addEventListener("click", (e) => {
      document
        .querySelectorAll("#quoteCASBRequired .quotequestionscarditem")
        .forEach((item) => item.classList.remove("selected"));

      button.classList.add("selected");

      const selectedValue = button.id === "quoteCASBYes" ? true : false;
      api.securityQuoteParams = api.securityQuoteParams || {};
      api.securityQuoteParams.casbRequired = selectedValue;

      localStorage.setItem("api", JSON.stringify(api));
      localStorage.setItem("quoteBackup", JSON.stringify(api));
      console.log("Updated API object:", api);

      nextButton.classList.remove("off");
    });
  });

  nextButton.addEventListener("click", () => {
    if (!nextButton.classList.contains("off")) {
      const casbRequired = api.securityQuoteParams?.casbRequired;

      if (casbRequired === true) {
        showStep("quoteDLPRequired");
      } else {
        showStep("quoteRBIRequired");
      }
    }
  });

  const prevButton = document.getElementById("quoteCASBRequiredPrev");
  if (prevButton) {
    prevButton.addEventListener("click", () => {
      showStep("quoteThreatPrevention");
    });
  }
  initializeNavigation("quoteCASBRequired", "quoteDLPRequired", "quoteThreatPrevention");
}

function initializeStep14DLPRequired() {
  const dlpYesButton = document.getElementById("quoteDLPYes");
  const dlpNoButton = document.getElementById("quoteDLPNo");
  const nextButton = document.getElementById("quoteDLPRequiredNext");

  [dlpYesButton, dlpNoButton].forEach((button) => {
    button.addEventListener("click", (e) => {
      document
        .querySelectorAll("#quoteDLPRequired .quotequestionscarditem")
        .forEach((item) => item.classList.remove("selected"));

      button.classList.add("selected");

      const selectedValue = button.id === "quoteDLPYes" ? true : false;
      api.securityQuoteParams = api.securityQuoteParams || {};
      api.securityQuoteParams.dlpRequired = selectedValue;

      localStorage.setItem("api", JSON.stringify(api));
      localStorage.setItem("quoteBackup", JSON.stringify(api));
      console.log("Updated API object:", api);

      nextButton.classList.remove("off");
    });
  });

  nextButton.addEventListener("click", () => {
    if (!nextButton.classList.contains("off")) {
      showStep("quoteRBIRequired");
    }
  });

  const prevButton = document.getElementById("quoteDLPRequiredPrev");
  if (prevButton) {
    prevButton.addEventListener("click", () => {
      showStep("quoteCASBRequired");
    });
  }
  initializeNavigation("quoteDLPRequired", "quoteRBIRequired", "quoteCASBRequired");
}

// Step 15: RBI Required
function initializeStep15RBIRequired() {
  const rbiYesButton = document.getElementById("quoteRBIYes");
  const rbiNoButton = document.getElementById("quoteRBINo");
  const nextButton = document.getElementById("quoteRBIRequiredNext");

  // Add click event listeners for "Yes" and "No" buttons
  [rbiYesButton, rbiNoButton].forEach((button) => {
    button.addEventListener("click", (e) => {
      document
        .querySelectorAll("#quoteRBIRequired .quotequestionscarditem")
        .forEach((item) => item.classList.remove("selected"));

      button.classList.add("selected");

      const selectedValue = button.id === "quoteRBIYes" ? true : false;
      api.securityQuoteParams = api.securityQuoteParams || {};
      api.securityQuoteParams.rbiRequired = selectedValue;

      localStorage.setItem("api", JSON.stringify(api));
      localStorage.setItem("quoteBackup", JSON.stringify(api));
      console.log("Updated API object:", api);

      nextButton.classList.remove("off");
    });
  });

  // Add click event listener for the "Next" button
  nextButton.addEventListener("click", () => {
    if (!nextButton.classList.contains("off")) {
      showStep("quoteContractTerms");
    }
  });

  // Add "Previous" button functionality
  const prevButton = document.getElementById("quoteRBIRequiredPrev");
  if (prevButton) {
    prevButton.addEventListener("click", () => {
      const threatPrevention = api.securityQuoteParams?.threatPreventionRequired;
      const casbRequired = api.securityQuoteParams?.casbRequired;

      if (threatPrevention === false) {
        showStep("quoteThreatPrevention"); // Navigate to Threat Prevention step
      } else if (threatPrevention === true && casbRequired === true) {
        showStep("quoteDLPRequired"); // Navigate to DLP Required step
      } else if (threatPrevention === true && casbRequired === false) {
        showStep("quoteCASBRequired"); // Navigate to CASB Required step
      } else {
        console.error("Invalid Threat Prevention or CASB Required values:", {
          threatPrevention,
          casbRequired,
        });
      }
    });
  }

  initializeNavigation("quoteRBIRequired", "quoteContractTerms", null);
}

// Step 16: Contract Terms Selection
function initializeStep16ContractTerms() {
  // Initialize selections for contract terms
  initializeSelections("quoteContractTerms", "btQuoteParams.contractTermMonths", "quoteContractTermsNext");

  const submitButton = document.getElementById("quoteContractTermsNext");
  const prevButton = document.getElementById("quoteContractTermsPrev");
  const contractTermsContainer = document.getElementById("quoteContractTerms");
  const loader = document.getElementById("quotePOSTLoader");
  const apiResponseText = document.getElementById("apiResponseText");

  // Ensure the submit button is visible and starts with the 'off' class
  submitButton.style.display = "block";
  submitButton.classList.add("off");

  // Add event listeners for contract term selection
  const contractCards = contractTermsContainer.querySelectorAll(".quotequestionscarditem");
  contractCards.forEach((card) => {
    card.addEventListener("click", () => {
      // Remove 'selected' class from all cards and add it to the clicked one
      contractCards.forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");

      // Update API object with the selected contract term
      const selectedTerm = card.querySelector(".quotequestionsitemtitle").textContent.trim();
      api.btQuoteParams.contractTermMonths = parseInt(selectedTerm, 10); // Ensure it's a number

      // Enable the submit button by removing the 'off' class
      submitButton.classList.remove("off");

      // Save the updated API object to localStorage
      localStorage.setItem("api", JSON.stringify(api));
    });
  });

  // Submit button click event
  submitButton.addEventListener("click", async () => {
    if (submitButton.classList.contains("off")) {
      apiResponseText.textContent = "Please select a contract term before proceeding.";
      apiResponseText.style.color = "red";
      apiResponseText.style.display = "block";
      return;
    }

    // Display the loader
    loader.style.display = "flex";
    apiResponseText.style.display = "none";

    // Prepare the API request body
    let requestBody = {
      locationIdentifier: {
        id: api.locationIdentifier.id || "",
        postcode: api.locationIdentifier.postcode || "",
      },
      btQuoteParams: {
        serviceType: api.btQuoteParams.serviceType || "",
        circuitInterface: api.btQuoteParams.circuitInterface || "",
        circuitBandwidth: api.btQuoteParams.circuitBandwidth || "",
        circuitTwoBandwidth: api.btQuoteParams.circuitTwoBandwidth || "",
        numberOfIpAddresses: api.btQuoteParams.numberOfIpAddresses || "",
        preferredIpBackbone: api.btQuoteParams.preferredIpBackbone || "",
        dualInternetConfig: api.btQuoteParams.dualInternetConfig || "",
        preferredDivereseIpBackbone: api.btQuoteParams.preferredDivereseIpBackbone || "",
      },
      securityQuoteParams: {
        secureIpDelivery: api.securityQuoteParams?.secureIpDelivery ?? null,
        ztnaRequired: api.securityQuoteParams?.ztnaRequired ?? null,
        noOfZtnaUsers: api.securityQuoteParams?.noOfZtnaUsers || 0,
        threatPreventionRequired: api.securityQuoteParams?.threatPreventionRequired ?? null,
        casbRequired: api.securityQuoteParams?.casbRequired ?? null,
        dlpRequired: api.securityQuoteParams?.dlpRequired ?? null,
        rbiRequired: api.securityQuoteParams?.rbiRequired ?? null,
      },
      contractTermMonths: api.btQuoteParams.contractTermMonths || null,
    };

    // Remove empty values
    requestBody = removeEmptyValues(requestBody);

    try {
      const response = await fetch("https://conencted-networks-quoting-api.vercel.app/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log("Quote submitted successfully! Response:", responseData);

        // Update the API response text
        apiResponseText.textContent = "Quote submitted successfully! Thank you.";
        apiResponseText.style.color = "green";
        apiResponseText.style.display = "block";

        // Remove `api` from localStorage after a successful submission
        localStorage.removeItem("api");
      } else {
        const errorData = await response.json();

        // Update the API response text with error message
        apiResponseText.textContent = errorData.message || "Submission failed. Please try again.";
        apiResponseText.style.color = "red";
        apiResponseText.style.display = "block";
      }
    } catch (error) {
      console.error("An error occurred while submitting the quote:", error);

      // Update the API response text with a generic error message
      apiResponseText.textContent = "An error occurred. Please try again later.";
      apiResponseText.style.color = "red";
      apiResponseText.style.display = "block";
    } finally {
      // Hide the loader
      loader.style.display = "none";
    }
  });

  // Previous button click event
  if (prevButton) {
    prevButton.addEventListener("click", () => {
      const secureIpDelivery = api.securityQuoteParams?.secureIpDelivery;

      if (secureIpDelivery === false) {
        showStep("quoteSecureIpDelivery"); // Navigate to Secure IP Delivery step
      } else if (secureIpDelivery === true) {
        showStep("quoteRBIRequired"); // Navigate to RBI Required step
      } else {
        console.error("Invalid Secure IP Delivery value:", secureIpDelivery);
      }
    });
  }

  // Navigation Buttons
  initializeNavigation("quoteContractTerms", null, null);
}

// Start the form logic
initializeForm();
