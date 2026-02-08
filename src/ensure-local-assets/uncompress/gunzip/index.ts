import fs from "node:fs";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import type { AsyncNoThrow } from "../../constants.js";
import type { MultiBar } from "../../progress/index.js";

async function gzipUncompressedSize(path: string): AsyncNoThrow<number> {
  const fh = await fs.promises.open(path, "r");
  try {
    const stat = await fh.stat();
    const buf = Buffer.alloc(4);
    await fh.read(buf, 0, 4, stat.size - 4);

    return [null, buf.readUInt32LE(0)];
  } catch (e) {
    return [e as NodeJS.ErrnoException];
  } finally {
    await fh.close();
  }
}

export default async function gunzip(
  outputPath: string,
  inputPath: string,
  inputFileName: string,
  multiBar: MultiBar,
): AsyncNoThrow<undefined> {
  const [errGzSize, uncompressedSize] = await gzipUncompressedSize(inputPath);
  if (errGzSize !== null) return [errGzSize]; // invalid gzip format

  const [errPb, pb] = multiBar.create(
    inputFileName,
    "uncompress",
    uncompressedSize,
  );
  /* handle Log */
  if (errPb) {
  }

  let uncompressed = 0;

  const transform = new Transform({
    transform: (chunk: Buffer, _, callback) => {
      uncompressed += chunk.length;
      pb?.update?.(uncompressed);
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

    pb?.success();
  } catch (err) {
    pb?.error();
    return [err as NodeJS.ErrnoException];
  } finally {
    pb?.stop();
  }

  return [null];
}
