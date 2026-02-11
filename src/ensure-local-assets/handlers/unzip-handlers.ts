import path from "node:path";
import fileLogger from "../../utils/logger/file.js";
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

export default class UnzipHandlers {
  pb!: SingleBar | null;
  multiBar: MultiBar;
  inputFileName: string;
  uncompressedSize = 0;

  constructor(inputFileName: string, multiBar: MultiBar) {
    this.multiBar = multiBar;
    this.inputFileName = inputFileName;
  }

  resetFileName() {
    this.pb?.update(this.uncompressedSize, { fileName: this.inputFileName });
  }

  onGetUncompressedSizeError: OnGetUncompressedSizeErrorUnzip = async (err) => {
    await fileLogger({
      errCode: AssetErrorCodes.UNZIP_UNCOMPRESSED_SIZE_ERROR,
      file: this.inputFileName,
      error: err,
    });
    return [null];
  };

  onStart: OnStartUnzip = async (size) => {
    if (!size) return [null];

    const [errPbCreate, progress] = this.multiBar.create(
      this.inputFileName,
      "uncompress",
      size,
    );

    this.pb = progress || null;

    // error logging
    if (errPbCreate) {
      await fileLogger({
        errCode: AssetErrorCodes.SINGLEBAR_CREATE_ERROR,
        file: this.inputFileName,
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

    await fileLogger({
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
    renameTo: path.parse(this.inputFileName).name,
  });
}
