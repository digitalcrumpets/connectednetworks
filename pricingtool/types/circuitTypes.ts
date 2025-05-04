// Circuit interface types
export type GigabitCircuitInterface = "1000BASE-T" | "1000BASE-LX" | "1000BASE-SX";
export type TenGigabitCircuitInterface = "10GBASE-LR" | "10GBASE-SR";
export type CircuitInterface = GigabitCircuitInterface | TenGigabitCircuitInterface;

// Bandwidth types with constraints
export type BandwidthUpTo1G = 
  "10 Mbit/s" | "20 Mbit/s" | "30 Mbit/s" | "40 Mbit/s" | "50 Mbit/s" | 
  "60 Mbit/s" | "70 Mbit/s" | "80 Mbit/s" | "90 Mbit/s" | "100 Mbit/s" | 
  "200 Mbit/s" | "300 Mbit/s" | "400 Mbit/s" | "500 Mbit/s" | "1 Gbit/s";

export type BandwidthUpTo10G = BandwidthUpTo1G | 
  "1.5 Gbit/s" | "2 Gbit/s" | "2.5 Gbit/s" | "3 Gbit/s" | "3.5 Gbit/s" | 
  "4 Gbit/s" | "4.5 Gbit/s" | "5 Gbit/s" | "5.5 Gbit/s" | "6 Gbit/s" | 
  "6.5 Gbit/s" | "7 Gbit/s" | "7.5 Gbit/s" | "8 Gbit/s" | "8.5 Gbit/s" | 
  "9 Gbit/s" | "9.5 Gbit/s" | "10 Gbit/s";

export type CircuitBandwidth = BandwidthUpTo10G;

// Circuit types with the discriminated union
export type Circuit1000Base = {
  circuitInterface: GigabitCircuitInterface;
  circuitBandwidth: BandwidthUpTo1G;
};

export type Circuit10GBase = {
  circuitInterface: TenGigabitCircuitInterface;
  circuitBandwidth: BandwidthUpTo10G;
};

// Union type for all possible circuit configurations
export type Circuit = Circuit1000Base | Circuit10GBase;

// Type guard functions to check interface types
export function isGigabitInterface(interfaceType: CircuitInterface): interfaceType is GigabitCircuitInterface {
  return ["1000BASE-T", "1000BASE-LX", "1000BASE-SX"].includes(interfaceType);
}

export function isTenGigabitInterface(interfaceType: CircuitInterface): interfaceType is TenGigabitCircuitInterface {
  return ["10GBASE-LR", "10GBASE-SR"].includes(interfaceType);
}

// Utility function to get available bandwidths based on interface type
export function getAvailableBandwidths(interfaceType: CircuitInterface): string[] {
  const baseOptions = [
    "10 Mbit/s", "20 Mbit/s", "30 Mbit/s", "40 Mbit/s", "50 Mbit/s",
    "60 Mbit/s", "70 Mbit/s", "80 Mbit/s", "90 Mbit/s", "100 Mbit/s",
    "200 Mbit/s", "300 Mbit/s", "400 Mbit/s", "500 Mbit/s", "1 Gbit/s"
  ];
  
  if (isGigabitInterface(interfaceType)) {
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

// Validate if a bandwidth is valid for an interface type
export function isValidBandwidthForInterface(
  interfaceType: CircuitInterface, 
  bandwidth: string
): boolean {
  if (isGigabitInterface(interfaceType)) {
    return (bandwidth as BandwidthUpTo1G) !== undefined;
  } else {
    return (bandwidth as BandwidthUpTo10G) !== undefined;
  }
}
