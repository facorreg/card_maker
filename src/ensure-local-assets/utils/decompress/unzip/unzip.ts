import fs from "node:fs";
import path from "node:path";
import type Stream from "node:stream";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import yauzl, { type Entry, type ZipFile } from "yauzl";
import { ELA_ErrorCodes, ELA_IoError } from "#ELA/types.js";
import { safeMkdir } from "#utils/neverthrow/promises/fs.js";
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
) => ResultAsync<void, Error>;

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

  start = () => {
    return this.getDecompressedSize()
      .orTee((error) => {
        this?.onGetDecompressedSizeError?.(error);
      })
      .andThen(() =>
        this.onStart ? this.onStart?.(this.decompressedSize) : okAsync(),
      );
  };

  iterateEntries = (
    callback: IterateEntriesCb,
    type: "decompress" | "traverse",
  ): ResultAsync<void, Error> => {
    return ResultAsync.fromPromise(
      new Promise<void>((resolve, reject) => {
        yauzl.open(
          this.compressedPath,
          { lazyEntries: true },
          (err, zipfile) => {
            const closeAndReject = (error: Error) => {
              zipfile.close();
              return reject(error);
            };

            const closeAndResolve = () => {
              zipfile.close();
              return resolve();
            };

            if (err)
              return closeAndReject(
                new ELA_IoError(
                  ELA_ErrorCodes.UNZIP_OPEN_ERROR,
                  this.compressedPath,
                  err,
                ),
              );

            zipfile.readEntry();
            zipfile.on("entry", async (entry) => {
              const isFolder = /\/$/.test(entry.fileName);

              if (!isFolder) {
                // Directory file names end with '/'.
                await callback({ entry, zipfile })
                  .andTee(() => {
                    if (type === "decompress")
                      this?.onDecompress?.(entry, this.outputPath);
                  })
                  .orTee((error) => {
                    return closeAndReject(
                      new ELA_IoError(
                        ELA_ErrorCodes.UNZIP_ERROR,
                        this.outputPath,
                        error,
                      ),
                    );
                  });
              }

              zipfile.readEntry();
            });

            zipfile.once("error", (error) => {
              this?.onError?.();

              return closeAndReject(
                new ELA_IoError(
                  ELA_ErrorCodes.UNZIP_ERROR,
                  this.outputPath,
                  error,
                ),
              );
            });

            zipfile.once("end", () => {
              this?.onSuccess?.();
              return closeAndResolve();
            });
          },
        );
      }),
      (e) => e as Error,
    );
  };

  mkdir = (fileName: string): ResultAsync<void, Error> => {
    const zipFolderSubpath = path.dirname(fileName);
    const folderPath = path.join(this.outputPath, zipFolderSubpath);

    // const ntMkdir = asyncNoThrow(mkdir, new Error(ELA_ErrorCodes.MKDIR_ERROR));

    return safeMkdir(folderPath, { recursive: true })
      .orElse((error) =>
        errAsync(
          new ELA_IoError(ELA_ErrorCodes.MKDIR_ERROR, folderPath, error),
        ),
      )
      .map(() => undefined);
  };

  rename = (oldFilePath: string): string => {
    const { dir, name, ext } = path.parse(oldFilePath);
    const isDir = Boolean(dir);

    if (isDir) {
      const [root = ""] = dir.split("/");
      return path.join(dir.replace(root, this.renameTo), `${name}${ext}`);
    }

    return `${this.renameTo}${ext}`;
  };

  decompressEntryCallback = ({
    entry,
    zipfile,
  }: IterateEntriesCbOptions): ResultAsync<void, Error> => {
    return ResultAsync.fromPromise(
      (async () => {
        const readStream = await new Promise<Stream.Readable>(
          (resolve, reject) => {
            zipfile.openReadStream(entry, (err, rs) => {
              if (err) reject(err);
              else resolve(rs);
            });
          },
        );

        const filePath = this.renameTo
          ? this.rename(entry.fileName)
          : entry.fileName;

        const mkdirResult = await this.mkdir(filePath);

        if (mkdirResult.isErr()) {
          throw mkdirResult.error;
        }

        const ws = fs.createWriteStream(path.join(this.outputPath, filePath));

        if (this.onTransform) {
          await pipeline(
            readStream,
            new Transform({
              transform: (chunk, _, cb) => {
                this.onTransform?.(chunk, entry);
                cb(null, chunk);
              },
            }),
            ws,
          );
        } else {
          await pipeline(readStream, ws);
        }
      })(),
      (e) => e as Error,
    );
  };

  decompressEntries = (): ResultAsync<void, Error> => {
    return this.iterateEntries(
      (opts) => this.decompressEntryCallback(opts),
      "decompress",
    );
  };

  getDecompressedSizeCallback = ({
    entry,
  }: IterateEntriesCbOptions): ResultAsync<void, Error> => {
    this.decompressedSize += entry.uncompressedSize;

    return okAsync();
  };

  getDecompressedSize = (): ResultAsync<number, Error> => {
    if (!this.decompressedSize) {
      return this.iterateEntries(
        (opts) => this.getDecompressedSizeCallback(opts),
        "traverse",
      ).andThen(() => okAsync(this.decompressedSize || 0));
    }

    return okAsync(this.decompressedSize);
  };
}
