import { rm, unlink } from "node:fs/promises";
import type { AsyncNoThrow } from "../ensure-local-assets/constants.js";

type DeletionStates = "success" | "not_found" | "other";
type DeletionStatesError = Exclude<DeletionStates, "success">;
interface DeletionResolve {
  state: DeletionStates;
  path: string;
}

export class DeletionError extends Error {
  state: DeletionStatesError;
  path: string;
  override cause: NodeJS.ErrnoException;

  constructor(
    state: DeletionStatesError,
    path: string,
    cause: NodeJS.ErrnoException,
  ) {
    super();

    this.state = state;
    this.path = path;
    this.cause = cause;
  }
}

export type DeletionReturn = AsyncNoThrow<DeletionResolve, DeletionError>;

export default async function safeDeletion(
  path: string,
  isDir: boolean,
): DeletionReturn {
  try {
    await (isDir ? rm(path, { recursive: true }) : unlink(path));
    const ret = { state: "success", path } as DeletionResolve;
    return [null, ret];
  } catch (e) {
    const error = e as NodeJS.ErrnoException;

    const deletionError = new DeletionError(
      error.code === "ENOENT" ? "not_found" : "other",
      path,
      error,
    );

    return [deletionError];
  }
}
