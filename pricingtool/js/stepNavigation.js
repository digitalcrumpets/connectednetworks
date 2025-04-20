// Manages the core logic for displaying steps and handling navigation
import { getApiValue } from './apiState.js';
import { getConfig, getAllStepIds } from './stepConfig.js';
import {
    initializeSelection,
    initializeYesNo,
    initializeDropdown,
    initializeNumberInput,
    initializeFinalSubmit,
    getElementValue // Import if needed, though primarily used within formElements
} from './formElements.js';
import { enableButton, disableButton, hideError } from './uiHelpers.js';
import { updateProgressBar } from './progressBar.js'; // Placeholder import
import { updateSummary } from './summary.js'; // Placeholder import
import { submitQuote } from './submission.js'; // Import the actual submission function

let currentStepId = null;
const allStepIds = getAllStepIds(); // Get all defined step IDs in order

/**
 * Hides all form step elements.
 */
function hideAllSteps() {
    const steps = document.querySelectorAll('.quotequestionssection');
    steps.forEach(step => {
        step.style.display = 'none';
        step.classList.remove('active-step');
    });
    // Also hide address lookup if it's separate
    const addressLookupSection = document.getElementById('addressLookupSection'); // Assuming an ID
    if (addressLookupSection) addressLookupSection.style.display = 'none';
}

/**
 * Determines if a step should be displayed based on its condition.
 * @param {string} stepId - The ID of the step to check.
 * @returns {boolean} True if the step should be displayed, false otherwise.
 */
function shouldDisplayStep(stepId) {
    const config = getConfig(stepId);
    if (!config) return false; // Step doesn't exist
    if (config.condition && typeof config.condition === 'function') {
        return config.condition(); // Evaluate the condition function
    }
    return true; // No condition, always display
}

/**
 * Finds the next valid step ID in a given direction, skipping conditional steps that shouldn't be shown.
 * @param {string} startingStepId - The ID of the step to navigate from.
 * @param {'next' | 'prev'} direction - The direction to navigate.
 * @returns {string|null} The ID of the next valid step, or null if none found.
 */
function findNextValidStep(startingStepId, direction) {
    const config = getConfig(startingStepId);
    if (!config || !config.navigation) return null;

    let nextStepId = config.navigation[direction];

    // If navigation is dynamic (function)
    if (typeof nextStepId === 'function') {
        const currentValue = getApiValue(config.apiKey);
        // Note: Need to get the *actual* element value if the API hasn't been set yet or needs re-evaluation?
        // This might require passing the current element or finding it.
        // For now, assume API value is sufficient for navigation logic.
        nextStepId = nextStepId(currentValue);
    }

    // Traverse until a displayable step is found or we run out of steps
    while (nextStepId && !shouldDisplayStep(nextStepId)) {
        console.log(`Skipping conditional step: ${nextStepId}`);
        const skippedConfig = getConfig(nextStepId);
        if (!skippedConfig || !skippedConfig.navigation) return null; // End of path

        let potentialNext = skippedConfig.navigation[direction];
         if (typeof potentialNext === 'function') {
            const skippedValue = getApiValue(skippedConfig.apiKey);
             potentialNext = potentialNext(skippedValue);
         }
        nextStepId = potentialNext;
    }

    return nextStepId;
}

/**
 * Shows a specific step and initializes its behavior.
 * @param {string} stepId - The ID of the step to show.
 */
