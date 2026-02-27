// import { safeMkdir, safeWriteFile } from "node:fs/promises";

import { okAsync, type ResultAsync } from "neverthrow";
import { LOG_FOLDER_PATH, LOG_OUTPUT } from "#ELA/constants.js";
import {
  ELA_ErrorCodes,
  ELA_IoError,
  type ELA_StepsCodes,
} from "#ELA/types.js";
import { safeMkdir, safeWriteFile } from "#utils/neverthrow/promises/fs.js";
import logger from "./console.js";

interface DataFormatterOpts {
  successCode?: ELA_StepsCodes;
  file?: string;
  error?: Error;
}
function dataFormatter(opts: DataFormatterOpts) {
  const input = JSON.stringify({
    ...opts,
    timestamp: Date.now(),
  });

  return `${input}\n`;
}

export default function reporter(
  opts: DataFormatterOpts,
): ResultAsync<void, Error> {
  const input = dataFormatter(opts);

  return safeMkdir(LOG_FOLDER_PATH, { recursive: true })
    .mapErr(
      (e) => new ELA_IoError(ELA_ErrorCodes.MKDIR_ERROR, LOG_FOLDER_PATH, e),
    )
    .andThen(() =>
      safeWriteFile(LOG_OUTPUT, input, {
        flag: "a",
      }),
    )
    .orElse((e) => {
      const logError = new ELA_IoError(
        ELA_ErrorCodes.FILE_W_ERROR,
        LOG_OUTPUT,
        e,
      );
      logger.error("Reporter failed: ", JSON.stringify(logError));
      return okAsync();
    });
}
