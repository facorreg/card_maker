import { AssetErrorCodes } from "#ELA/types.js";
import extractFileName from "#ELA_Utils/extract-file-name.js";
import type {
  GzipOptions,
  OnErrorGzip,
  OnFinishGzip,
  OnStartGzip,
  OnSuccessGzip,
  OnTransformGzip,
} from "#ELA_Utils/uncompress/gunzip/index.js";
import reporter from "#logger/reporter.js";
import type { MultiBar, SingleBar } from "#utils/progress.js";

export default class GzipHandlers {
  pb!: SingleBar | null;
  multiBar: MultiBar;
  inputFileName: string;
  outputFilePath: string;
  outputFileName: string;
  uncompressedSize = 0;

  constructor(
    inputFileName: string,
    outputFilePath: string,
    multiBar: MultiBar,
  ) {
    this.inputFileName = inputFileName;
    this.outputFilePath = outputFilePath;
    this.multiBar = multiBar;
    this.outputFileName = extractFileName(outputFilePath);
  }

  onStart: OnStartGzip = async (size) => {
    const [errPb, pb] = this.multiBar.create(
      this.outputFileName,
      "uncompress",
      size,
    );
    /* handle Log */
    if (errPb) {
      await reporter({
        errCode: AssetErrorCodes.SINGLEBAR_CREATE_ERROR,
        file: this.inputFileName,
        error: errPb,
      });
    }

    this.pb = pb ?? null;

    return [null];
  };

  onTransform: OnTransformGzip = (chunk) => {
    this.uncompressedSize += chunk.length;
    this?.pb?.update?.(this.uncompressedSize);
    return [null];
  };

  onSuccess: OnSuccessGzip = () => {
    this?.pb?.success();
    return [null];
  };

  onFinish: OnFinishGzip = () => {
    this?.pb?.stop();
    return [null];
  };

  onError: OnErrorGzip = () => {
    this?.pb?.stop();
    return [null];
  };

  methodsToOpts = (): GzipOptions => ({
    onStart: this.onStart,
    onTransform: this.onTransform,
    onSuccess: this.onSuccess,
    onFinish: this.onFinish,
    onError: this.onError,
  });
}
