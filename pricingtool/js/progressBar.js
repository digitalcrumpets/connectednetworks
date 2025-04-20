// Logic for updating the progress bar UI

const progressBarFill = document.getElementById('progressBarFill'); // Assuming an ID for the fill element
const progressBarText = document.getElementById('progressBarText'); // Optional: Element to display text like 'Step 3 of 16'

/**
 * Updates the visual progress bar.
 * @param {number} currentStepIndex - The 0-based index of the current step.
 * @param {number} totalSteps - The total number of steps in the form.
 */
export function updateProgressBar(currentStepIndex, totalSteps) {
    if (!progressBarFill) {
        console.warn("Progress bar fill element ('progressBarFill') not found.");
        return;
    }

    if (totalSteps <= 0) {
        progressBarFill.style.width = '0%';
        if (progressBarText) progressBarText.textContent = '';
        return;
    }

    // Calculate percentage (add 1 to index for 1-based step number)
    const progress = ((currentStepIndex + 1) / totalSteps) * 100;
    const percentage = Math.min(Math.max(progress, 0), 100); // Clamp between 0 and 100

    progressBarFill.style.width = `${percentage}%`;

    // Optional: Update text display
    if (progressBarText) {
         // Show step number only if progress > 0
        if (percentage > 0) {
             progressBarText.textContent = `Step ${currentStepIndex + 1} of ${totalSteps}`;
        } else {
             progressBarText.textContent = '';
        }
    }

    console.log(`Progress Bar Updated: Step ${currentStepIndex + 1}/${totalSteps} (${percentage.toFixed(1)}%)`);
}

// Initialize progress bar to 0% on load
// updateProgressBar(-1, getTotalSteps()); // Or call this from main init logic
// Need to ensure totalSteps is available; might be better to call from stepNavigation init
