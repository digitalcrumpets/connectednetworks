// Example of using the circuit types
import { 
  Circuit, 
  CircuitInterface,
  isGigabitInterface,
  getAvailableBandwidths,
  isValidBandwidthForInterface
} from './circuitTypes';

// Example 1: Using the Circuit type
// This enforces the relationship between circuitInterface and circuitBandwidth at compile time
const validGigabitCircuit: Circuit = {
  circuitInterface: "1000BASE-T",
  circuitBandwidth: "500 Mbit/s" // Valid for 1000BASE-T
};

// TypeScript would show an error for this:
// const invalidGigabitCircuit: Circuit = {
//   circuitInterface: "1000BASE-T",
//   circuitBandwidth: "5 Gbit/s" // Error: Type '"5 Gbit/s"' is not assignable to type 'BandwidthUpTo1G'
// };

const validTenGigabitCircuit: Circuit = {
  circuitInterface: "10GBASE-LR",
  circuitBandwidth: "5 Gbit/s" // Valid for 10GBASE-LR
};

// Example 2: Dynamically updating bandwidth options based on selected interface
function updateBandwidthOptions(selectedInterface: CircuitInterface): void {
  const availableBandwidths = getAvailableBandwidths(selectedInterface);
  
  // Example of using the available bandwidths to populate a dropdown
  console.log(`Available bandwidths for ${selectedInterface}:`, availableBandwidths);
  
  // In a real app, you would update your dropdown here
  // const dropdown = document.getElementById('bandwidthDropdown');
  // dropdown.innerHTML = '';
  // availableBandwidths.forEach(bandwidth => {
  //   const option = document.createElement('option');
  //   option.value = bandwidth;
  //   option.textContent = bandwidth;
  //   dropdown.appendChild(option);
  // });
}

// Example 3: Validating user input at runtime
function validateCircuitSelection(interfaceType: CircuitInterface, bandwidth: string): boolean {
  if (!isValidBandwidthForInterface(interfaceType, bandwidth)) {
    console.error(`Invalid bandwidth "${bandwidth}" for interface type "${interfaceType}"`);
    return false;
  }
  return true;
}

// Example 4: Handling user selections
function handleInterfaceSelection(selectedInterface: CircuitInterface): void {
  // When interface type changes, update bandwidth options
  updateBandwidthOptions(selectedInterface);
  
  // If we already have a bandwidth selected, validate it's still valid
  const currentBandwidth = "5 Gbit/s"; // This would come from your form
  
  if (!isValidBandwidthForInterface(selectedInterface, currentBandwidth)) {
    console.log("Selected bandwidth is not compatible with the new interface type. Resetting to a valid option.");
    
    // Reset to a valid option for this interface
    const validOptions = getAvailableBandwidths(selectedInterface);
    const defaultBandwidth = validOptions[0]; // First valid option
    
    // Update your form with the default bandwidth
    console.log(`Resetting bandwidth to ${defaultBandwidth}`);
    
    // In a real app:
    // document.getElementById('bandwidthField').value = defaultBandwidth;
  }
}
