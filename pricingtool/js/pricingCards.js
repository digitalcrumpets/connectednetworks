// Pricing cards component for displaying BT pricing options
import { enableButton, disableButton } from './uiHelpers.js';
import { showStep } from './stepNavigation.js';

let selectedPricingOption = null;
let pricingData = null;

/**
 * Initialize the pricing cards component
 * @param {Object} apiResponse - The pricing data from the API
 */
export function initializePricingCards(apiResponse) {
    console.log('Initializing pricing cards with data:', apiResponse);
    
    // Check if the response is an array (based on the API format we're receiving)
    if (Array.isArray(apiResponse) && apiResponse.length > 0) {
        // Extract the pricing data from the first item in the array
        if (apiResponse[0] && apiResponse[0].btPricing) {
            pricingData = apiResponse[0].btPricing;
            setupCategoryTabs();
            renderPricingCards('etherway'); // Default to etherway tab
            setupEventListeners();
            return;
        }
    }
    
    // If we didn't return above, check for direct btPricing object format
    if (apiResponse && apiResponse.btPricing) {
        pricingData = apiResponse.btPricing;
        setupCategoryTabs();
        renderPricingCards('etherway'); // Default to etherway tab
        setupEventListeners();
        return;
    }
    
    console.error('Invalid pricing data format', apiResponse);
}

/**
 * Set up category tabs event listeners
 */
function setupCategoryTabs() {
    const tabs = document.querySelectorAll('.pricing-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Render cards for the selected category
            const category = tab.getAttribute('data-category');
            renderPricingCards(category);
        });
    });
}

/**
 * Render pricing cards for the selected category
 * @param {string} category - The pricing category to display (etherway, etherflow, etherflowCircuit2)
 */
function renderPricingCards(category) {
    const container = document.querySelector('.pricing-cards-container');
    
    // Clear previous cards
    container.innerHTML = '';
    
    // Reset selected option when changing categories
    selectedPricingOption = null;
    
    // Get the actual button element before disabling it
    const nextButton = document.getElementById('pricingCardsSectionNext');
    if (nextButton) {
        disableButton(nextButton);
    } else {
        console.warn('Next button not found: pricingCardsSectionNext');
    }
    
    // Check if we have data for this category
    if (!pricingData[category] || !Array.isArray(pricingData[category])) {
        container.innerHTML = '<p class="no-options">No pricing options available for this category.</p>';
        return;
    }
    
    // Group pricing options by name (e.g., "1 Year connection" and "1 Year rental" go together)
    const pricingGroups = groupPricingOptions(pricingData[category]);
    
    // Create a card slider container
    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'pricing-card-slider';
    container.appendChild(sliderContainer);
    
    // Create cards for each group
    Object.keys(pricingGroups).forEach(groupName => {
        const group = pricingGroups[groupName];
        const card = createPricingCard(group, category);
        sliderContainer.appendChild(card);
    });
}

/**
 * Group pricing options by their base name (e.g., "1 Year", "3 Year", etc.)
 * @param {Array} options - Array of pricing options
 * @returns {Object} - Grouped pricing options
 */
function groupPricingOptions(options) {
    const groups = {};
    
    options.forEach(option => {
        // Extract the base name (e.g., "1 Year" from "1 Year connection")
        const baseName = option.name.split(' ').slice(0, 2).join(' ');
        
        if (!groups[baseName]) {
            groups[baseName] = [];
        }
        
        groups[baseName].push(option);
    });
    
    return groups;
}

/**
 * Format price from pennies to pounds with proper formatting
 * @param {number} penceValue - Price in pennies
 * @returns {string} - Formatted price
 */
