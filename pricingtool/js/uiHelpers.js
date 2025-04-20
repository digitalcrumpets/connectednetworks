// Contains utility functions for UI manipulation (errors, loaders, buttons, modals)

/**
 * Displays an error message within a specific container.
 * @param {string} containerId - The ID of the error message container element.
 * @param {string} message - The error message to display.
 */
export const displayError = (containerId, message) => {
  const errorContainer = document.getElementById(containerId);
  if (errorContainer) {
    errorContainer.textContent = message;
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
