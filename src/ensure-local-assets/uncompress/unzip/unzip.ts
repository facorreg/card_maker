import fs from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { TransformCallback } from "node:stream";
import { Transform } from "node:stream";
import type { Entry, ZipFile } from "yauzl";
import yauzl from "yauzl";
import type { AsyncNoThrow, NoThrow } from "../../../utils/no-throw.js";

interface IterateEntriesCbOptions {
  entry: Entry;
  zipfile: ZipFile;
}

interface UnzipOptions {
  extractPath: string;
  zipPath: string;
}

type IterateEntriesCb = (
  opts: IterateEntriesCbOptions,
) => AsyncNoThrow<string> | NoThrow<undefined>;

export default class Unzip {
  onTransform?: ((chunk: Buffer, entry: Entry) => undefined) | null;
  onError?: (() => undefined) | null;
  onSuccess?: (() => undefined) | null;
  extractPath!: string;
  zipPath: string;
  uncompressedSize: number = 0;

  constructor({ extractPath, zipPath }: UnzipOptions) {
    this.extractPath = extractPath ?? "";
    this.zipPath = zipPath;
  }

  iterateEntries(callback: IterateEntriesCb): AsyncNoThrow<string> {
    return new Promise((resolve) => {
      yauzl.open(this.zipPath, { lazyEntries: true }, (err, zipfile) => {
        if (err) return resolve([err]);
        zipfile.readEntry();
        zipfile.on("entry", async (entry) => {
          const isFolder = /\/$/.test(entry.fileName);

          if (!isFolder) {
            // Directory file names end with '/'.
            const promise = callback({ entry, zipfile });
            const [_] = promise instanceof Promise ? await promise : promise;

            // replace with an on error ft
          }

          zipfile.readEntry();
        });
        zipfile.on("error", () => {
          // todo: better error handling
          this?.onError?.();
          return resolve([new Error("error occurred")]);
        });
        zipfile.on("end", () => {
          this?.onSuccess?.();
          return resolve([null, "finish"]);
        });
      });
    });
  }

  async mkdir(fileName: string) {
    const regexp = RegExp(/.*(\/)/g);

    const [zipFolderSubpath = ""] = regexp.exec(fileName) || [];
    const folderPath = path.join(this.extractPath, zipFolderSubpath);

    try {
      await mkdir(folderPath, { recursive: true });
    } catch (e) {
      return [e as NodeJS.ErrnoException];
    }

    return [null, "unzipped"];
  }

  async uncompressEntryCallback({
    entry,
    zipfile,
  }: IterateEntriesCbOptions): AsyncNoThrow<string> {
    return new Promise((resolve) => {
      zipfile.openReadStream(entry, async (err, readStream) => {
        if (err) resolve([err]);

        await this.mkdir(entry.fileName);

        const ws = fs.createWriteStream(
          path.join(this.extractPath, entry.fileName),
        );

        const done = (e?: NodeJS.ErrnoException) => {
          ws.removeAllListeners();
          readStream.removeAllListeners();
          resolve(e ? [e] : [null, "decompressed"]);
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

  getEntryUncompressedSize({
    entry,
  }: IterateEntriesCbOptions): NoThrow<undefined> {
    this.uncompressedSize += entry.uncompressedSize;
    return [null];
  }

  async getUncompressedSize(): AsyncNoThrow<number> {
    if (!this.uncompressedSize) {
      const [err] = await this.iterateEntries((opts) =>
        this.getEntryUncompressedSize(opts),
      );
      if (err !== null) return [err];
    }

    return Promise.resolve([null, this.uncompressedSize]);
  }
}
