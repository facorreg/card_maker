import { access, constants } from "node:fs/promises";
import type { DataTypes } from "#src/types.js";
import asyncNoThrow, { type AsyncNoThrow } from "#utils/no-throw.js";
import { AssetErrorCodes, ELA_StepsCodes } from "../types.js";

type AccessMode = (typeof constants)[keyof typeof constants];

async function customAccess(
  url: string,
  c: AccessMode,
): AsyncNoThrow<void, Error | NodeJS.ErrnoException> {
  const ntAccess = asyncNoThrow<NodeJS.ErrnoException>(access);
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
): AsyncNoThrow<ELA_StepsCodes> {
  const accessFlag = type === "folder" ? constants.F_OK : constants.W_OK;
  const [err] = await customAccess(path, accessFlag);

  if (err !== null) {
    if (err.message !== AssetErrorCodes.FILE_STATE_MISSING) return [err];

    return type === "xml" || type === "folder"
      ? [null, ELA_StepsCodes.CHECK_COMPRESSED_ARCHIVE]
      : [null, ELA_StepsCodes.DOWNLOAD];
  }

  switch (type) {
    case "xml":
      return [null, ELA_StepsCodes.PARSE_FILE];
    case "gz":
      return [null, ELA_StepsCodes.UNCOMPRESS];
    case "zip":
      return [null, ELA_StepsCodes.UNCOMPRESS];
    case "folder":
      return [null, ELA_StepsCodes.NO_ACTION];
    default:
      return [null, ELA_StepsCodes.NO_ACTION];
  }
}
