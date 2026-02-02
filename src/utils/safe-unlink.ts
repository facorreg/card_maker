import { unlink } from "node:fs/promises";

type UnlinkStates = "success" | "not_found" | "other";
type UnlinkStatesError = Exclude<UnlinkStates, "success">;
interface UnlinkReturn {
  state: UnlinkStates;
  path: string;
}

export class UnlinkError extends Error {
  state: UnlinkStatesError;
  path: string;
  override cause: NodeJS.ErrnoException;

  constructor(
    state: UnlinkStatesError,
    path: string,
    cause: NodeJS.ErrnoException,
  ) {
    super();

    this.state = state;
    this.path = path;
    this.cause = cause;
  }
}

export default function safeUnlink(
  filePath: string,
): Promise<UnlinkReturn | UnlinkError> {
  return unlink(filePath)
    .then(() => ({ state: "success", path: filePath }) as UnlinkReturn)
    .catch((e) => {
      const error = e as NodeJS.ErrnoException;

      const unlinkError = new UnlinkError(
        error.code === "ENOENT" ? "not_found" : "other",
        filePath,
        e,
      );

      return Promise.reject(unlinkError);
    });
}
