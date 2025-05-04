// Handles interactions with specific form element types (dropdowns, selections, etc.)
import { setApiValue, getApiValue } from './apiState.js';
import { enableButton, disableButton, displayError, hideError } from './uiHelpers.js';
import { validateInput } from './validation.js';
import { getConfig } from './stepConfig.js'; // Needed for getting config details

/**
 * Helper to get the value from different element types based on config.
 * @param {HTMLElement} element - The HTML element (e.g., card, dropdown link, input).
 * @param {object} config - The step configuration object.
 * @returns {any} The extracted value (string, number, boolean).
 */
export const getElementValue = (element, config) => {
    if (!element || !config) return null;

    if (config.valueAttr) {
        return element.getAttribute(config.valueAttr);
    }
    if (config.valueSource === 'textContent') {
        // Handle dropdowns where text might be nested
        const textDisplay = element.querySelector('div:nth-child(2)') || element;
        let value = textDisplay.textContent.trim();
         // Attempt to convert to number if specified
        if (config.valueType === 'number') {
             const num = parseInt(value, 10);
             return isNaN(num) ? value : num; // Return original string if not a valid number
        }
        return value;
    }
    if (config.type === 'yesno') {
        // Check if the clicked element matches the 'yes' selector
        return element.matches(config.yesSelector);
    }
    if (config.type === 'numberInput') {
         const val = parseInt(element.value, 10);
         return isNaN(val) ? null : val; // Return null if not a number
    }
    // Default case (e.g., standard input, though less common here)
    return element.value || element.textContent.trim();
};


/**
 * Initializes behavior for 'selection' type steps (clickable cards).
 * @param {HTMLElement} stepElement - The container element for the step.
 * @param {string} stepId - The ID of the current step.
 */
export const initializeSelection = (stepElement, stepId) => {
    const config = getConfig(stepId);
    if (!config) return;

    const items = stepElement.querySelectorAll(config.selector || '.quotequestionscarditem');
    const nextButton = document.getElementById(`${stepId}Next`);
    const errorContainerId = `step-${stepId}-error`;

    items.forEach(item => {
        // Use event listener for better management if needed, onclick is simpler for now
        item.onclick = (e) => {
            const targetItem = e.currentTarget; // Use currentTarget for the element the listener is attached to
            if (!targetItem) return;

            hideError(errorContainerId); // Clear error on selection
            items.forEach(i => i.classList.remove('selected'));
            targetItem.classList.add('selected');

            let value = getElementValue(targetItem, config);
            // Type conversion handled by getElementValue now

            // Validate before setting API value
            const errorMessage = validateInput(value, config);
            if (errorMessage) {
                displayError(errorContainerId, errorMessage);
                disableButton(nextButton);
                // Optionally clear API value or keep invalid selection visible?
                // setApiValue(config.apiKey, null); // Decide if invalid selection should clear data
            } else {
                setApiValue(config.apiKey, value);
                enableButton(nextButton);
            }
        };
    });

    // Pre-select based on existing API data
    const currentValue = getApiValue(config.apiKey);
    if (currentValue !== null && currentValue !== undefined) {
        items.forEach(item => {
            let itemValue = getElementValue(item, config);
            if (String(itemValue) === String(currentValue)) { // Compare as strings for simplicity
                item.classList.add('selected');
                enableButton(nextButton);
            }
        });
    } else {
        disableButton(nextButton);
    }
};

/**
 * Initializes behavior for 'yesno' type steps.
 * @param {HTMLElement} stepElement - The container element for the step.
 * @param {string} stepId - The ID of the current step.
 */
export const initializeYesNo = (stepElement, stepId) => {
    const config = getConfig(stepId);
    if (!config || !config.yesSelector || !config.noSelector) return;

    const yesButton = stepElement.querySelector(config.yesSelector);
    const noButton = stepElement.querySelector(config.noSelector);
    const nextButton = document.getElementById(`${stepId}Next`);
    const errorContainerId = `step-${stepId}-error`;

    const handleClick = (targetItem, value) => {
        hideError(errorContainerId);
        yesButton?.classList.remove('selected');
        noButton?.classList.remove('selected');
        targetItem.classList.add('selected');

        const errorMessage = validateInput(value, config); // Validate true/false
        if (errorMessage) {
            displayError(errorContainerId, errorMessage);
            disableButton(nextButton);
        } else {
            setApiValue(config.apiKey, value);
            enableButton(nextButton);
        }
    };

    if (yesButton) {
        yesButton.onclick = (e) => handleClick(e.currentTarget, true);
    }
    if (noButton) {
        noButton.onclick = (e) => handleClick(e.currentTarget, false);
    }

    // Pre-select
    const currentValue = getApiValue(config.apiKey);
    if (currentValue === true && yesButton) {
        yesButton.classList.add('selected');
        enableButton(nextButton);
    } else if (currentValue === false && noButton) {
        noButton.classList.add('selected');
        enableButton(nextButton);
    } else {
        disableButton(nextButton);
    }
};

