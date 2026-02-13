import { mkdir } from "node:fs/promises";
import path from "node:path";
import fetchAsset from "#ELA/fetch-asset/index.js";
import FetchHandlers from "#ELA_Handlers/fetch-handlers.js";
import GzipHandlers from "#ELA_Handlers/gunzip-handlers.js";
import UnzipHandlers from "#ELA_Handlers/unzip-handlers.js";
import { buildPath, getDictionariesDirPath } from "#ELA_Utils/build-paths.js";
import customAccess from "#ELA_Utils/custom-access.js";
import gunzip from "#ELA_Utils/decompress/gunzip/index.js";
import unzip from "#ELA_Utils/decompress/unzip/index.js";
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
  const { compressedType, outputType } = manifest;

  const isCompressed = compressedType !== undefined;
  const isGzip = compressedType === "gz";
  const isFolder = outputType === "folder";
  const compressedPath = isCompressed
    ? buildPath(manifest.name, compressedType)
    : "";
  const outputPath = buildPath(manifest.name, outputType);
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
        return customAccess(outputPath, outputType, isCompressed);
      },
    },
    {
      name: ELA_StepsCodes.CHECK_COMPRESSED_ARCHIVE,
      async run() {
        if (!compressedType) return [null, ELA_StepsCodes.DOWNLOAD]; // not supposed to happen
        return customAccess(compressedPath, compressedType);
      },
    },
    {
      name: ELA_StepsCodes.DOWNLOAD,
      async run() {
        const handlers = new FetchHandlers(
          manifest.url,
          compressedPath,
          outputPath,
          multiBar,
          manifest.roughSize,
        );
        const [err] = await fetchAsset(
          manifest.url,
          compressedPath || outputPath,
          handlers.methodsToOpts(),
        );

        if (err) return [err];

        return [
          null,
          isCompressed ? ELA_StepsCodes.DECOMPRESS : ELA_StepsCodes.NO_ACTION,
        ];
      },
      async cleanup() {
        return safeDeletion(compressedPath, false);
      },
      next: ELA_StepsCodes.DECOMPRESS,
    },
    {
      name: ELA_StepsCodes.DECOMPRESS,
      async run() {
        const compressedFileName = `${manifest.name}.${compressedType}`;

        if (isGzip) {
          const handlers = new GzipHandlers(
            compressedFileName,
            outputPath,
            multiBar,
          );

          return gunzip(compressedPath, outputPath, handlers.methodsToOpts());
        }

        const handlers = new UnzipHandlers(
          compressedFileName,
          outputPath,
          multiBar,
        );

        return unzip(
          compressedPath,
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
        return safeDeletion(compressedPath, false);
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
