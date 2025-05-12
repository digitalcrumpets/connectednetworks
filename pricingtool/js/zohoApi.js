/**
 * zohoApi.js - Handles integration with Zoho CRM API
 * This file provides the functions needed to send lead data to Zoho CRM
 */

/**
 * Formats the quote data into the structure expected by the Zoho CRM API
 * @param {Object} contactInfo - Contact information (name, email, phone)
 * @param {Object} quoteData - Full quote data from the application
 * @returns {Object} - Formatted data for Zoho CRM
 */
export function formatZohoLead(contactInfo, quoteData) {
    // Extract required fields from quote data
    const { btQuoteParams, locationIdentifier, securityQuoteParams } = quoteData;
    const selectedPricing = btQuoteParams.selectedPricing || {};
    
    // Format the data according to Zoho CRM Lead entity structure
    const zohoLead = {
        // Core lead details
        "Lead_Source": "Web Pricing Tool",
        "First_Name": contactInfo.name.split(' ')[0] || contactInfo.name,
        "Last_Name": contactInfo.name.split(' ').slice(1).join(' ') || ".",
        "Email": contactInfo.email,
        "Phone": contactInfo.phone,
        
        // Address and location details
        "Postcode": locationIdentifier?.postcode || "",
        "Full_Address": locationIdentifier?.fullAddress || "",
        
        // Main service parameters
        "Service_Type": btQuoteParams.serviceType || "",
        "IP_Backbone": btQuoteParams.preferredIpBackbone || "",
        "Circuit_Interface": btQuoteParams.circuitInterface || "",
        "Circuit_Bandwidth": btQuoteParams.circuitBandwidth || "",
        "Contract_Term_Months": btQuoteParams.contractTermMonths || "",
        "Number_of_IP_Addresses": btQuoteParams.numberOfIpAddresses || "",
        
        // Dual service parameters (if applicable)
        "Dual_Internet_Config": btQuoteParams.dualInternetConfig || "",
        "Diverse_IP_Backbone": btQuoteParams.preferredDiverseIpBackbone || "",
        "Circuit_Two_Bandwidth": btQuoteParams.circuitTwoBandwidth || "",
        
        // Security parameters
        "Secure_IP_Delivery": securityQuoteParams?.secureIpDelivery === true ? "Yes" : 
                             (securityQuoteParams?.secureIpDelivery === false ? "No" : ""),
        "ZTNA_Required": securityQuoteParams?.ztnaRequired === true ? "Yes" : 
                         (securityQuoteParams?.ztnaRequired === false ? "No" : ""),
        "Number_of_ZTNA_Users": securityQuoteParams?.noOfZtnaUsers || "",
        "Threat_Prevention": securityQuoteParams?.threatPreventionRequired === true ? "Yes" : 
                            (securityQuoteParams?.threatPreventionRequired === false ? "No" : ""),
        "CASB_Required": securityQuoteParams?.casbRequired === true ? "Yes" : 
                         (securityQuoteParams?.casbRequired === false ? "No" : ""),
        "DLP_Required": securityQuoteParams?.dlpRequired === true ? "Yes" : 
                       (securityQuoteParams?.dlpRequired === false ? "No" : ""),
        "RBI_Required": securityQuoteParams?.rbiRequired === true ? "Yes" : 
                       (securityQuoteParams?.rbiRequired === false ? "No" : ""),
        
        // Selected pricing details
        "Selected_Plan": selectedPricing.planName || "",
        "Price_Category": selectedPricing.category || "",
        "Connection_Fee": selectedPricing.connectionFee || "",
        "Monthly_Rental": selectedPricing.monthlyRental || "",
        "Total_Contract_Value": calculateTotalContractValue(selectedPricing, btQuoteParams.contractTermMonths),
        
        // Full quote data for reference (JSON string)
        "Full_Quote_JSON": JSON.stringify(quoteData),
        
        // Comprehensive description
        "Description": generateQuoteDescription(quoteData)
    };
    
    return zohoLead;
}

/**
 * Calculates the total contract value based on pricing data
 * @param {Object} pricing - The selected pricing option
 * @param {number} termMonths - Contract term in months
 * @returns {string} - Total contract value
 */
