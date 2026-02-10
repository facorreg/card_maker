import { access, constants } from "node:fs/promises";
import type { AsyncNoThrow } from "../../utils/no-throw.js";
import asyncNoThrow from "../../utils/no-throw.js";
import type { DataTypes } from "../types.js";
import { AssetErrorCodes, STEPS } from "../types.js";

type AccessMode = (typeof constants)[keyof typeof constants];

async function customAccess(
  url: string,
  c: AccessMode,
): AsyncNoThrow<undefined> {
  const ntAccess = asyncNoThrow(access);
  const [err] = await ntAccess(url, c);

  if (err === null) return [null];

  const errCode =
    err.code === "ENOENT"
      ? AssetErrorCodes.FILE_STATE_MISSING
      : AssetErrorCodes.FILE_STATE_UNREACHABLE;

  return [new Error(errCode, { cause: err })];
}

export default async function customAccessHandler(
  path: string,
  type: DataTypes,
): AsyncNoThrow<STEPS, Error> {
  const accessFlag = type === "folder" ? constants.F_OK : constants.W_OK;
  const [err] = await customAccess(path, accessFlag);

  if (err !== null) {
    if (err.code !== AssetErrorCodes.FILE_STATE_MISSING) return [err];

    return type === "xml" || type === "folder"
      ? [null, STEPS.CHECK_COMPRESSED_ARCHIVE]
      : [null, STEPS.DOWNLOAD];
  }

  switch (type) {
    case "xml":
      return [null, STEPS.PARSE_FILE];
    case "gz":
      return [null, STEPS.UNCOMPRESS];
    case "zip":
      return [null, STEPS.UNCOMPRESS];
    case "folder":
      return [null, STEPS.NO_ACTION];
    default:
      return [null, STEPS.NO_ACTION];
  }
}
