import fileLogger from "../../utils/logger/file.js";
import type { MultiBar, SingleBar } from "../progress.js";
import { AssetErrorCodes } from "../types.js";
import type {
  GzipOptions,
  OnErrorGzip,
  OnFinishGzip,
  OnStartGzip,
  OnSuccessGzip,
  OnTransformGzip,
} from "../uncompress/gunzip/index.js";

export default class GzipHandlers {
  pb!: SingleBar | null;
  multiBar: MultiBar;
  inputFileName: string;
  uncompressedSize = 0;

  constructor(inputFileName: string, multiBar: MultiBar) {
    this.inputFileName = inputFileName;
    this.multiBar = multiBar;
  }

  onStart: OnStartGzip = async (size) => {
    const [errPb, pb] = this.multiBar.create(
      this.inputFileName,
      "uncompress",
      size,
    );
    /* handle Log */
    if (errPb) {
      await fileLogger({
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