/**
 * Initializes behavior for 'dropdown' type steps.
 * @param {HTMLElement} stepElement - The container element for the step.
 * @param {string} stepId - The ID of the current step.
 */
export const initializeDropdown = (stepElement, stepId) => {
    const config = getConfig(stepId);
    if (!config || !config.dropdownSelectors) return;

     // Hide all dropdowns within this step first
    stepElement.querySelectorAll('.quotequestionsdropdown').forEach(dd => dd.style.display = 'none');

    // Determine which dropdown to show based on conditions (e.g., 1G vs 10G)
    let activeDropdownSelector = config.dropdownSelectors['default']; // Default if no specific conditions

    // --- Conditions to select the correct dropdown --- //
    // Example: Bandwidth dropdown depends on selected Interface type
     if (config.apiKey === 'btQuoteParams.circuitBandwidth' || config.apiKey === 'btQuoteParams.circuitTwoBandwidth') {
         const interfaceType = getApiValue('btQuoteParams.circuitInterface');
         if (interfaceType?.startsWith('1000B')) {
             activeDropdownSelector = config.dropdownSelectors['1G'];
         } else if (interfaceType?.startsWith('10G')) {
             activeDropdownSelector = config.dropdownSelectors['10G'];
         }
     }
     // --- Add more conditions for other dropdowns if needed --- //

    if (!activeDropdownSelector) {
        console.warn(`No active dropdown selector determined for step ${stepId}`);
        return;
    }

    const activeDropdown = stepElement.querySelector(activeDropdownSelector);
    if (!activeDropdown) {
        console.warn(`Active dropdown element '${activeDropdownSelector}' not found in step ${stepId}`);
        return;
    }

    // Show the determined dropdown
    activeDropdown.style.display = 'block';

    // Initialize the behavior for the active dropdown
    const toggle = activeDropdown.querySelector('.quotequestionsdropdowntoggle');
    const list = activeDropdown.querySelector('.quotequestionsdropdownlist');
    const links = list?.querySelectorAll('.quotequestionsdropdownlink');
    const nextButton = document.getElementById(`${stepId}Next`);
    const errorContainerId = `step-${stepId}-error`;

    if (!toggle || !list || !links || links.length === 0) {
        console.warn(`Dropdown structure incomplete in ${activeDropdown.id}`);
        return;
    }

    // Toggle dropdown list visibility
    toggle.addEventListener('click', () => {
        const isOpen = list.style.display === 'block';
        list.style.display = isOpen ? 'none' : 'block';
        toggle.setAttribute('aria-expanded', String(!isOpen));
    });

    // Handle link selection
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            hideError(errorContainerId);

            const selectedValue = getElementValue(link, config);
            let valueToStore = selectedValue;
            // Conversion to number happens in getElementValue if config.valueType is 'number'

            // Update toggle text reliably
            const textDisplay = toggle.querySelector('div:nth-child(2)'); // Assuming second div holds the text
            if (textDisplay) textDisplay.textContent = String(selectedValue); // Display the original selected text
            else toggle.textContent = String(selectedValue); // Fallback

            links.forEach(l => l.classList.remove('selected'));
            link.classList.add('selected');
            
            // Add selected class to the toggle button itself
            toggle.classList.add('selected');

            // Validate
            const errorMessage = validateInput(valueToStore, config);
            if (errorMessage) {
                displayError(errorContainerId, errorMessage);
                disableButton(nextButton);
            } else {
                 setApiValue(config.apiKey, valueToStore);
                 enableButton(nextButton);
            }

            list.style.display = 'none';
            toggle.setAttribute('aria-expanded', 'false');
        });
    });

    // Close dropdown if clicking outside
    document.addEventListener('click', (event) => {
        if (!activeDropdown.contains(event.target) && list.style.display === 'block') {
            list.style.display = 'none';
            toggle.setAttribute('aria-expanded', 'false');
        }
    }, true); // Use capture phase

    // Pre-select based on API data
    const currentValue = getApiValue(config.apiKey);
    if (currentValue !== null && currentValue !== undefined) {
        let found = false;
        links.forEach(link => {
            const linkValue = getElementValue(link, config);
             // Compare carefully (numbers vs strings)
            if (String(linkValue) === String(currentValue)) {
                link.classList.add('selected');
                const textDisplay = toggle.querySelector('div:nth-child(2)');
                if (textDisplay) textDisplay.textContent = String(linkValue);
                else toggle.textContent = String(linkValue);
                enableButton(nextButton);
                found = true;
            }
        });
        if (!found) disableButton(nextButton);
    } else {
        disableButton(nextButton); // Disable if no value
    }
};

