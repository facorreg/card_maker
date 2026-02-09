import { rm, unlink } from "node:fs/promises";
import { AssetErrorCodes } from "../ensure-local-assets/errors.js";
import type { AsyncNoThrow } from "./no-throw.js";
import asyncNoThrow from "./no-throw.js";

export class DeletionError extends Error {
  state: AssetErrorCodes;
  path: string;
  override cause: NodeJS.ErrnoException;

  constructor(
    state: AssetErrorCodes,
    path: string,
    cause: NodeJS.ErrnoException,
  ) {
    super();

    this.state = state;
    this.path = path;
    this.cause = cause;
  }
}

export type DeletionReturn = AsyncNoThrow<undefined, DeletionError>;

export default async function safeDeletion(
  path: string,
  isDir: boolean,
): DeletionReturn {
  const ntRm = asyncNoThrow(rm);
  const ntUnlink = asyncNoThrow(unlink);

  const [err] = await (isDir
    ? ntRm(path, { recursive: true })
    : ntUnlink(path));

  if (err === null) return [null];

  const deletionError = new DeletionError(
    err.code === "ENOENT"
      ? AssetErrorCodes.DELETION_FILE_NOT_FOUND
      : AssetErrorCodes.DELETION_FAILED,
    path,
    err,
  );

  return [deletionError];
}
