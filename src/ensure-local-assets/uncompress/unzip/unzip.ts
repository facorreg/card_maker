import fs from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { TransformCallback } from "node:stream";
import { Transform } from "node:stream";
import type { Entry, ZipFile } from "yauzl";
import yauzl from "yauzl";
import getSubpath from "../../../utils/get-subpath.js";
import type { AsyncNoThrow, NoThrow } from "../../../utils/no-throw.js";
import asyncNoThrow from "../../../utils/no-throw.js";
import { AssetErrorCodes } from "../../types.js";

interface IterateEntriesCbOptions {
  entry: Entry;
  zipfile: ZipFile;
}

interface OnUncompressOpts {
  err: Error | null;
  entry: Entry;
  outputPath: string;
}
export type OnUncompress = ((opts: OnUncompressOpts) => Promise<void>) | void;
interface UnzipOptions {
  outputPath: string;
  zipPath: string;
  onUncompress?: OnUncompress;
}

type IterateEntriesCb = (
  opts: IterateEntriesCbOptions,
) => AsyncNoThrow<void> | NoThrow<void>;

export default class Unzip {
  onTransform?: ((chunk: Buffer, entry: Entry) => void) | null;
  onError?: (() => void) | null;
  onSuccess?: (() => void) | null;
  onUncompress?: OnUncompress;
  outputPath!: string;
  zipPath: string;
  uncompressedSize: number = 0;

  constructor({ outputPath, zipPath, onUncompress }: UnzipOptions) {
    this.outputPath = outputPath ?? "";
    this.zipPath = zipPath;
    this.onUncompress = onUncompress;
  }

  iterateEntries(callback: IterateEntriesCb): AsyncNoThrow<void> {
    return new Promise((resolve) => {
      yauzl.open(this.zipPath, { lazyEntries: true }, (err, zipfile) => {
        if (err)
          return resolve([
            new Error(AssetErrorCodes.UNZIP_OPEN_ERROR, { cause: err }),
          ]);
        zipfile.readEntry();
        zipfile.on("entry", async (entry) => {
          const isFolder = /\/$/.test(entry.fileName);

          if (!isFolder) {
            // Directory file names end with '/'.
            const promise = callback({ entry, zipfile });
            const [e] = promise instanceof Promise ? await promise : promise;

            this?.onUncompress?.({
              entry,
              outputPath: this.outputPath,
              err: e,
            });
          }

          zipfile.readEntry();
        });
        zipfile.on("error", (zipFileErr) => {
          this?.onError?.();
          return resolve([
            new Error(AssetErrorCodes.UNZIP_ERROR, { cause: zipFileErr }),
          ]);
        });
        zipfile.on("end", () => {
          this?.onSuccess?.();
          return resolve([null]);
        });
      });
    });
  }

  async mkdir(filePath: string): AsyncNoThrow<void> {
    const zipFolderSubpath = getSubpath(filePath);
    const folderPath = path.join(this.outputPath, zipFolderSubpath);

    const ntMkdir = asyncNoThrow(mkdir, new Error(AssetErrorCodes.MKDIR_ERROR));

    const [err] = await ntMkdir(folderPath, { recursive: true });

    return [err];
  }

  async uncompressEntryCallback({
    entry,
    zipfile,
  }: IterateEntriesCbOptions): AsyncNoThrow<void> {
    return new Promise((resolve) => {
      zipfile.openReadStream(entry, async (err, readStream) => {
        if (err) {
          return resolve([err]);
        }

        await this.mkdir(entry.fileName);

        const ws = fs.createWriteStream(
          path.join(this.outputPath, entry.fileName),
        );

        const done = async (e?: NodeJS.ErrnoException) => {
          ws.removeAllListeners();
          readStream.removeAllListeners();

          return resolve([e ?? null]);
        };

        ws.once("finish", done);
        ws.once("error", done);
        readStream.once("error", done);

        if (this.onTransform) {
          readStream
            .pipe(
              new Transform({
                transform: (chunk: Buffer, _, callback: TransformCallback) => {
                  this?.onTransform?.(chunk, entry);
                  callback(null, chunk);
                },
              }),
            )
            .pipe(ws);
        } else readStream.pipe(ws);
      });
    });
  }

  uncompressEntries() {
    return this.iterateEntries((opts) => this.uncompressEntryCallback(opts));
  }

  getUncompressedSizeCallback({
    entry,
  }: IterateEntriesCbOptions): NoThrow<void> {
    this.uncompressedSize += entry.uncompressedSize;
    return [null];
  }

  async getUncompressedSize(): AsyncNoThrow<number> {
    if (!this.uncompressedSize) {
      const [err] = await this.iterateEntries((opts) =>
        this.getUncompressedSizeCallback(opts),
      );
      if (err !== null) return [err];
    }

    return Promise.resolve([null, this.uncompressedSize]);
  }
}
