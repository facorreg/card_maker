import fs from "node:fs";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import { AssetErrorCodes } from "#ELA/types.js";
import type { AsyncNoThrow, NoThrow } from "#utils/no-throw.js";

type CbReturn = NoThrow<void> | AsyncNoThrow<void>;
export type OnStartGzip = (size: number) => CbReturn;
export type OnTransformGzip = (chunk: Buffer) => CbReturn;
export type OnSuccessGzip = () => CbReturn;
export type OnErrorGzip = () => CbReturn;
export type OnFinishGzip = () => CbReturn;
export interface GzipOptions {
  onStart?: OnStartGzip;
  onTransform?: OnTransformGzip;
  onSuccess?: OnSuccessGzip;
  onFinish?: OnFinishGzip;
  onError?: OnErrorGzip;
}

async function gzipUncompressedSize(path: string): AsyncNoThrow<number> {
  const fh = await fs.promises.open(path, "r");
  try {
    const stat = await fh.stat();
    const buf = Buffer.alloc(4);
    await fh.read(buf, 0, 4, stat.size - 4);

    return [null, buf.readUInt32LE(0)];
  } catch (e) {
    return [e as Error];
  } finally {
    await fh.close();
  }
}

export default async function gunzip(
  inputPath: string,
  outputPath: string,
  opts?: GzipOptions,
): AsyncNoThrow<void> {
  const [errGzSize, uncompressedSize] = await gzipUncompressedSize(inputPath);
  if (errGzSize !== null)
    return [
      new Error(AssetErrorCodes.GZIP_INVALID_FORMAT, { cause: errGzSize }),
    ]; // invalid gzip format

  await opts?.onStart?.(uncompressedSize || 0);

  const transform = new Transform({
    transform: async (chunk: Buffer, _, callback) => {
      await opts?.onTransform?.(chunk);
      callback(null, chunk);
    },
  });

  try {
    await pipeline(
      fs.createReadStream(inputPath),
      createGunzip(),
      transform,
      fs.createWriteStream(outputPath),
    );

    await opts?.onSuccess?.();
  } catch (err) {
    await opts?.onError?.();
    return [new Error(AssetErrorCodes.GZIP_ERROR, { cause: err })];
  } finally {
    await opts?.onFinish?.();
  }

  return [null];
}
