import path from "node:path";
import reporter from "../../utils/logger/reporter.js";
import type { MultiBar, SingleBar } from "../progress.js";
import { AssetErrorCodes, STEPS } from "../types.js";
import type {
  OnErrorUnzip,
  OnGetUncompressedSizeErrorUnzip,
  OnStartUnzip,
  OnSuccessUnzip,
  OnTransformUnzip,
  OnUncompressUnzip,
  UnzipOptions,
} from "../uncompress/unzip/types.js";
import extractFileName from "../utils/extract-file-name.js";

export default class UnzipHandlers {
  pb!: SingleBar | null;
  multiBar: MultiBar;
  outputFilePath: string;
  outputFileName: string;
  inputFilePath: string;
  uncompressedSize = 0;

  constructor(
    inputFilePath: string,
    outputFilePath: string,
    multiBar: MultiBar,
  ) {
    this.multiBar = multiBar;
    this.inputFilePath = inputFilePath;
    this.outputFilePath = outputFilePath;
    this.outputFileName = extractFileName(outputFilePath);
  }

  resetFileName() {
    this.pb?.update(this.uncompressedSize, { fileName: this.outputFileName });
  }

  onGetUncompressedSizeError: OnGetUncompressedSizeErrorUnzip = async (err) => {
    await reporter({
      errCode: AssetErrorCodes.UNZIP_UNCOMPRESSED_SIZE_ERROR,
      file: this.outputFileName,
      error: err,
    });
    return [null];
  };

  onStart: OnStartUnzip = async (size) => {
    if (!size) return [null];

    const [errPbCreate, progress] = this.multiBar.create(
      this.outputFileName,
      "uncompress",
      size,
    );

    this.pb = progress || null;

    // error logging
    if (errPbCreate) {
      await reporter({
        errCode: AssetErrorCodes.SINGLEBAR_CREATE_ERROR,
        file: this.inputFilePath,
        error: errPbCreate,
      });
    }
    return [null];
  };

  onTransform: OnTransformUnzip = (chunk, entry) => {
    this.uncompressedSize += chunk.length;
    this.pb?.update(this.uncompressedSize, { fileName: entry.fileName });
    return [null];
  };

  onUncompress: OnUncompressUnzip = async (entry, outputPath, err) => {
    const logCode =
      err !== null
        ? { errCode: AssetErrorCodes.UNZIP_FILE_ERROR, error: err }
        : { code: STEPS.UNCOMPRESS_INNER_FILE };

    await reporter({
      ...logCode,
      file: path.join(outputPath, entry.fileName),
    });
    return [null];
  };

  onSuccess: OnSuccessUnzip = () => {
    this.resetFileName();
    this.pb?.success();
    return [null];
  };

  onError: OnErrorUnzip = () => {
    this.resetFileName();
    this.pb?.error();
    return [null];
  };

  methodsToOpts = (): UnzipOptions => ({
    onGetUncompressedSizeError: this.onGetUncompressedSizeError,
    onStart: this.onStart,
    onTransform: this.onTransform,
    onUncompress: this.onUncompress,
    onError: this.onError,
    onSuccess: this.onSuccess,
    renameTo: path.parse(this.inputFilePath).name,
  });
}
