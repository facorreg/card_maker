import fs from "node:fs";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { ELA_ErrorCodes, ELA_IoError } from "#ELA/types.js";

export type OnStartGzip = (size: number) => ResultAsync<void, Error>;
export type OnTransformGzip = (chunk: Buffer) => void;
export type OnSuccessGzip = () => void;
export type OnErrorGzip = () => void;
export type OnFinishGzip = () => void;
export interface GzipOptions {
  onStart?: OnStartGzip;
  onTransform?: OnTransformGzip;
  onSuccess?: OnSuccessGzip;
  onFinish?: OnFinishGzip;
  onError?: OnErrorGzip;
}

function gzipDecompressedSize(path: string): ResultAsync<number, Error> {
  return ResultAsync.fromPromise(
    fs.promises.open(path, "r"),
    (e) => e as Error,
  ).andThen((fh) => {
    return ResultAsync.fromPromise(fh.stat(), (e) => e as Error).andThen(
      (stat) => {
        const buf = Buffer.alloc(4);
        return ResultAsync.fromPromise(
          fh.read(buf, 0, 4, stat.size - 4),
          (e) => e as Error,
        )
          .andThen(() => okAsync(buf.readUInt32LE(0)))
          .andTee(fh.close)
          .orTee(fh.close);
      },
    );
  });
}

export default function gunzip(
  compressedPath: string,
  outputPath: string,
  opts?: GzipOptions,
): ResultAsync<void, Error> {
  const { onStart, onTransform, onFinish, onSuccess } = opts || {};

  const transform = new Transform({
    transform: (chunk: Buffer, _, callback) => {
      onTransform?.(chunk);
      callback(null, chunk);
    },
  });

  return gzipDecompressedSize(compressedPath)
    .orElse((error) =>
      errAsync(
        new ELA_IoError(ELA_ErrorCodes.GZIP_INVALID_FORMAT, outputPath, error),
      ),
    )
    .andThen((gzipDecompressedSize) =>
      onStart ? onStart(gzipDecompressedSize || 0) : okAsync(),
    )
    .andThen(() =>
      ResultAsync.fromPromise(
        pipeline(
          fs.createReadStream(compressedPath),
          createGunzip(),
          transform,
          fs.createWriteStream(outputPath),
        ),
        (e) => e,
      ).orElse((error) =>
        errAsync(new ELA_IoError(ELA_ErrorCodes.GZIP_ERROR, outputPath, error)),
      ),
    )
    .orTee(() => {
      onFinish?.();
    })
    .andTee(() => {
      onSuccess?.();
      onFinish?.();
    });
}
