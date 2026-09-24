import { Select, Space, Typography } from "antd";
import { useMemo, useState } from "react";

import { getAssetRoot } from "../lib/asset-root";
import { REGION_LABELS } from "../lib/menu-matrix";
import type { RegionId } from "../types/menu";

interface RegionPreviewLinksProps {
  regionIds: RegionId[];
}

export function RegionPreviewLinks({ regionIds }: RegionPreviewLinksProps) {
  const [regionId, setRegionId] = useState<RegionId>(regionIds[0] ?? "ximen");
  const previewUrl = useMemo(() => {
    const root = getAssetRoot();
    return `${root}regions/${regionId}/`;
  }, [regionId]);

  const options = regionIds.map((id) => ({
    value: id,
    label: REGION_LABELS[id] ?? id,
  }));

  return (
    <Space wrap>
      <Typography.Text type="secondary">區域播放器預覽：</Typography.Text>
      <Select
        style={{ minWidth: 160 }}
        value={regionId}
        options={options}
        onChange={(v) => setRegionId(v as RegionId)}
      />
      <Typography.Link href={previewUrl} target="_blank" rel="noopener noreferrer">
        開啟 {REGION_LABELS[regionId] ?? regionId}
      </Typography.Link>
    </Space>
  );
}
