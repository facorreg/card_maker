import fs from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { Transform, type TransformCallback } from "node:stream";
import yauzl, { type Entry, type ZipFile } from "yauzl";
import { AssetErrorCodes } from "#ELA/types.js";
import asyncNoThrow, {
  type AsyncNoThrow,
  type NoThrow,
} from "#utils/no-throw.js";
import type {
  OnDecompressUnzip,
  OnErrorUnzip,
  OnGetDecompressedSizeErrorUnzip,
  OnStartUnzip,
  OnSuccessUnzip,
  OnTransformUnzip,
  UnzipOptions,
} from "./types.js";

interface IterateEntriesCbOptions {
  entry: Entry;
  zipfile: ZipFile;
}

type IterateEntriesCb = (
  opts: IterateEntriesCbOptions,
) => AsyncNoThrow<void> | NoThrow<void>;

export default class Unzip {
  compressedPath: string;
  outputPath!: string;
  decompressedSize: number = 0;

  onGetDecompressedSizeError?: OnGetDecompressedSizeErrorUnzip;
  onStart?: OnStartUnzip;
  onTransform?: OnTransformUnzip;
  onDecompress?: OnDecompressUnzip;
  onSuccess?: OnSuccessUnzip;
  onError?: OnErrorUnzip;
  renameTo: string = "";

  constructor(compressedPath: string, outputPath: string, opts?: UnzipOptions) {
    this.outputPath = outputPath;
    this.compressedPath = compressedPath;

    if (!opts) return;

    this.onGetDecompressedSizeError = opts.onGetDecompressedSizeError;
    this.onStart = opts.onStart;
    this.onTransform = opts.onTransform;
    this.onDecompress = opts.onDecompress;
    this.onSuccess = opts.onSuccess;
    this.onError = opts.onError;
    this.renameTo = opts.renameTo || "";
  }

  async start() {
    const [err] = await this.getDecompressedSize();
    if (err !== null) await this?.onGetDecompressedSizeError?.(err);
    this.onStart?.(this.decompressedSize);
  }

  iterateEntries(
    callback: IterateEntriesCb,
    type: "decompress" | "traverse",
  ): AsyncNoThrow<void> {
    return new Promise((resolve) => {
      yauzl.open(this.compressedPath, { lazyEntries: true }, (err, zipfile) => {
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

            if (type === "decompress")
              this?.onDecompress?.(entry, this.outputPath, e);
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

  async mkdir(fileName: string): AsyncNoThrow<void> {
    const zipFolderSubpath = path.dirname(fileName);
    const folderPath = path.join(this.outputPath, zipFolderSubpath);

    const ntMkdir = asyncNoThrow(mkdir, new Error(AssetErrorCodes.MKDIR_ERROR));

    const [err] = await ntMkdir(folderPath, { recursive: true });

    return [err];
  }

  rename(oldFilePath: string): string {
    const { dir, name, ext } = path.parse(oldFilePath);
    const isDir = Boolean(dir);

    if (isDir) {
      const [root = ""] = dir.split("/");
      return path.join(dir.replace(root, this.renameTo), `${name}${ext}`);
    }

    return `${this.renameTo}${ext}`;
  }

  async decompressEntryCallback({
    entry,
    zipfile,
  }: IterateEntriesCbOptions): AsyncNoThrow<void> {
    return new Promise((resolve) => {
      zipfile.openReadStream(entry, async (err, readStream) => {
        if (err) {
          return resolve([err]);
        }

        const filePath = this.renameTo
          ? this.rename(entry.fileName)
          : entry.fileName;

        const [mkdErr] = await this.mkdir(filePath);
        if (mkdErr !== null) return resolve([mkdErr]);

        const ws = fs.createWriteStream(path.join(this.outputPath, filePath));

        const done = async (e?: Error) => {
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

  decompressEntries() {
    return this.iterateEntries(
      (opts) => this.decompressEntryCallback(opts),
      "decompress",
    );
  }

  getDecompressedSizeCallback({
    entry,
  }: IterateEntriesCbOptions): NoThrow<void> {
    this.decompressedSize += entry.uncompressedSize;
    return [null];
  }

  async getDecompressedSize(): AsyncNoThrow<void> {
    if (!this.decompressedSize) {
      const ret = await this.iterateEntries(
        (opts) => this.getDecompressedSizeCallback(opts),
        "traverse",
      );

      return ret;
    }

    return Promise.resolve([null]);
  }
}
