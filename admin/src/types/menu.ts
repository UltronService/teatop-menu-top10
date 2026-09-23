export type RegionId =
  | "central"
  | "central-smart"
  | "mrt-tamsui"
  | "north"
  | "north-smart"
  | "south"
  | "ximen";

export interface RegionCell {
  rank: number | null;
  priceL: number | null;
}

export interface MenuItem {
  id: string;
  nameZh: string;
  nameEn?: string;
  image: string;
  regions: Partial<Record<RegionId, { rank?: number | null; priceL?: number | null }>>;
}

export interface MenuDocument {
  version: number;
  regions: RegionId[];
  items: MenuItem[];
}

export interface CatalogEntry {
  nameZh: string;
  nameEn: string;
}

export interface MenuDraftDocument {
  overrides: Record<string, RegionCell>;
  updatedAt?: string;
}

export interface PublishLogMeta {
  lastPublishedAt?: string;
  lastPublishedMenuVersion?: number;
  lastPublishedAssetWorkshopVersion?: number;
  lastPublishedBy?: string;
}
