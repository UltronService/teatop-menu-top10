import Ajv from "ajv";

import menuSchema from "../../../data/menu.schema.json";

const ajv = new Ajv({ allErrors: true, strict: false });
const validateMenu = ajv.compile(menuSchema);

export function validateMenuDocument(doc: unknown): { ok: true } | { ok: false; message: string } {
  const valid = validateMenu(doc);
  if (valid) {
    return { ok: true };
  }
  const first = validateMenu.errors?.[0];
  const detail = first ? `${first.instancePath || "/"} ${first.message ?? ""}`.trim() : "schema 驗證失敗";
  return { ok: false, message: detail };
}
