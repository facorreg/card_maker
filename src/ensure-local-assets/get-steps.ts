import { mkdir } from "node:fs/promises";
import type { AsyncNoThrow } from "../utils/no-throw.js";
import asyncNoThrow from "../utils/no-throw.js";
import type { DeletionReturn } from "../utils/safe-deletion.js";
import safeDeletion from "../utils/safe-deletion.js";
import type { Manifest } from "./constants.js";
import { STEPS } from "./constants.js";
import fetchAsset from "./fetch-asset.ts/index.js";
import type { MultiBar } from "./progress/index.js";
import gunzip from "./uncompress/gunzip/index.js";
import unzip from "./uncompress/unzip/index.js";
import { buildPath, getDictionariesDirPath } from "./utils/build-paths.js";
import customAccess from "./utils/custom-access.js";
export interface Step {
  name: STEPS;
  run: () => AsyncNoThrow<string | STEPS | undefined> | DeletionReturn;
  cleanup?: () => DeletionReturn;
  next?: STEPS;
}

// const errorReporter = {};

export default function getSteps(
  manifest: Manifest,
  multiBar: MultiBar,
): Step[] {
  const outputPath = buildPath(manifest.name, manifest.outputType);
  const inputPath = buildPath(manifest.name, manifest.inputType);
  const isFolder = manifest.outputType === "folder";

  return [
    {
      name: STEPS.NOT_STARTED,
      async run() {
        const ntMkdir = asyncNoThrow(mkdir);
        const [err] = await ntMkdir(getDictionariesDirPath(), {
          recursive: true,
        });
        if (err) return [err];
        return customAccess(outputPath, manifest.outputType);
      },
    },
    {
      name: STEPS.CHECK_COMPRESSED_ARCHIVE,
      async run() {
        return customAccess(inputPath, manifest.inputType);
      },
    },
    {
      name: STEPS.DOWNLOAD,
      async run() {
        return fetchAsset(manifest, inputPath, multiBar);
      },
      async cleanup() {
        return safeDeletion(inputPath, false);
      },
      next: STEPS.UNCOMPRESS,
    },
    {
      name: STEPS.UNCOMPRESS,
      async run() {
        // reporter.decompressStart();

        const inputFileName = `${manifest.name}.${manifest.inputType}`;
        const uncompress = manifest.inputType === "gz" ? gunzip : unzip;

        return uncompress(outputPath, inputPath, inputFileName, multiBar);

        // reporter.decompressEnd();
      },
      async cleanup() {
        return safeDeletion(outputPath, isFolder);
      },
      next: STEPS.CLEANUP,
    },
    {
      // success cleanup
      name: STEPS.CLEANUP,
      async run() {
        return safeDeletion(inputPath, false);
      },
      next: STEPS.NO_ACTION,
    },
    {
      name: STEPS.NO_ACTION,
      async run() {
        return [null];
      },
    },
  ];
}