function calculateTotalContractValue(pricing, termMonths) {
    if (!pricing || !pricing.monthlyRental || !termMonths) return "";
    
    const connectionFee = parseFloat(pricing.connectionFee) || 0;
    const monthlyRental = parseFloat(pricing.monthlyRental) || 0;
    const totalValue = connectionFee + (monthlyRental * termMonths);
    
    return totalValue.toFixed(2);
}

/**
 * Generates a comprehensive description of the quote for Zoho CRM
 * @param {Object} quoteData - Full quote data
 * @returns {string} - Formatted description
 */
function generateQuoteDescription(quoteData) {
    const { btQuoteParams, securityQuoteParams } = quoteData;
    const selectedPricing = btQuoteParams.selectedPricing || {};
    
    let description = "Quote from pricing tool:\n\n";
    
    // Basic service details
    description += `Service Type: ${btQuoteParams.serviceType || 'N/A'}\n`;
    description += `IP Backbone: ${btQuoteParams.preferredIpBackbone || 'N/A'}\n`;
    description += `Circuit Interface: ${btQuoteParams.circuitInterface || 'N/A'}\n`;
    description += `Circuit Bandwidth: ${btQuoteParams.circuitBandwidth || 'N/A'}\n`;
    description += `Contract Term: ${btQuoteParams.contractTermMonths || 'N/A'} months\n`;
    description += `Number of IP Addresses: ${btQuoteParams.numberOfIpAddresses || 'N/A'}\n\n`;
    
    // Dual internet specific details
    if (btQuoteParams.serviceType === 'dual') {
        description += "Dual Internet Details:\n";
        description += `Configuration: ${btQuoteParams.dualInternetConfig || 'N/A'}\n`;
        
        if (btQuoteParams.dualInternetConfig === 'Active / Active') {
            description += `Diverse IP Backbone: ${btQuoteParams.preferredDiverseIpBackbone || 'N/A'}\n`;
            description += `Circuit 2 Bandwidth: ${btQuoteParams.circuitTwoBandwidth || 'N/A'}\n`;
        }
        description += '\n';
    }
    
    // Security options if selected
    if (securityQuoteParams && securityQuoteParams.secureIpDelivery) {
        description += "Security Options:\n";
        description += `Secure IP Delivery: ${securityQuoteParams.secureIpDelivery ? 'Yes' : 'No'}\n`;
        
        if (securityQuoteParams.ztnaRequired) {
            description += `ZTNA Required: Yes\n`;
            description += `Number of ZTNA Users: ${securityQuoteParams.noOfZtnaUsers || 'N/A'}\n`;
        }
        
        if (securityQuoteParams.threatPreventionRequired) {
            description += `Threat Prevention: Yes\n`;
            description += `CASB Required: ${securityQuoteParams.casbRequired ? 'Yes' : 'No'}\n`;
            description += `DLP Required: ${securityQuoteParams.dlpRequired ? 'Yes' : 'No'}\n`;
            description += `RBI Required: ${securityQuoteParams.rbiRequired ? 'Yes' : 'No'}\n`;
        }
        description += '\n';
    }
    
    // Selected pricing
    description += "Selected Pricing:\n";
    description += `Category: ${selectedPricing.category || 'N/A'}\n`;
    description += `Plan: ${selectedPricing.planName || 'N/A'}\n`;
    description += `Connection Fee: ${selectedPricing.connectionFee || 'N/A'}\n`;
    description += `Monthly Rental: ${selectedPricing.monthlyRental || 'N/A'}\n`;
    
    if (selectedPricing.monthlyRental && btQuoteParams.contractTermMonths) {
        const total = calculateTotalContractValue(selectedPricing, btQuoteParams.contractTermMonths);
        description += `Total Contract Value: ${total}\n`;
    }
    
    return description;
}

/**
 * Sends a lead to Zoho CRM via the backend API endpoint
 * @param {Object} leadData - Formatted Zoho CRM lead data
 * @returns {Promise} - Promise that resolves with the Zoho CRM API response
 */
export async function sendLeadToZoho(leadData) {
    try {
        const response = await fetch('/api/zoho/lead', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(leadData),
        });
        
        if (!response.ok) {
            throw new Error(`Zoho CRM API error: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error sending lead to Zoho CRM:', error);
        throw error;
    }
}