/**
 * Initializes behavior for 'numberInput' type steps.
 * @param {HTMLElement} stepElement - The container element for the step.
 * @param {string} stepId - The ID of the current step.
 */
export const initializeNumberInput = (stepElement, stepId) => {
    const config = getConfig(stepId);
    if (!config || !config.inputSelector) return;

    const input = stepElement.querySelector(config.inputSelector);
    const nextButton = document.getElementById(`${stepId}Next`);
    const errorContainerId = `step-${stepId}-error`;

    if (!input) {
        console.warn(`Number input element '${config.inputSelector}' not found in step ${stepId}`);
        return;
    }

     // Pre-fill from API
     const savedValue = getApiValue(config.apiKey);
     if (savedValue !== null && savedValue !== undefined) {
         input.value = savedValue;
          // Validate pre-filled value
         const errorMessage = validateInput(savedValue, config);
         if (!errorMessage) {
            enableButton(nextButton);
         } else {
            displayError(errorContainerId, errorMessage);
            disableButton(nextButton);
         }
     } else {
         input.value = ''; // Clear if no value
         disableButton(nextButton);
     }

    input.addEventListener('input', (e) => {
        hideError(errorContainerId);
        const value = e.target.value; // Get raw value first
        const numericValue = parseInt(value, 10);

        // Validate the raw or numeric value based on rules
        const errorMessage = validateInput(isNaN(numericValue) ? value : numericValue, config);

        if (errorMessage) {
            displayError(errorContainerId, errorMessage);
            disableButton(nextButton);
            // Maybe clear API value on invalid input?
             // setApiValue(config.apiKey, null);
        } else {
            // Only set API value if it's a valid number according to validation
            setApiValue(config.apiKey, numericValue);
            enableButton(nextButton);
        }
    });
};

/**
 * Initializes behavior for the 'finalSubmit' type step.
 * It behaves like 'selection' but the next button triggers submission.
 * @param {HTMLElement} stepElement - The container element for the step.
 * @param {string} stepId - The ID of the current step.
 * @param {Function} submitAction - The function to call when the submit button is clicked.
 */
export const initializeFinalSubmit = (stepElement, stepId, submitAction) => {
    const config = getConfig(stepId);
    if (!config) return;

    const items = stepElement.querySelectorAll(config.selector || '.quotequestionscarditem');
    const submitButton = document.getElementById(`${stepId}Next`); // The 'Next' button acts as submit
    const errorContainerId = `step-${stepId}-error`;

    items.forEach(item => {
        item.onclick = (e) => {
            const targetItem = e.currentTarget;
            if (!targetItem) return;

            hideError(errorContainerId);
            items.forEach(i => i.classList.remove('selected'));
            targetItem.classList.add('selected');

            let value = getElementValue(targetItem, config);
             // Validation
            const errorMessage = validateInput(value, config);
            if (errorMessage) {
                displayError(errorContainerId, errorMessage);
                disableButton(submitButton);
            } else {
                 setApiValue(config.apiKey, value);
                 enableButton(submitButton);
            }
        };
    });

    // Pre-select
    const currentValue = getApiValue(config.apiKey);
    if (currentValue !== null && currentValue !== undefined) {
        items.forEach(item => {
            let itemValue = getElementValue(item, config);
            if (String(itemValue) === String(currentValue)) {
                item.classList.add('selected');
                enableButton(submitButton);
            }
        });
    } else {
        disableButton(submitButton);
    }

    // Assign the actual submit action to the button
    if (submitButton) {
        submitButton.onclick = () => {
            if (submitButton.disabled || submitButton.classList.contains('off')) {
                displayError(errorContainerId, "Please make a selection.");
                return;
            }
            hideError(errorContainerId);
            submitAction(); // Call the passed-in submit function
        };
    }
};
