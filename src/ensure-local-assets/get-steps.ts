import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { AsyncNoThrow } from "../utils/no-throw.js";
import asyncNoThrow from "../utils/no-throw.js";
import safeDeletion from "../utils/safe-deletion.js";
import fetchAsset from "./fetch-asset/index.js";
import FetchHandlers from "./handlers/fetch-handlers.js";
import GzipHandlers from "./handlers/gunzip-handlers.js";
import UnzipHandlers from "./handlers/unzip-handlers.js";
import type { MultiBar } from "./progress.js";
import { AssetErrorCodes, type Manifest, STEPS } from "./types.js";
import gunzip from "./uncompress/gunzip/index.js";
import unzip from "./uncompress/unzip/index.js";
import { buildPath, getDictionariesDirPath } from "./utils/build-paths.js";
import customAccess from "./utils/custom-access.js";
export interface Step {
  name: STEPS;
  run: () => AsyncNoThrow<STEPS> | AsyncNoThrow<void>;
  cleanup?: () => AsyncNoThrow<void>;
  next?: STEPS;
}

export default function getSteps(
  manifest: Manifest,
  multiBar: MultiBar,
): Step[] {
  const isFolder = manifest.outputType === "folder";
  const isGzip = manifest.inputType === "gz";
  const outputFilePath = buildPath(manifest.name, manifest.outputType);
  const inputFilePath = buildPath(manifest.name, manifest.inputType);
  const dictionariesDirPath = getDictionariesDirPath();

  return [
    {
      name: STEPS.NOT_STARTED,
      async run() {
        const ntMkdir = asyncNoThrow(mkdir);
        const [mkErr] = await ntMkdir(dictionariesDirPath, {
          recursive: true,
        });
        if (mkErr)
          return [new Error(AssetErrorCodes.MKDIR_ERROR, { cause: mkErr })];
        return customAccess(outputFilePath, manifest.outputType);
      },
    },
    {
      name: STEPS.CHECK_COMPRESSED_ARCHIVE,
      async run() {
        return customAccess(inputFilePath, manifest.inputType);
      },
    },
    {
      name: STEPS.DOWNLOAD,
      async run() {
        const handlers = new FetchHandlers(
          manifest.url,
          inputFilePath,
          outputFilePath,
          multiBar,
          manifest.roughSize,
        );
        const ret = await fetchAsset(
          manifest.url,
          inputFilePath,
          handlers.methodsToOpts(),
        );

        return ret;
      },
      async cleanup() {
        return safeDeletion(inputFilePath, false);
      },
      next: STEPS.UNCOMPRESS,
    },
    {
      name: STEPS.UNCOMPRESS,
      async run() {
        const inputFileName = `${manifest.name}.${manifest.inputType}`;

        if (isGzip) {
          const handlers = new GzipHandlers(
            inputFileName,
            outputFilePath,
            multiBar,
          );

          return gunzip(
            inputFilePath,
            outputFilePath,
            handlers.methodsToOpts(),
          );
        }

        const handlers = new UnzipHandlers(
          inputFileName,
          outputFilePath,
          multiBar,
        );

        return unzip(
          inputFilePath,
          path.dirname(outputFilePath),
          handlers.methodsToOpts(),
        );
      },
      async cleanup() {
        return safeDeletion(outputFilePath, isFolder);
      },
      next: STEPS.CLEANUP,
    },
    {
      // success cleanup
      name: STEPS.CLEANUP,
      async run() {
        return safeDeletion(inputFilePath, false);
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
