import { access, constants } from "node:fs/promises";
import type { DataTypes } from "./constants.js";
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

export default async function customAccessHandler(
  path: string,
  type: DataTypes,
): Promise<STEPS> {
  try {
    const accessFlag = type === "folder" ? constants.F_OK : constants.W_OK;
    await customAccess(path, accessFlag);

    switch (type) {
      case "xml":
        return STEPS.PARSE_FILE;
      case "gz":
        return STEPS.UNZIP;
      case "zip":
        return STEPS.UNZIP;
      case "folder":
        return STEPS.NO_ACTION;
      default:
        return STEPS.NO_ACTION;
    }
  } catch (e) {
    const err = e as NodeJS.ErrnoException;

    if (err.code !== AssetErrorCodes.FILE_STATE_MISSING)
      return Promise.reject(err);

    return type === "xml" || type === "folder"
      ? STEPS.CHECK_COMPRESSED_ARCHIVE
      : STEPS.DOWNLOAD;
  }
}