export function showStep(stepId) {
    if (!stepId || !allStepIds.includes(stepId)) {
        console.error(`Invalid or non-existent step ID: ${stepId}`);
        return;
    }

     // First, check if this step should be displayed based on conditions
    if (!shouldDisplayStep(stepId)) {
        console.warn(`Attempted to show conditional step ${stepId} which should be hidden. Skipping.`);
        // Optionally, try to navigate past it? Or rely on the navigation functions to handle skipping.
        return;
    }

    hideAllSteps();
    const stepElement = document.getElementById(stepId);
    const config = getConfig(stepId);

    if (!stepElement || !config) {
        console.error(`Step element or config not found for ID: ${stepId}`);
        return;
    }

    console.log(`Showing step: ${stepId}`);
    stepElement.style.display = 'block';
    stepElement.classList.add('active-step');
    currentStepId = stepId;

    // Clear any previous errors for this step
    const errorContainerId = `step-${stepId}-error`;
    hideError(errorContainerId);

    // --- Ensure modal is visible when showing a step ---
    const quoteModal = document.getElementById('quoteQuestionsModal');
    if (quoteModal) {
        // Only show if we are NOT on initial load (i.e., not when address modal is up)
        // Only show if initialView is hidden (address lookup complete)
        const initialView = document.getElementById('initialView');
        if (
            quoteModal.style.display === 'none' &&
            stepId === 'quoteServiceType' &&
            initialView && initialView.style.display === 'none'
        ) {
            quoteModal.style.display = 'block';
        }
    }

    // Initialize the specific element type handler
    switch (config.type) {
        case 'selection':
            initializeSelection(stepElement, stepId);
            break;
        case 'dropdown':
            initializeDropdown(stepElement, stepId);
            break;
        case 'yesno':
            initializeYesNo(stepElement, stepId);
            break;
        case 'numberInput':
            initializeNumberInput(stepElement, stepId);
            break;
        case 'finalSubmit':
            // Pass the submitQuote function to the final step initializer
            initializeFinalSubmit(stepElement, stepId, submitQuote);
            break;
        // Add cases for other types like 'addressLookup' if it becomes a formal step type
        default:
            console.warn(`No initializer found for step type: ${config.type} in step ${stepId}`);
            // Attempt to enable next if no specific init? Or keep disabled?
            const nextButtonDefault = document.getElementById(`${stepId}Next`);
            if (nextButtonDefault) {
                const currentValue = getApiValue(config.apiKey);
                if (config.isRequired && (currentValue === null || currentValue === undefined || currentValue === '')) {
                     disableButton(nextButtonDefault);
                } else {
                    enableButton(nextButtonDefault);
                }
            }
            break;
    }

    // Call the onDisplay hook if defined
    if (config.onDisplay && typeof config.onDisplay === 'function') {
        config.onDisplay(stepElement);
    }

    // Update Navigation Buttons State (Enable/Disable Prev/Next)
    const prevButton = document.getElementById(`${stepId}Prev`);
    const nextButton = document.getElementById(`${stepId}Next`); // Submit button for final step

    // Previous button logic
    const prevStepId = config.navigation?.prev;
    if (prevButton) {
         if (prevStepId === null) { // First step
            disableButton(prevButton);
            prevButton.style.visibility = 'hidden'; // Hide if truly the first step
         } else {
            enableButton(prevButton);
             prevButton.style.visibility = 'visible';
         }
    }

    // Next button logic (initial state - might be enabled by element handlers)
    if (nextButton) {
        const currentValue = getApiValue(config.apiKey);
         // Disable initially if required and no value exists
        if (config.isRequired && (currentValue === null || currentValue === undefined || currentValue === '')) {
             // Exception: If element handler pre-fills and validates, it might enable it.
             // Let element handlers manage enabling, but default to disabled if required & empty.
             const isSelected = stepElement.querySelector('.selected'); // Check if something is pre-selected
             if (!isSelected) {
                 disableButton(nextButton);
             }
        } else {
            // If not required or value exists, enable (or let handler confirm)
             // enableButton(nextButton); // Element handler should ideally manage this
        }
        nextButton.textContent = (config.type === 'finalSubmit') ? 'Get Quote' : 'Next';
    }

    // Update Progress Bar (calculate current step index)
    const currentStepIndex = allStepIds.indexOf(stepId);
    updateProgressBar(currentStepIndex, allStepIds.length);

    // Update Summary View
    updateSummary();

    // Scroll to the top of the step (optional)
    // stepElement.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Navigates to the next logical step.
 */
function goToNextStep() {
    if (!currentStepId) return;
    console.log("Next clicked from:", currentStepId);

    // Find the *actual* next step ID, considering conditions
    const nextStepId = findNextValidStep(currentStepId, 'next');

    if (nextStepId) {
        showStep(nextStepId);
    } else {
        console.log("No next step found or end of form reached.");
        // This case should ideally be handled by the 'finalSubmit' type
        // If somehow reached here without finalSubmit, maybe trigger submission?
        // submitQuote(); // Or show an error/completion message
    }
}

/**
 * Navigates to the previous logical step.
 */
function goToPreviousStep() {
    if (!currentStepId) return;
    console.log("Previous clicked from:", currentStepId);

    // Find the *actual* previous step ID, considering conditions
    const prevStepId = findNextValidStep(currentStepId, 'prev');

    if (prevStepId) {
        showStep(prevStepId);
    } else {
        console.log("No previous step found (likely first step).");
        // Cannot go back further
    }
}

/**
 * Initializes all navigation buttons (Next/Previous) for all steps.
 */
export function initializeNavigation() {
    allStepIds.forEach(stepId => {
        const nextButton = document.getElementById(`${stepId}Next`);
        const prevButton = document.getElementById(`${stepId}Prev`);

        if (nextButton && getConfig(stepId)?.type !== 'finalSubmit') { // Final submit handled separately
            nextButton.addEventListener('click', (e) => {
                 if (nextButton.disabled || nextButton.classList.contains('off')) {
                    // Optionally show a generic error if clicked while disabled
                     const errorContainerId = `step-${stepId}-error`;
                     hideError(errorContainerId); // Clear first
                     // displayError(errorContainerId, "Please complete the current step.");
                     console.warn(`Next button clicked while disabled for step ${stepId}`);
                     return;
                 }
                goToNextStep();
            });
        }

        if (prevButton) {
            prevButton.addEventListener('click', goToPreviousStep);
        }
    });

    // Show the initial step
    const initialStepId = allStepIds[0];
    if (initialStepId) {
        showStep(initialStepId);
    } else {
        console.error("No steps defined in configuration.");
    }
}

// --- Potentially add functions to directly jump to a step (e.g., from summary view) ---
// export function goToStep(targetStepId) { ... showStep(targetStepId); ... }
