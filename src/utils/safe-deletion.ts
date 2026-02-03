import { rm, unlink } from "node:fs/promises";

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

type DeletionReturn = Promise<DeletionResolve | DeletionError>;

export default function safeDeletion(
  path: string,
  isDir: boolean,
): DeletionReturn {
  return (isDir ? rm(path, { recursive: true }) : unlink(path))
    .then(() => ({ state: "success", path }) as DeletionResolve)
    .catch((e) => {
      const error = e as NodeJS.ErrnoException;

      const deletionError = new DeletionError(
        error.code === "ENOENT" ? "not_found" : "other",
        path,
        e,
      );

      return Promise.reject(deletionError);
    });
}
