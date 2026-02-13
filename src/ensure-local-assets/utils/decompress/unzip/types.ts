import type { Entry } from "yauzl";
import type { AsyncNoThrow, NoThrow } from "#utils/no-throw.js";

type cbReturn = NoThrow<void> | AsyncNoThrow<void>;
export type OnGetDecompressedSizeErrorUnzip = (err: Error) => cbReturn;
export type OnStartUnzip = (size: number) => cbReturn;
export type OnTransformUnzip = (chunk: Buffer, entry: Entry) => cbReturn;
export type OnDecompressUnzip = (
  entry: Entry,
  outputPath: string,
  err: Error | null,
) => cbReturn;
export type OnErrorUnzip = () => cbReturn;
export type OnSuccessUnzip = () => cbReturn;

export interface UnzipOptions {
  onGetDecompressedSizeError: OnGetDecompressedSizeErrorUnzip;
  onStart: OnStartUnzip;
  onTransform: OnTransformUnzip;
  onDecompress: OnDecompressUnzip;
  onSuccess: OnSuccessUnzip;
  onError: OnErrorUnzip;
  renameTo?: string;
}
