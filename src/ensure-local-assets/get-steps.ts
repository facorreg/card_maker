import path from "node:path";
import { okAsync } from "neverthrow";
import fetchAsset from "#ELA/fetch-asset/index.js";
import writeAsset from "#ELA/fetch-asset/write-asset.js";
import FetchHandlers from "#ELA_Handlers/fetch-handlers.js";
import GzipHandlers from "#ELA_Handlers/gunzip-handlers.js";
import UnzipHandlers from "#ELA_Handlers/unzip-handlers.js";
import { buildPath, getDictionariesDirPath } from "#ELA_Utils/build-paths.js";
import customAccess from "#ELA_Utils/custom-access.js";
import gunzip from "#ELA_Utils/decompress/gunzip/index.js";
import unzip from "#ELA_Utils/decompress/unzip/index.js";
import type { Manifest } from "#src/types.js";
import {
  safeMkdir,
  safeRm,
  safeUnlink,
} from "#utils/neverthrow/promises/fs.js";
import type { MultiBar } from "#utils/progress.js";
import type { Step } from "#utils/run-steps/types.js";
import { ELA_ErrorCodes, ELA_IoError, ELA_StepsCodes } from "./types.js";

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
      run: () => {
        return safeMkdir(dictionariesDirPath, {
          recursive: true,
        })
          .mapErr(
            (e) =>
              new ELA_IoError(
                ELA_ErrorCodes.MKDIR_ERROR,
                dictionariesDirPath,
                e,
              ),
          )
          .andThen(() => customAccess(outputPath, outputType, isCompressed));
      },
    },
    {
      name: ELA_StepsCodes.CHECK_COMPRESSED_ARCHIVE,
      run: () => {
        if (!compressedType) return okAsync(ELA_StepsCodes.DOWNLOAD); // not supposed to happen
        return customAccess(compressedPath, compressedType);
      },
    },
    {
      name: ELA_StepsCodes.DOWNLOAD,
      run: () => {
        const handlers = new FetchHandlers(
          manifest.url,
          compressedPath,
          outputPath,
          multiBar,
          manifest.roughSize,
        );

        return fetchAsset(manifest.url)
          .andThen((res) =>
            writeAsset(
              res,
              isCompressed ? compressedPath : outputPath,
              handlers.methodsToOpts(),
            ),
          )
          .andThen(() =>
            okAsync(
              isCompressed
                ? ELA_StepsCodes.DECOMPRESS
                : ELA_StepsCodes.NO_ACTION,
            ),
          );
      },
      cleanup: () => {
        return safeUnlink(compressedPath);
      },
      next: ELA_StepsCodes.DECOMPRESS,
    },
    {
      name: ELA_StepsCodes.DECOMPRESS,
      run: () => {
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
      cleanup() {
        const suppress = isFolder ? safeRm : safeUnlink;
        return suppress(outputPath);
      },
      next: ELA_StepsCodes.CLEANUP,
    },
    {
      // success cleanup
      name: ELA_StepsCodes.CLEANUP,
      run: () => {
        return safeUnlink(compressedPath);
      },
      next: ELA_StepsCodes.NO_ACTION,
    },
    {
      name: ELA_StepsCodes.NO_ACTION,
      run: okAsync,
    },
  ];
}
