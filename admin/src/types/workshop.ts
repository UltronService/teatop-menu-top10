export interface AssetWorkshopDocument {
  version: number;
  iconToggles: Record<string, boolean>;
  leafPicks: Record<string, string>;
  exportedAt: string;
}

export const EMPTY_WORKSHOP_SEED: AssetWorkshopDocument = {
  version: 1,
  iconToggles: {},
  leafPicks: {},
  exportedAt: new Date(0).toISOString(),
};
