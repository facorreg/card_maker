import fs from "node:fs";
import { mkdir } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import extract from "extract-zip";
import sd from "../utils/safe-deletion.js";
import type { Manifest } from "./constants.js";
import { STEPS } from "./constants.js";
import fetchWithProgress from "./fetch-with-progress/index.js";
import type StepsReporter from "./reporter.js";
import { buildPath, getDictionariesDirPath } from "./utils/build-paths.js";
import customAccess from "./utils/custom-access.js";

export interface Step {
  name: STEPS;
  run: () => Promise<void> | Promise<STEPS>;
  cleanup?: () => Promise<void>;
  next?: STEPS;
}

export default function getSteps(
  manifest: Manifest,
  reporter: StepsReporter,
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
        await fetchWithProgress(manifest, compressedPath);
        return;
      },
      async cleanup() {
        await safeDeletion(compressedPath, false);
        return;
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
        return;
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
