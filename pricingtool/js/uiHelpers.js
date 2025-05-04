// Contains utility functions for UI manipulation (errors, loaders, buttons, modals)

/**
 * Maps technical error messages to user-friendly messages
 * @param {number} statusCode - HTTP status code
 * @param {string} technicalMessage - The original error message
 * @param {string} source - The source of the error (optional)
 * @returns {string} A user-friendly error message
 */
export const getUserFriendlyErrorMessage = (statusCode, technicalMessage, source = '') => {
  // Log the technical error for debugging
  console.error(`Technical error (${statusCode}) from ${source || 'unknown source'}:`, technicalMessage);
  
  const contactLink = '<a href="https://www.connectednetworks.io/contact">contact us</a>';
  
  // Common error mapping
  const errorMap = {
    // Server errors
    'failed to get security pricing info from the database': 
      `We couldn't match your quote specifications. Please ${contactLink} for personalized assistance.`,
    
    // Add more mappings as needed
    'validation error': `There's an issue with the information provided. Please check your inputs and try again, or ${contactLink} for help.`,
    'rate limit exceeded': `You've made too many requests. Please wait a moment and try again, or ${contactLink} if you need immediate assistance.`,
    'unauthorized': `You don't have permission to access this resource. Please log in again or ${contactLink} for support.`,
    'forbidden': `You don't have sufficient permissions to access this feature. Please ${contactLink} for assistance.`,
    'not found': `The requested information could not be found. Please ${contactLink} for help.`,
    'service unavailable': `This service is temporarily unavailable. Please try again later or ${contactLink} for updates.`,
  };

  // Check if we have a specific friendly message for this error
  for (const [technicalPattern, friendlyMessage] of Object.entries(errorMap)) {
    if (technicalMessage.toLowerCase().includes(technicalPattern.toLowerCase())) {
      return friendlyMessage;
    }
  }

  // Default messages based on status code
  if (statusCode >= 500) {
    return `Our systems are currently experiencing technical difficulties. Please try again later or ${contactLink} for assistance.`;
  } else if (statusCode >= 400) {
    return `We encountered an issue with your request. Please check your information and try again, or ${contactLink} for help.`;
  }

  // Fallback
  return `We couldn't match your quote. Please ${contactLink} and our team will assist you with your requirements.`;
};

/**
 * Displays an error message within a specific container.
 * @param {string} containerId - The ID of the error message container element.
 * @param {string} message - The error message to display.
 * @param {boolean} isApiError - Whether this is an API error (for formatting)
 * @param {boolean} isHTML - Whether the message contains HTML that should be rendered
 */
export const displayError = (containerId, message, isApiError = false, isHTML = false) => {
  const errorContainer = document.getElementById(containerId);
  if (errorContainer) {
    // If it's an API error, check if it contains technical details we should replace
    if (isApiError && message.includes('API error:')) {
      // Extract status code and message
      const matches = message.match(/API error: (\d+) (.*)/);
      if (matches && matches.length >= 3) {
        const statusCode = parseInt(matches[1], 10);
        const technicalMessage = matches[2];
        // Get user-friendly version
        message = getUserFriendlyErrorMessage(statusCode, technicalMessage);
        isHTML = true; // User-friendly messages contain HTML (links)
      }
    }
    
    if (isHTML) {
      errorContainer.innerHTML = message;
    } else {
      errorContainer.textContent = message;
    }
    
    errorContainer.style.display = 'block'; // Or 'inline', 'flex', etc.
    errorContainer.setAttribute('role', 'alert');
  } else {
    console.warn(`Error container with ID '${containerId}' not found.`);
  }
};

/**
 * Hides an error message container.
 * @param {string} containerId - The ID of the error message container element.
 */
export const hideError = (containerId) => {
  const errorContainer = document.getElementById(containerId);
  if (errorContainer) {
    errorContainer.textContent = '';
    errorContainer.style.display = 'none';
    errorContainer.removeAttribute('role');
  } else {
    console.warn(`Error container with ID '${containerId}' not found.`);
  }
};

/**
 * Shows a loading indicator.
 * @param {string} loaderId - The ID of the loader element.
 */
export const showLoader = (loaderId) => {
  const loader = document.getElementById(loaderId);
  if (loader) {
    loader.style.display = 'block'; // Or 'inline', 'flex', etc.
  } else {
    console.warn(`Loader with ID '${loaderId}' not found.`);
  }
};

/**
 * Hides a loading indicator.
 * @param {string} loaderId - The ID of the loader element.
 */
export const hideLoader = (loaderId) => {
  const loader = document.getElementById(loaderId);
  if (loader) {
    loader.style.display = 'none';
  } else {
    console.warn(`Loader with ID '${loaderId}' not found.`);
  }
};

/**
 * Enables a button element.
 * @param {HTMLElement} button - The button element.
 */
export const enableButton = (button) => {
  if (button) {
    button.disabled = false;
    button.classList.remove('off'); // Assuming 'off' class indicates disabled state
     button.setAttribute('aria-disabled', 'false');
  }
};

/**
 * Disables a button element.
 * @param {HTMLElement} button - The button element.
 */
export const disableButton = (button) => {
  if (button) {
    button.disabled = true;
    button.classList.add('off'); // Assuming 'off' class indicates disabled state
    button.setAttribute('aria-disabled', 'true');
  }
};

/**
 * Opens a modal dialog.
 * @param {string} modalId - The ID of the modal container element.
 */
export const openModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'block'; // Or 'flex', etc.
    // Optional: Add class for open state, focus management
    modal.classList.add('modal-open');
    // Focus the first focusable element inside the modal or the modal itself
    const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable) {
        focusable.focus();
    } else {
        modal.setAttribute('tabindex', '-1'); // Make modal focusable if nothing else is
        modal.focus();
    }
  } else {
    console.warn(`Modal with ID '${modalId}' not found.`);
  }
};

/**
 * Closes a modal dialog.
 * @param {string} modalId - The ID of the modal container element.
 */
export const closeModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('modal-open');
    // Optional: Return focus to the element that opened the modal
  } else {
    console.warn(`Modal with ID '${modalId}' not found.`);
  }
};

/**
 * Initializes modal functionality across the application
 */
export const initializeModal = () => {
  console.log('Initializing modal functionality...');
  // This function is called by main.js
};

/**
 * Shows a success modal with a message.
 * @param {string} [message] - The message to display in the modal (optional).
 * @param {string} [modalId='successModal'] - The ID of the modal to show.
 */
export function showSuccessModal(message = '', modalId = 'successModal') {
  const modal = document.getElementById(modalId);
  if (modal) {
    // If a message is provided, set it in the modal (assumes a .modal-message element)
    if (message) {
      const msgElem = modal.querySelector('.modal-message');
      if (msgElem) {
        msgElem.textContent = message;
      }
    }
    modal.style.display = 'block';
    modal.classList.add('modal-open');
    // Focus management
    const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable) {
      focusable.focus();
    } else {
      modal.setAttribute('tabindex', '-1');
      modal.focus();
    }
  } else {
    console.warn(`Success modal with ID '${modalId}' not found.`);
  }
}
