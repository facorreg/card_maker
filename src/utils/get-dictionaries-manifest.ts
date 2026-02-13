import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Manifest } from "#src/types.js";

export default function getDictionariesManifest(): Manifest[] | null {
  const root = path.resolve(fileURLToPath(new URL("../../", import.meta.url)));
  const assetPath = path.join(root, "dictionaries.manifest.json");

  const file = fs.readFileSync(assetPath, { encoding: "utf8", flag: "r" });

  return file !== null ? (JSON.parse(file) as Manifest[]) : null;
}
