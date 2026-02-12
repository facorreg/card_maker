import { mkdir, writeFile } from "node:fs/promises";
import { LOG_FOLDER_PATH, LOG_OUTPUT } from "#ELA/constants.js";
import { AssetErrorCodes, type ELA_StepsCodes } from "#ELA/types.js";
import asyncNoThrow, { type AsyncNoThrow } from "#utils/no-throw.js";

const errorReporter = {
  mkdirFailed: new Error(AssetErrorCodes.MKDIR_ERROR),
  writingFailed: new Error(AssetErrorCodes.FILE_WRITING_ERROR),
};

interface DataFormatterOpts {
  code?: ELA_StepsCodes;
  errCode?: AssetErrorCodes | string;
  file: string;
  error?: Error;
}
function dataFormatter(opts: DataFormatterOpts) {
  const input = JSON.stringify({
    ...opts,
    timestamp: Date.now(),
  });

  return `${input}\n`;
}

export default async function reporter(
  opts: DataFormatterOpts,
): AsyncNoThrow<void> {
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
