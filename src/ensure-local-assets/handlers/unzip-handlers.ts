import path from "node:path";
import { okAsync } from "neverthrow";
import { ELA_StepsCodes } from "#ELA/types.js";
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

  onGetDecompressedSizeError: OnGetDecompressedSizeErrorUnzip = (err) =>
    reporter({
      file: this.outputFileName,
      error: err,
    });

  onStart: OnStartUnzip = (size) => {
    if (!size) return okAsync();

    const result = this.multiBar.create(
      this.outputFileName,
      "decompress",
      size,
    );

    if (result.isOk()) {
      this.pb = result.value;
      return okAsync();
    }

    return reporter({
      file: this.compressedFileName,
      error: result.error,
    });
  };

  onTransform: OnTransformUnzip = (chunk, entry) => {
    this.decompressedSize += chunk.length;
    this.pb?.update(this.decompressedSize, { fileName: entry.fileName });
  };

  onDecompress: OnDecompressUnzip = (entry, outputPath) => {
    return reporter({
      successCode: ELA_StepsCodes.DECOMPRESS_INNER_FILE,
      file: path.join(outputPath, entry.fileName),
    });
  };

  onSuccess: OnSuccessUnzip = () => {
    this.resetFileName();
    this.pb?.success();
  };

  onError: OnErrorUnzip = () => {
    this.resetFileName();
    this.pb?.error();
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
