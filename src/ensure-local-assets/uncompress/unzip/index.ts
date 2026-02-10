import path from "node:path";
import type { Entry } from "yauzl";
import fileLogger from "../../../utils/logger/file.js";
import type { AsyncNoThrow } from "../../../utils/no-throw.js";
import type { MultiBar, SingleBar } from "../../progress.js";
import { AssetErrorCodes, STEPS } from "../../types.js";
import type { OnUncompress } from "./unzip.js";
import Unzip from "./unzip.js";

const onUncompress: OnUncompress = async ({ entry, outputPath, err }) => {
  const logCode =
    err !== null
      ? { errCode: AssetErrorCodes.UNZIP_FILE_ERROR }
      : { code: STEPS.UNCOMPRESS_INNER_FILE };

  await fileLogger({
    ...logCode,
    file: path.join(outputPath, entry.fileName),
  });
};

export default async function unzip(
  outputPath: string,
  inputPath: string,
  inputFileName: string,
  multiBar: MultiBar,
): AsyncNoThrow<void> {
  const unzip = new Unzip({
    outputPath,
    zipPath: inputPath,
  });

  const [errGDS, uncompressedSize] = await unzip.getUncompressedSize();

  let pb: SingleBar | null = null;

  if (errGDS !== null) {
    await fileLogger({
      errCode: AssetErrorCodes.UNZIP_UNCOMPRESSED_SIZE_ERROR,
      file: inputFileName,
    });
  } else {
    const [errPbCreate, progress] = multiBar.create(
      inputFileName,
      "uncompress",
      uncompressedSize,
    );

    pb = progress || null;

    // error logging
    if (errPbCreate) {
      await fileLogger({
        errCode: AssetErrorCodes.SINGLEBAR_CREATE_ERROR,
        file: inputFileName,
      });
    }
  }

  let uncompressed = 0;

  unzip.onUncompress = onUncompress;

  unzip.onTransform = (chunk: Buffer, entry: Entry) => {
    uncompressed += chunk.length;
    pb?.update(uncompressed, { fileName: entry.fileName });
  };

  const resetFileName = () => {
    pb?.update(uncompressed, { fileName: inputFileName });
  };

  unzip.onError = () => {
    resetFileName();
    pb?.error();
  };
  unzip.onSuccess = () => {
    resetFileName();
    pb?.success();
  };

  const [err] = await unzip.uncompressEntries();

  return [err ?? null];
}
