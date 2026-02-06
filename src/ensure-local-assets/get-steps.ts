import fs from "node:fs";
import { mkdir } from "node:fs/promises";
import type { TransformCallback } from "node:stream";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import extract from "extract-zip";
import yauzl from "yauzl";
import sd from "../utils/safe-deletion.js";
import type { Manifest } from "./constants.js";
import { STEPS } from "./constants.js";
import fetchWithProgress from "./fetch-with-progress/index.js";
import type SingleBar from "./fetch-with-progress/progress.js";
import type StepsReporter from "./reporter.js";
import { buildPath, getDictionariesDirPath } from "./utils/build-paths.js";
import customAccess from "./utils/custom-access.js";
export interface Step {
  name: STEPS;
  run: () => Promise<void> | Promise<STEPS>;
  cleanup?: () => Promise<void>;
  next?: STEPS;
}

function decompressZip(zipPath: string, decompressedPath: string) {
  yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
    if (err) throw err;
    zipfile.readEntry();
    zipfile.on("entry", (entry) => {
      if (/\/$/.test(entry.fileName)) {
        // Directory file names end with '/'.
        // Note that entries for directories themselves are optional.
        // An entry's fileName implicitly requires its parent directories to exist.
        zipfile.readEntry();
      } else {
        // file entry
        zipfile.openReadStream(entry, (err, readStream) => {
          if (err) throw err;
          readStream.on("end", () => {
            zipfile.readEntry();
          });
          // const transform = new Transform({
          //   transform: (chunk: string, _, callback: TransformCallback) => {
          //     console.log(chunk);
          //   },
          // });

          readStream
            // .pipe(transform)
            .pipe(fs.createWriteStream(decompressedPath))
            .on("finish", () => {
              zipfile.readEntry();
            });
        });
      }
    });
  });
}

export default function getSteps(
  manifest: Manifest,
  reporter: StepsReporter,
  singleBar: SingleBar,
): Step[] {
  const path = buildPath(manifest.name, manifest.type);
  const compressedPath = buildPath(manifest.name, manifest.compressType);
  const isFolder = manifest.type === "folder";

  const safeDeletion = (path: string, isDir: boolean) =>
    sd(path, isDir).catch(isFolder ? reporter.rmError : reporter.unlinkError);

  return [
    {
      name: STEPS.NOT_STARTED,
      async run() {
        await mkdir(getDictionariesDirPath(), { recursive: true });
        return await customAccess(path, manifest.type);
      },
    },
    {
      name: STEPS.CHECK_COMPRESSED_ARCHIVE,
      async run() {
        return customAccess(compressedPath, manifest.compressType);
      },
    },
    {
      name: STEPS.DOWNLOAD,
      async run() {
        await fetchWithProgress(manifest, compressedPath, singleBar);
      },
      async cleanup() {
        await safeDeletion(compressedPath, false);
      },
      next: STEPS.UNZIP,
    },
    {
      name: STEPS.UNZIP,
      async run() {
        reporter.decompressStart();

        if (manifest.compressType === "gz") {
          await pipeline(
            fs.createReadStream(compressedPath),
            createGunzip(),
            fs.createWriteStream(path),
          );
        } else {
          // zip
          await extract(compressedPath, { dir: path });
        }

        reporter.decompressEnd();
      },
      async cleanup() {
        await safeDeletion(path, isFolder);
      },
      next: STEPS.CLEANUP,
    },
    {
      // success cleanup
      name: STEPS.CLEANUP,
      async run() {
        await safeDeletion(compressedPath, false);
      },
      next: STEPS.NO_ACTION,
    },
    {
      name: STEPS.NO_ACTION,
      async run() {
        return;
      },
    },
  ];
}
