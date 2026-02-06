import type { WriteStream } from "node:fs";
import fs from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { Entry, ZipFile } from "yauzl";
import yauzl from "yauzl";

interface IterateEntriesCbOptions {
  entry: Entry;
  zipfile: ZipFile;
}

interface UnzipOptions {
  onTransform: WriteStream | null;
  extractPath: string;
  zipPath: string;
}

type NoThrow<T, E = NodeJS.ErrnoException> = [E | null, T?];
type AsyncNoThrow<T, E = NodeJS.ErrnoException> = Promise<NoThrow<T, E>>;
type IterateEntriesReturn = AsyncNoThrow<string>;
type DecompressEntryCbReturn = AsyncNoThrow<string>;
type GetDecompressedSizeReturn = AsyncNoThrow<number>;
type GetEntryUncompressedSizeReturn = NoThrow<undefined>;
type IterateEntriesCb = (
  opts: IterateEntriesCbOptions,
) => DecompressEntryCbReturn | GetEntryUncompressedSizeReturn;

export default class Unzip {
  onTransform!: WriteStream | null;
  extractPath!: string;
  zipPath: string;
  uncompressedSize: number = 0;

  constructor({ onTransform, extractPath, zipPath }: UnzipOptions) {
    this.onTransform = onTransform ?? null;
    this.extractPath = extractPath ?? "";
    this.zipPath = zipPath;
  }

  iterateEntries(callback: IterateEntriesCb): IterateEntriesReturn {
    return new Promise((resolve) => {
      yauzl.open(this.zipPath, { lazyEntries: true }, (err, zipfile) => {
        if (err) return resolve([err]);
        zipfile.readEntry();
        zipfile.on("entry", async (entry) => {
          if (/\/$/.test(entry.fileName)) {
            // Directory file names end with '/'.
            zipfile.readEntry();
          } else {
            const promise = callback({ entry, zipfile });
            const [err] = promise instanceof Promise ? await promise : promise;

            // replace with an on error ft
            console.log(err);
          }
        });
        zipfile.on("error", () => {
          // todo: better error handling
          return resolve([new Error("error occurred")]);
        });
        zipfile.on("end", () => {
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

  async decompressEntryCallback({
    entry,
    zipfile,
  }: IterateEntriesCbOptions): DecompressEntryCbReturn {
    return new Promise((resolve) => {
      zipfile.openReadStream(entry, async (err, readStream) => {
        await this.mkdir(entry.fileName);

        if (err) return resolve([err]);
        if (this.onTransform !== null) readStream.pipe(this.onTransform);

        readStream
          .pipe(
            fs.createWriteStream(path.join(this.extractPath, entry.fileName)),
          )
          .on("finish", () => {
            zipfile.readEntry();
            return resolve([null, "decompressed"]);
          });
      });
    });
  }

  decompressEntry() {
    return this.iterateEntries((opts) => this.decompressEntryCallback(opts));
  }

  getEntryUncompressedSize({
    entry,
  }: IterateEntriesCbOptions): GetEntryUncompressedSizeReturn {
    this.uncompressedSize += entry.uncompressedSize;
    return [null];
  }

  async getDecompressedSize(): GetDecompressedSizeReturn {
    if (!this.uncompressedSize) {
      const [err] = await this.iterateEntries((opts) =>
        this.getEntryUncompressedSize(opts),
      );
      if (err !== null) return [err];
    }

    return Promise.resolve([null, this.uncompressedSize]);
  }
}
