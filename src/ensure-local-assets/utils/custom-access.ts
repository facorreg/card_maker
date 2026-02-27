import { constants } from "node:fs/promises";
import { errAsync, okAsync, type ResultAsync } from "neverthrow";
import type { DataTypes, OutputTypes } from "#src/types.js";
import { safeAccess } from "#utils/neverthrow/promises/fs.js";
import { ELA_ErrorCodes, ELA_IoError, ELA_StepsCodes } from "../types.js";

type AccessMode = (typeof constants)[keyof typeof constants];

function customAccess(
  path: string,
  c: AccessMode,
): ResultAsync<void, ELA_IoError> {
  return safeAccess(path, c).orElse((err: NodeJS.ErrnoException) => {
    const code =
      err.code === "ENOENT"
        ? ELA_ErrorCodes.FILE_STATE_MISSING
        : ELA_ErrorCodes.FILE_R_ERROR;

    return errAsync(new ELA_IoError(code, path, err));
  });
}

function isOutputType(x: DataTypes): x is OutputTypes {
  const outputTypes: OutputTypes[] = ["xml", "tsv", "txt", "folder"];
  return (outputTypes as string[]).includes(x);
}

export default function customAccessHandler(
  path: string,
  type: DataTypes,
  hasCompressedArchive = false,
): ResultAsync<ELA_StepsCodes, ELA_IoError> {
  const accessFlag = type === "folder" ? constants.F_OK : constants.W_OK;

  return customAccess(path, accessFlag)
    .andThen(() => {
      switch (type) {
        case "gz":
        case "zip":
          return okAsync(ELA_StepsCodes.DECOMPRESS);
        default:
          return okAsync(ELA_StepsCodes.NO_ACTION);
      }
    })
    .orElse((error) => {
      if (error.code !== ELA_ErrorCodes.FILE_STATE_MISSING)
        return errAsync(error);

      const typeIsExport = isOutputType(type);

      if (typeIsExport && !hasCompressedArchive) {
        return okAsync(ELA_StepsCodes.DOWNLOAD);
      }

      return typeIsExport
        ? okAsync(ELA_StepsCodes.CHECK_COMPRESSED_ARCHIVE)
        : okAsync(ELA_StepsCodes.DOWNLOAD);
    });
}
