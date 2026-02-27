import type { ResultAsync } from "neverthrow";
import type { Entry } from "yauzl";
// import type { AsyncNoThrow, NoThrow } from "#utils/no-throw.js";

// type cbReturn = NoThrow<void> | AsyncNoThrow<void>;
export type OnGetDecompressedSizeErrorUnzip = (
  err: Error,
) => ResultAsync<void, Error>;
export type OnStartUnzip = (size: number) => ResultAsync<void, Error>;
export type OnTransformUnzip = (chunk: Buffer, entry: Entry) => void;
export type OnDecompressUnzip = (
  entry: Entry,
  outputPath: string,
  // err: Error | null,
) => ResultAsync<void, Error>;
export type OnErrorUnzip = () => void;
export type OnSuccessUnzip = () => void;

export interface UnzipOptions {
  onGetDecompressedSizeError: OnGetDecompressedSizeErrorUnzip;
  onStart: OnStartUnzip;
  onTransform: OnTransformUnzip;
  onDecompress: OnDecompressUnzip;
  onSuccess: OnSuccessUnzip;
  onError: OnErrorUnzip;
  renameTo?: string;
}
