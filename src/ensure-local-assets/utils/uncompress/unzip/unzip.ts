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
  OnErrorUnzip,
  OnGetUncompressedSizeErrorUnzip,
  OnStartUnzip,
  OnSuccessUnzip,
  OnTransformUnzip,
  OnUncompressUnzip,
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
  inputPath: string;
  outputPath!: string;
  uncompressedSize: number = 0;

  onGetUncompressedSizeError?: OnGetUncompressedSizeErrorUnzip;
  onStart?: OnStartUnzip;
  onTransform?: OnTransformUnzip;
  onUncompress?: OnUncompressUnzip;
  onSuccess?: OnSuccessUnzip;
  onError?: OnErrorUnzip;
  renameTo: string = "";

  constructor(inputPath: string, outputPath: string, opts?: UnzipOptions) {
    this.outputPath = outputPath;
    this.inputPath = inputPath;

    if (!opts) return;

    this.onGetUncompressedSizeError = opts.onGetUncompressedSizeError;
    this.onStart = opts.onStart;
    this.onTransform = opts.onTransform;
    this.onUncompress = opts.onUncompress;
    this.onSuccess = opts.onSuccess;
    this.onError = opts.onError;
    this.renameTo = opts.renameTo || "";
  }

  async start() {
    const [err] = await this.getUncompressedSize();
    if (err !== null) await this?.onGetUncompressedSizeError?.(err);
    this.onStart?.(this.uncompressedSize);
  }

  iterateEntries(
    callback: IterateEntriesCb,
    type: "uncompress" | "traverse",
  ): AsyncNoThrow<void> {
    return new Promise((resolve) => {
      yauzl.open(this.inputPath, { lazyEntries: true }, (err, zipfile) => {
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

            if (type === "uncompress")
              this?.onUncompress?.(entry, this.outputPath, e);
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

  async uncompressEntryCallback({
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

  uncompressEntries() {
    return this.iterateEntries(
      (opts) => this.uncompressEntryCallback(opts),
      "uncompress",
    );
  }

  getUncompressedSizeCallback({
    entry,
  }: IterateEntriesCbOptions): NoThrow<void> {
    this.uncompressedSize += entry.uncompressedSize;
    return [null];
  }

  async getUncompressedSize(): AsyncNoThrow<void> {
    if (!this.uncompressedSize) {
      const ret = await this.iterateEntries(
        (opts) => this.getUncompressedSizeCallback(opts),
        "traverse",
      );

      return ret;
    }

    return Promise.resolve([null]);
  }
}
