export const dataModes = ['local', 'firebase-emulator', 'firebase'] as const;
export type DataMode = (typeof dataModes)[number];

export interface DataModeEnvironment {
  VITE_DATA_MODE?: string;
}

export function readDataMode(environment: DataModeEnvironment): DataMode {
  const value = environment.VITE_DATA_MODE?.trim().toLowerCase() || 'local';
  if (!dataModes.includes(value as DataMode)) {
    throw new Error(`VITE_DATA_MODE must be one of: ${dataModes.join(', ')}.`);
  }
  return value as DataMode;
}
