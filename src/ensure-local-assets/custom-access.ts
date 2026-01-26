import { access, constants } from "node:fs/promises";
import { STEPS } from "./constants.js";
import { AssetError, AssetErrorCodes } from "./errors.js";

type AccessMode = (typeof constants)[keyof typeof constants];

async function customAccess(url: string, c: AccessMode): Promise<boolean> {
  try {
    await access(url, c);
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    const errCode =
      err.code === "ENOENT"
        ? AssetErrorCodes.FILE_STATE_MISSING
        : AssetErrorCodes.FILE_STATE_UNREACHABLE;
    return Promise.reject(new AssetError({ code: errCode, cause: err }));
  }

  return true;
}

export default function customAccessHandler(
  filePath: string,
  extension: string,
): Promise<STEPS> {
  const isXmlExt = extension === "xml";

  return customAccess(filePath, constants.W_OK)
    .then(() => (isXmlExt ? STEPS.PARSE_FILE : STEPS.DECOMPRESS))
    .catch((err) => {
      if (err.code !== AssetErrorCodes.FILE_STATE_MISSING)
        return Promise.reject(err);

      return isXmlExt ? STEPS.CHECK_COMPRESSED_ARCHIVE : STEPS.DOWNLOAD;
    });
}
