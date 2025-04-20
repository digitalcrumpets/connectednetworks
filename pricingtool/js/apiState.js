// Manages the state of the quote API data (loading, saving, getting, setting)

// --- Default Structure ---
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
    preferredDiverseIpBackbone: null, // Note: Typo kept for consistency
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

let api = {}; // Initialize empty, will be populated on load

// --- Helper Functions ---
const isObject = (item) => item && typeof item === 'object' && !Array.isArray(item);

const deepMerge = (target, source) => {
  Object.keys(source).forEach(key => {
    const targetValue = target[key];
    const sourceValue = source[key];

    if (isObject(targetValue) && isObject(sourceValue)) {
      deepMerge(targetValue, sourceValue);
    } else {
      if (sourceValue !== null && sourceValue !== undefined) {
         target[key] = sourceValue;
      } else if (targetValue === undefined) {
         target[key] = sourceValue;
      }
    }
  });
  return target;
};

// --- Core API State Functions ---

/**
 * Loads API data from localStorage, merging with defaults.
 */
export const loadApiData = () => {
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

/**
 * Saves the current API state to localStorage.
 */
export const saveApiData = () => {
  try {
    localStorage.setItem('api', JSON.stringify(api));
    // Backup saving might be removed if deemed unnecessary
    localStorage.setItem('quoteBackup', JSON.stringify(api));
  } catch (error) {
    console.error("Error saving API data to localStorage:", error);
  }
};

/**
 * Resets the API state to the default structure and saves it.
 */
export const resetApiToDefaults = () => {
  api = structuredClone(defaultApiStructure);
  saveApiData();
};

/**
 * Gets a value from the API state using dot notation.
 * @param {string} key - The dot notation key (e.g., 'btQuoteParams.serviceType').
 * @returns {any} The value or undefined if not found.
 */
export const getApiValue = (key) => {
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
};

/**
 * Sets a value in the API state using dot notation and saves the state.
 * @param {string} key - The dot notation key (e.g., 'btQuoteParams.serviceType').
 * @param {any} value - The value to set.
 */
export const setApiValue = (key, value) => {
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

/**
 * Removes empty (null, undefined, '') values recursively from an object.
 * Does not modify the original object.
 * @param {object} obj - The object to clean.
 * @returns {object} A new object with empty values removed.
 */
export const removeEmptyValues = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;

  const newObj = Array.isArray(obj) ? [] : {};

  Object.keys(obj).forEach(key => {
    const value = obj[key];
    if (value !== null && value !== undefined && value !== '') {
      if (typeof value === 'object') {
        const cleanedValue = removeEmptyValues(value);
        // Keep object/array only if it still has content after cleaning
        if (Object.keys(cleanedValue).length > 0 || (Array.isArray(cleanedValue) && cleanedValue.length > 0)) {
            newObj[key] = cleanedValue;
        }
      } else {
        newObj[key] = value;
      }
    }
  });
  return newObj;
};

/**
 * Returns the entire current API state object.
 * Note: This returns a reference. Modify with caution or use deepClone.
 * @returns {object} The current API state.
 */
export const getFullApiState = () => {
    return api;
};

export { getFullApiState as getFullApiData };

export { resetApiToDefaults as resetApiData };

export { loadApiData as initializeApiState };
