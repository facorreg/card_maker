import { mkdir, writeFile } from "node:fs/promises";
import {
  LOG_FOLDER_PATH,
  LOG_OUTPUT,
} from "../../ensure-local-assets/constants.js";
import {
  AssetErrorCodes,
  type STEPS,
} from "../../ensure-local-assets/types.js";
import asyncNoThrow, { type AsyncNoThrow } from "../no-throw.js";

const errorReporter = {
  mkdirFailed: new Error(AssetErrorCodes.MKDIR_ERROR),
  writingFailed: new Error(AssetErrorCodes.FILE_WRITING_ERROR),
};

interface DataFormatterOpts {
  code?: STEPS;
  errCode?: AssetErrorCodes;
  file: string;
}
function dataFormatter(opts: DataFormatterOpts) {
  const input = JSON.stringify({
    ...opts,
    timestamp: Date.now(),
  });

  return `${input}\n`;
}

export default async function fileLogger(
  opts: DataFormatterOpts,
): AsyncNoThrow<undefined> {
  const input = dataFormatter(opts);

  const ntMkdir = asyncNoThrow(mkdir, errorReporter.mkdirFailed);
  const ntWriteFile = asyncNoThrow(writeFile, errorReporter.writingFailed);

  const [mkdirErr] = await ntMkdir(LOG_FOLDER_PATH, { recursive: true });
  if (mkdirErr) return [mkdirErr];

  const [wfError] = await ntWriteFile(LOG_OUTPUT, input, {
    flag: "a",
  });
  if (wfError) return [wfError];

  return [null];
}
