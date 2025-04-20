// Main entry point for the quote form application
import { initializeQuoteForm } from './flowController.js'; // Import the main initializer

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed. Initializing Quote Form via main.js...');

    // Initialize the entire quote form application logic
    initializeQuoteForm();

    console.log('Quote Form Initialized via main.js.');
});
