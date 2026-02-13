import path from "node:path";
import { AssetErrorCodes, ELA_StepsCodes } from "#ELA/types.js";
import type {
  OnDecompressUnzip,
  OnErrorUnzip,
  OnGetDecompressedSizeErrorUnzip,
  OnStartUnzip,
  OnSuccessUnzip,
  OnTransformUnzip,
  UnzipOptions,
} from "#ELA_Utils/decompress/unzip/types.js";
import extractFileName from "#ELA_Utils/extract-file-name.js";
import reporter from "#logger/reporter.js";
import type { MultiBar, SingleBar } from "#utils/progress.js";

export default class UnzipHandlers {
  pb!: SingleBar | null;
  multiBar: MultiBar;
  outputFilePath: string;
  outputFileName: string;
  compressedFileName: string;
  decompressedSize = 0;

  constructor(
    compressedFileName: string,
    outputFilePath: string,
    multiBar: MultiBar,
  ) {
    this.multiBar = multiBar;
    this.compressedFileName = compressedFileName;
    this.outputFilePath = outputFilePath;
    this.outputFileName = extractFileName(outputFilePath);
  }

  resetFileName() {
    this.pb?.update(this.decompressedSize, { fileName: this.outputFileName });
  }

  onGetDecompressedSizeError: OnGetDecompressedSizeErrorUnzip = async (err) => {
    await reporter({
      errCode: AssetErrorCodes.UNZIP_DECOMPRESSED_SIZE_ERROR,
      file: this.outputFileName,
      error: err,
    });
    return [null];
  };

  onStart: OnStartUnzip = async (size) => {
    if (!size) return [null];

    const [errPbCreate, progress] = this.multiBar.create(
      this.outputFileName,
      "decompress",
      size,
    );

    this.pb = progress || null;

    // error logging
    if (errPbCreate) {
      await reporter({
        errCode: AssetErrorCodes.SINGLEBAR_CREATE_ERROR,
        file: this.compressedFileName,
        error: errPbCreate,
      });
    }
    return [null];
  };

  onTransform: OnTransformUnzip = (chunk, entry) => {
    this.decompressedSize += chunk.length;
    this.pb?.update(this.decompressedSize, { fileName: entry.fileName });
    return [null];
  };

  onDecompress: OnDecompressUnzip = async (entry, outputPath, err) => {
    const logCode =
      err !== null
        ? { errCode: AssetErrorCodes.UNZIP_FILE_ERROR, error: err }
        : { code: ELA_StepsCodes.DECOMPRESS_INNER_FILE };

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
    onGetDecompressedSizeError: this.onGetDecompressedSizeError,
    onStart: this.onStart,
    onTransform: this.onTransform,
    onDecompress: this.onDecompress,
    onError: this.onError,
    onSuccess: this.onSuccess,
    renameTo: path.parse(this.compressedFileName).name,
  });
}
