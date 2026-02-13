import type { AsyncNoThrow } from "#utils/no-throw.js";
import type { UnzipOptions } from "./types.js";
import Unzip from "./unzip.js";

export default async function unzip(
  compressedPath: string,
  outputPath: string,
  opts?: UnzipOptions,
): AsyncNoThrow<void> {
  const unzip = new Unzip(compressedPath, outputPath, opts);
  await unzip.start();

  return unzip.decompressEntries();
}
