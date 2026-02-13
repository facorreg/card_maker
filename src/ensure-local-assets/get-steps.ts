import { mkdir } from "node:fs/promises";
import path from "node:path";
import fetchAsset from "#ELA/fetch-asset/index.js";
import FetchHandlers from "#ELA_Handlers/fetch-handlers.js";
import GzipHandlers from "#ELA_Handlers/gunzip-handlers.js";
import UnzipHandlers from "#ELA_Handlers/unzip-handlers.js";
import { buildPath, getDictionariesDirPath } from "#ELA_Utils/build-paths.js";
import customAccess from "#ELA_Utils/custom-access.js";
import gunzip from "#ELA_Utils/uncompress/gunzip/index.js";
import unzip from "#ELA_Utils/uncompress/unzip/index.js";
import type { Manifest } from "#src/types.js";
import asyncNoThrow from "#utils/no-throw.js";
import type { MultiBar } from "#utils/progress.js";
import type { Step } from "#utils/run-steps/types.js";
import safeDeletion from "#utils/safe-deletion.js";
import { AssetErrorCodes, ELA_StepsCodes } from "./types.js";
export default function getSteps(
  manifest: Manifest,
  multiBar: MultiBar,
): Step<ELA_StepsCodes>[] {
  const isFolder = manifest.outputType === "folder";
  const isGzip = manifest.inputType === "gz";
  const outputPath = buildPath(manifest.name, manifest.outputType);
  const inputPath = buildPath(manifest.name, manifest.inputType);
  const dictionariesDirPath = getDictionariesDirPath();

  return [
    {
      name: ELA_StepsCodes.NOT_STARTED,
      async run() {
        const ntMkdir = asyncNoThrow(mkdir);
        const [mkErr] = await ntMkdir(dictionariesDirPath, {
          recursive: true,
        });
        if (mkErr)
          return [new Error(AssetErrorCodes.MKDIR_ERROR, { cause: mkErr })];
        return customAccess(outputPath, manifest.outputType);
      },
    },
    {
      name: ELA_StepsCodes.CHECK_COMPRESSED_ARCHIVE,
      async run() {
        return customAccess(inputPath, manifest.inputType);
      },
    },
    {
      name: ELA_StepsCodes.DOWNLOAD,
      async run() {
        const handlers = new FetchHandlers(
          manifest.url,
          inputPath,
          outputPath,
          multiBar,
          manifest.roughSize,
        );
        const ret = await fetchAsset(
          manifest.url,
          inputPath,
          handlers.methodsToOpts(),
        );

        return ret;
      },
      async cleanup() {
        return safeDeletion(inputPath, false);
      },
      next: ELA_StepsCodes.UNCOMPRESS,
    },
    {
      name: ELA_StepsCodes.UNCOMPRESS,
      async run() {
        const inputFileName = `${manifest.name}.${manifest.inputType}`;

        if (isGzip) {
          const handlers = new GzipHandlers(
            inputFileName,
            outputPath,
            multiBar,
          );

          return gunzip(inputPath, outputPath, handlers.methodsToOpts());
        }

        const handlers = new UnzipHandlers(inputFileName, outputPath, multiBar);

        return unzip(
          inputPath,
          path.dirname(outputPath),
          handlers.methodsToOpts(),
        );
      },
      async cleanup() {
        return safeDeletion(outputPath, isFolder);
      },
      next: ELA_StepsCodes.CLEANUP,
    },
    {
      // success cleanup
      name: ELA_StepsCodes.CLEANUP,
      async run() {
        return safeDeletion(inputPath, false);
      },
      next: ELA_StepsCodes.NO_ACTION,
    },
    {
      name: ELA_StepsCodes.NO_ACTION,
      async run() {
        return [null];
      },
    },
  ];
}
