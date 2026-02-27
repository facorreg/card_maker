import type { ResultAsync } from "neverthrow";
import type { UnzipOptions } from "./types.js";
import Unzip from "./unzip.js";

export default function unzip(
  compressedPath: string,
  outputPath: string,
  opts?: UnzipOptions,
): ResultAsync<void, Error> {
  const unzip = new Unzip(compressedPath, outputPath, opts);

  return unzip.start().andThen(unzip.decompressEntries);
}