function formatPrice(penceValue) {
    if (penceValue === 0) return '£0';
    
    // Convert from pennies to pounds
    const pounds = penceValue / 100;
    
    // Format with thousand separators and 2 decimal places
    return '£' + pounds.toLocaleString('en-GB', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/**
 * Calculate total cost by combining one-time and recurring fees
 * @param {Array} options - Group of pricing options
 * @returns {Object} - Total price information
 */
function calculateTotalPrice(options) {
    let oneTimePrice = 0;
    let recurringPrice = 0;
    let recurringPeriod = null;
    
    options.forEach(option => {
        if (option.priceType === 'nonRecurring') {
            oneTimePrice = option.price.dutyFreeAmount.value;
        } else if (option.priceType === 'recurring') {
            recurringPrice = option.price.dutyFreeAmount.value;
            recurringPeriod = option.recurringChargePeriod;
        }
    });
    
    return {
        oneTimePrice,
        recurringPrice,
        recurringPeriod
    };
}

/**
 * Create a pricing card element
 * @param {Array} optionGroup - Group of related pricing options
 * @param {string} category - The pricing category
 * @returns {HTMLElement} - Card element
 */
function createPricingCard(optionGroup, category) {
    const card = document.createElement('div');
    card.className = 'pricing-card';
    
    // Get option details
    const primaryOption = optionGroup[0];
    const baseName = primaryOption.name.split(' ').slice(0, 2).join(' ');
    const priceInfo = calculateTotalPrice(optionGroup);
    
    // Create card content
    card.innerHTML = `
        <div class="pricing-card-header">
            <div class="pricing-card-name">${baseName}</div>
            <div class="pricing-card-type">${category}</div>
            ${priceInfo.recurringPeriod ? `<div class="pricing-card-period">${priceInfo.recurringPeriod}ly billing</div>` : ''}
        </div>
        <div class="pricing-card-price">
            <div class="price-value">${formatPrice(priceInfo.recurringPrice)}<span class="price-currency">/year</span></div>
            <div class="price-details">
                ${priceInfo.oneTimePrice > 0 ? `One-time setup fee: ${formatPrice(priceInfo.oneTimePrice)}` : 'No setup fee'}
            </div>
        </div>
        <div class="pricing-card-footer">
            <button class="select-plan-btn">Select</button>
        </div>
    `;
    
    // Add data attributes to store the option data
    card.setAttribute('data-category', category);
    card.setAttribute('data-plan-name', baseName);
    card.setAttribute('data-options', JSON.stringify(optionGroup));
    
    // Add click event for select button
    const selectButton = card.querySelector('.select-plan-btn');
    selectButton.addEventListener('click', () => selectPricingCard(card));
    
    return card;
}

/**
 * Handle card selection
 * @param {HTMLElement} card - The selected card element
 */
function selectPricingCard(card) {
    // Clear previous selection
    const allCards = document.querySelectorAll('.pricing-card');
    allCards.forEach(c => c.classList.remove('selected'));
    
    // Mark the card as selected
    card.classList.add('selected');
    
    // Store the selected option
    selectedPricingOption = {
        category: card.getAttribute('data-category'),
        planName: card.getAttribute('data-plan-name'),
        options: JSON.parse(card.getAttribute('data-options'))
    };
    
    // Enable next button - get the DOM element first
    const nextButton = document.getElementById('pricingCardsSectionNext');
    if (nextButton) {
        enableButton(nextButton);
    } else {
        console.warn('Next button not found: pricingCardsSectionNext');
    }
}

/**
 * Set up event listeners for navigation buttons
 */
function setupEventListeners() {
    // Previous button
    const prevButton = document.getElementById('pricingCardsSectionPrev');
    if (prevButton) {
        prevButton.addEventListener('click', () => {
            // Navigate to previous step - quoteContractTerms
            try {
                showStep('quoteContractTerms');
            } catch (error) {
                console.error('Error navigating to previous step:', error);
            }
        });
    }
    
    // Next button
    const nextButton = document.getElementById('pricingCardsSectionNext');
    if (nextButton) {
        nextButton.addEventListener('click', () => {
            // Save the selected pricing option to your application state
            if (selectedPricingOption) {
                console.log('Selected pricing option:', selectedPricingOption);
                
                // Navigate to the contact information form 
                try {
                    showStep('contactInfoSection');
                } catch (error) {
                    console.error('Error navigating to contact info section:', error);
                    
                    // Fallback message if navigation fails
                    const apiResponseText = document.getElementById('apiResponseText');
                    if (apiResponseText) {
                        apiResponseText.textContent = 'Your pricing option has been selected.';
                        apiResponseText.className = 'response-message success-message';
                        apiResponseText.style.display = 'block';
                    }
                }
            }
        });
    }
}

/**
 * Get the currently selected pricing option
 * @returns {Object|null} - The selected pricing option or null if none selected
 */
export function getSelectedPricingOption() {
    return selectedPricingOption;
}

/**
 * Reset the pricing cards selection
 */
export function resetPricingCardSelection() {
    selectedPricingOption = null;
    
    const allCards = document.querySelectorAll('.pricing-card');
    allCards.forEach(c => c.classList.remove('selected'));
    
    // Disable next button - get the DOM element first
    const nextButton = document.getElementById('pricingCardsSectionNext');
    if (nextButton) {
        disableButton(nextButton);
    } else {
        console.warn('Next button not found: pricingCardsSectionNext');
    }
}
