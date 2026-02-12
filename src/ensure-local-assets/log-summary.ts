// downloaded X, failed Y | extracted X, failed Y

import fs from "node:fs";
import { StringDecoder } from "node:string_decoder";
import chalk from "chalk";
import log from "../utils/logger/console.js";
import reporter from "../utils/logger/reporter.js";
import type { AsyncNoThrow } from "../utils/no-throw.js";
import { LOG_OUTPUT } from "./constants.js";
import { type AssetErrorCodes, ELA_StepsCodes } from "./types.js";

enum ReadByDelimiterErrors {
  RBD_NO_DELIMITER_PROVIDED = "RBD_NO_DELIMITER_PROVIDED",
  RBD_R_ERROR = "RBD_R_ERROR",
}

async function readByDelimiter(
  delimiter: string,
  cb: (match: string) => void,
): AsyncNoThrow<void> {
  if (!delimiter) {
    return [new Error(ReadByDelimiterErrors.RBD_NO_DELIMITER_PROVIDED)];
  }

  const stream = fs.createReadStream(LOG_OUTPUT);
  const decoder = new StringDecoder("utf-8");

  let buffer = "";

  try {
    for await (const chunk of stream) {
      buffer += decoder.write(chunk);

      let idx = -1;
      // biome-ignore lint/suspicious/noAssignInExpressions: <more readable>
      while ((idx = buffer.indexOf(delimiter)) !== -1) {
        const match = buffer.slice(0, idx + delimiter.length);
        cb(match);
        buffer = buffer.slice(idx + delimiter.length);
      }
    }

    buffer += decoder.end();
    if (buffer.length) cb(buffer);

    return [null];
  } catch (err) {
    return [new Error(ReadByDelimiterErrors.RBD_R_ERROR, { cause: err })];
  }
}

async function logSummary() {
  let downloadSuccesses = 0;
  let downloadErrors = 0;
  let uncompressSuccesses = 0;
  let uncompressErrors = 0;

  const extractMainError = (errCode?: AssetErrorCodes) => {
    if (!errCode) return;

    const [mainError] = errCode.split("_");

    switch (mainError) {
      case "HTTP":
        return "FETCH";
      case "GZIP":
        return "UNZIP";
      default:
        return mainError;
    }
  };

  const readLogsCallback = (logStr: string) => {
    const log = JSON.parse(logStr);
    const errCode = extractMainError(log.errCode as AssetErrorCodes);
    const anyCode = (log.code as ELA_StepsCodes) ?? errCode;

    switch (anyCode as ELA_StepsCodes | string) {
      case ELA_StepsCodes.DOWNLOAD:
        downloadSuccesses += 1;
        break;
      case ELA_StepsCodes.UNCOMPRESS:
        uncompressSuccesses += 1;
        break;
      case ELA_StepsCodes.UNCOMPRESS_INNER_FILE:
        uncompressSuccesses += 1;
        break;
      case "FETCH":
        downloadErrors += 1;
        break;
      case "UNZIP":
        uncompressErrors += 1;
        break;
      default:
        break;
    }
  };

  const [err] = await readByDelimiter("\n", readLogsCallback);
  const green = chalk.bold.green;
  const red = chalk.bold.red;

  log.info(
    `Downloads => completed: ${green(downloadSuccesses)} | failed: ${red(downloadErrors)}`,
  );
  log.info(
    `Extractions => completed: ${green(uncompressSuccesses)} | failed: ${red(uncompressErrors)}`,
  );

  if (err)
    await reporter({
      errCode: err.message,
      file: "none",
      error: (err.cause as Error) ?? err,
    });
}

export default logSummary;
