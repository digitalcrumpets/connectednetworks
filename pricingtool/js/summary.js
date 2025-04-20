// Logic for generating and displaying the quote summary
import { getFullApiData } from './apiState.js';
import { getConfig, getAllStepIds } from './stepConfig.js';

const summaryContentElement = document.getElementById('summaryContent'); // Assuming an ID for the summary content area

/**
 * Formats a value for display in the summary.
 * @param {*} value - The value to format.
 * @returns {string} The formatted string.
 */
function formatSummaryValue(value) {
    if (value === true) return 'Yes';
    if (value === false) return 'No';
    if (value === null || value === undefined || value === '') return 'N/A';
    // Add more formatting if needed (e.g., for currency, units)
    return String(value);
}

/**
 * Updates the summary view with the current quote details.
 */
export function updateSummary() {
    if (!summaryContentElement) {
        console.warn("Summary content element ('summaryContent') not found.");
        return;
    }

    const apiData = getFullApiData();
    const allSteps = getAllStepIds();
    let summaryHtml = '<dl>'; // Using definition list for structure

    allSteps.forEach(stepId => {
        const config = getConfig(stepId);
        if (!config || !config.apiKey) return; // Skip steps without an API key

        // Check if the step is relevant based on current conditions
        // Note: This requires evaluating the step's condition, similar to stepNavigation
        let shouldDisplay = true;
        if (config.condition && typeof config.condition === 'function') {
            shouldDisplay = config.condition();
        }

        if (!shouldDisplay) {
            return; // Don't show this step in the summary if its condition is false
        }

        // Resolve nested API keys (e.g., 'btQuoteParams.serviceType')
        let value;
        try {
            value = config.apiKey.split('.').reduce((obj, key) => (obj && obj[key] !== undefined) ? obj[key] : undefined, apiData);
        } catch (e) {
            value = undefined; // Handle cases where path doesn't exist
        }

        // Always display items in the summary panel, even if they don't have a value yet
        const label = config.label || stepId; // Use configured label or step ID as fallback
        const displayValue = value !== undefined ? formatSummaryValue(value) : 'Not selected';

        summaryHtml += `<div class="summary-item">
                          <dt>${label}:</dt>
                          <dd>${displayValue}</dd>
                      </div>`;
    });

    summaryHtml += '</dl>';
    summaryContentElement.innerHTML = summaryHtml;

    console.log("Summary Updated");
}

// Consider adding functionality to make summary items clickable to jump to the step
// This would involve adding data attributes to the summary items and adding event listeners.
// Example: `<dt data-step-id="${stepId}">${label}:</dt>`
// Then, import `showStep` from stepNavigation and attach listeners.

export {}; // Placeholder, will be populated
