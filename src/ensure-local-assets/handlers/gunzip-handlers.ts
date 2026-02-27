import { errAsync, okAsync } from "neverthrow";
import type {
  GzipOptions,
  OnErrorGzip,
  OnFinishGzip,
  OnStartGzip,
  OnSuccessGzip,
  OnTransformGzip,
} from "#ELA_Utils/decompress/gunzip/index.js";
import extractFileName from "#ELA_Utils/extract-file-name.js";
import reporter from "#logger/reporter.js";
import type { MultiBar, SingleBar } from "#utils/progress.js";

export default class GzipHandlers {
  pb!: SingleBar | null;
  multiBar: MultiBar;
  compressedFileName: string;
  outputFilePath: string;
  outputFileName: string;
  decompressedSize = 0;

  constructor(
    compressedFileName: string,
    outputFilePath: string,
    multiBar: MultiBar,
  ) {
    this.compressedFileName = compressedFileName;
    this.outputFilePath = outputFilePath;
    this.multiBar = multiBar;
    this.outputFileName = extractFileName(outputFilePath);
  }

  onStart: OnStartGzip = (size) => {
    const r = this.multiBar.create(this.outputFileName, "decompress", size);

    if (r.isErr()) {
      return reporter({
        file: this.compressedFileName,
        error: r.error,
      }).andThen(() => errAsync(r.error));
    }

    this.pb = r.value;
    return okAsync(undefined);
  };

  onTransform: OnTransformGzip = (chunk) => {
    this.decompressedSize += chunk.length;
    this?.pb?.update?.(this.decompressedSize);
  };

  onSuccess: OnSuccessGzip = () => {
    this?.pb?.success();
  };

  onFinish: OnFinishGzip = () => {
    this?.pb?.stop();
  };

  onError: OnErrorGzip = () => {
    this?.pb?.stop();
  };

  methodsToOpts = (): GzipOptions => ({
    onStart: this.onStart,
    onTransform: this.onTransform,
    onSuccess: this.onSuccess,
    onFinish: this.onFinish,
    onError: this.onError,
  });
}
