import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Result } from "neverthrow";
import {
  ELA_ErrorCodes,
  ELA_IoError,
  InterfaceError,
  InterfaceErrorCodes,
} from "#ELA/types.js";
import type { Manifest } from "#src/types.js";
import { readUtf8File } from "#utils/neverthrow/fs.js";
import { safeJsonParse } from "#utils/neverthrow/json.js";

export default function getDictionariesManifest(): Result<
  Manifest[],
  ELA_IoError
> {
  const root = path.resolve(fileURLToPath(new URL("../../", import.meta.url)));
  const assetPath = path.join(root, "dictionaries.manifest.json");

  return readUtf8File(assetPath)
    .mapErr(
      (e) => new ELA_IoError(ELA_ErrorCodes.MANIFEST_UNREADABLE, assetPath, e),
    )
    .andThen(safeJsonParse)
    .mapErr((e) => new InterfaceError(InterfaceErrorCodes.BAD_JSON, e));
}
