import { rm, unlink } from "node:fs/promises";
import { AssetError, AssetErrorCodes } from "../ensure-local-assets/types.js";
import type { AsyncNoThrow } from "./no-throw.js";
import asyncNoThrow from "./no-throw.js";

export default async function safeDeletion(
  path: string,
  isDir: boolean,
): AsyncNoThrow<undefined, AssetError> {
  const ntRm = asyncNoThrow(rm);
  const ntUnlink = asyncNoThrow(unlink);

  const [err] = await (isDir
    ? ntRm(path, { recursive: true })
    : ntUnlink(path));

  if (err === null) return [null];

  const deletionError = new AssetError(
    err.code === "ENOENT"
      ? AssetErrorCodes.DELETION_FILE_NOT_FOUND
      : AssetErrorCodes.DELETION_FAILED,
  );

  return [deletionError];
}
