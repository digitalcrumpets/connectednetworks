/**
 * Pricing scenarios handler for Connected Networks Pricing Tool
 * Handles the different pricing scenarios based on the API request parameters
 */

// Determines which pricing scenario applies based on the API request parameters
export function determinePricingScenario(api) {
    if (!api.btQuoteParams) return null;
    
    const {
        serviceType,
        preferredIpBackbone,
        dualInternetConfig,
        circuitInterface,
        circuitBandwidth,
        preferredDiverseIpBackbone,
        circuitTwoBandwidth
    } = api.btQuoteParams;
    
    // Validate required parameters for any scenario
    if (!circuitInterface || !circuitBandwidth) {
        console.error('Missing required parameters: circuitInterface and circuitBandwidth are required for all scenarios');
        return null;
    }
    
    // Scenario 1: Single service with BT as preferred IP backbone
    if (serviceType === 'single' && preferredIpBackbone === 'BT') {
        return {
            scenario: 'scenario1',
            description: 'Single service with BT as preferred IP backbone'
        };
    }
    
    // Scenario 3: Single service with non-BT as preferred IP backbone
    if (serviceType === 'single' && preferredIpBackbone && preferredIpBackbone !== 'BT') {
        return {
            scenario: 'scenario3',
            description: 'Single service with non-BT as preferred IP backbone',
            applyEtherflowMarkup: true
        };
    }
    
    // Scenario 2 part 1: Dual service with Active/Passive configuration
    if (serviceType === 'dual' && dualInternetConfig === 'Active / Passive') {
        return {
            scenario: 'scenario2part1',
            description: 'Dual service with Active/Passive configuration'
        };
    }
    
    // Scenario 2 parts 1 & 2: Dual service with Active/Active configuration
    if (serviceType === 'dual' && dualInternetConfig === 'Active / Active' && 
        preferredDiverseIpBackbone && circuitTwoBandwidth) {
        return {
            scenario: 'scenario2both',
            description: 'Dual service with Active/Active configuration',
            applyEtherflowMarkup: true,
            markupTarget: 'circuit2'
        };
    }
    
    // No valid scenario detected
    console.warn('No valid pricing scenario detected with the current parameters');
    return null;
}

// Processes the API response based on the pricing scenario
export function processPricingResponse(response, scenario) {
    if (!scenario) return response;
    
    // Create a deep copy of the response to avoid modifying the original
    const processedResponse = JSON.parse(JSON.stringify(response));
    
    // Apply 50% markup to etherflow pricing for scenario 3
    if (scenario.applyEtherflowMarkup) {
        if (scenario.markupTarget === 'circuit2') {
            // Apply markup to circuit 2 etherflow pricing
            if (processedResponse.circuit2 && processedResponse.circuit2.etherflow) {
                applyEtherflowMarkup(processedResponse.circuit2.etherflow);
            }
        } else {
            // Apply markup to main etherflow pricing
            if (processedResponse.etherflow) {
                applyEtherflowMarkup(processedResponse.etherflow);
            }
        }
    }
    
    return processedResponse;
}

// Helper function to apply 50% markup to etherflow pricing
function applyEtherflowMarkup(etherflow, markupPercentage = 0.5) {
    if (!etherflow) return;
    
    // Apply markup to connection charges
    if (etherflow.connectionCharges) {
        for (const term in etherflow.connectionCharges) {
            etherflow.connectionCharges[term] *= (1 + markupPercentage);
        }
    }
    
    // Apply markup to rental charges
    if (etherflow.rentalCharges) {
        for (const term in etherflow.rentalCharges) {
            etherflow.rentalCharges[term] *= (1 + markupPercentage);
        }
    }
    
    // Apply markup to any other relevant pricing fields
    if (etherflow.monthlyPrice) {
        etherflow.monthlyPrice *= (1 + markupPercentage);
    }
    
    if (etherflow.connectionPrice) {
        etherflow.connectionPrice *= (1 + markupPercentage);
    }
    
    // Mark the prices as having been adjusted
    etherflow.priceAdjusted = true;
    etherflow.markupApplied = `${markupPercentage * 100}%`;
}

// Validate that the selected bandwidth is compatible with the interface
export function isValidBandwidthForInterface(interfaceType, bandwidth) {
    if (!interfaceType || !bandwidth) return false;
    
    // 1Gbit interfaces can only have bandwidths up to 1Gbit/s
    const is1GbitInterface = ['1000BASE-T', '1000BASE-LX', '1000BASE-SX'].includes(interfaceType);
    
    if (is1GbitInterface) {
        // Extract the numeric value and unit from the bandwidth
        const match = bandwidth.match(/^([\d.]+)\s*(Gbit\/s|Mbit\/s)$/);
        if (!match) return false;
        
        const [, valueStr, unit] = match;
        const value = parseFloat(valueStr);
        
        // For 1Gbit interfaces, if the unit is Gbit/s, the value must be <= 1
        if (unit === 'Gbit/s' && value > 1) {
            return false;
        }
    }
    
    return true;
}

// Get available bandwidths based on interface type
export function getAvailableBandwidths(interfaceType) {
    const baseOptions = [
        "10 Mbit/s", "20 Mbit/s", "30 Mbit/s", "40 Mbit/s", "50 Mbit/s",
        "60 Mbit/s", "70 Mbit/s", "80 Mbit/s", "90 Mbit/s", "100 Mbit/s",
        "200 Mbit/s", "300 Mbit/s", "400 Mbit/s", "500 Mbit/s", "1 Gbit/s"
    ];
    
    const is1GbitInterface = ['1000BASE-T', '1000BASE-LX', '1000BASE-SX'].includes(interfaceType);
    
    if (is1GbitInterface) {
        return baseOptions;
    }
    
    // For 10G interfaces, add higher bandwidth options
    const higherOptions = [
        "1.5 Gbit/s", "2 Gbit/s", "2.5 Gbit/s", "3 Gbit/s", "3.5 Gbit/s",
        "4 Gbit/s", "4.5 Gbit/s", "5 Gbit/s", "5.5 Gbit/s", "6 Gbit/s",
        "6.5 Gbit/s", "7 Gbit/s", "7.5 Gbit/s", "8 Gbit/s", "8.5 Gbit/s",
        "9 Gbit/s", "9.5 Gbit/s", "10 Gbit/s"
    ];
    
    return [...baseOptions, ...higherOptions];
}
