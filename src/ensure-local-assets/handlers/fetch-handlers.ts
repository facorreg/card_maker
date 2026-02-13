import type {
  FetchAssetOptions,
  OnFetchChunk,
  OnFetchStart,
} from "#ELA/fetch-asset/types.js";
import { AssetErrorCodes } from "#ELA/types.js";
import extractFileName from "#ELA_Utils/extract-file-name.js";
import reporter from "#utils/logger/reporter.js";
import type { MultiBar, SingleBar } from "#utils/progress.js";
import safeDeletion from "#utils/safe-deletion.js";

async function createPbHandler(
  fileName: string,
  contentLength: number,
  multiBar: MultiBar,
): Promise<SingleBar | undefined> {
  const [error, progress] = multiBar.create(
    fileName,
    "download",
    contentLength,
  );

  if (error) {
    await reporter({
      errCode: AssetErrorCodes.SINGLEBAR_CREATE_ERROR,
      file: fileName,
      error,
    });
  }

  return progress;
}

export default class FetchHandlers {
  pb: SingleBar | undefined;
  multiBar!: MultiBar;
  downloaded = 0;
  compressedFilePath!: string;
  outputFilePath!: string;
  url: string;
  roughSize: number;

  constructor(
    url: string,
    compressedFilePath: string,
    outputFilePath: string,
    multiBar: MultiBar,
    roughSize?: number,
  ) {
    this.url = url;
    this.compressedFilePath = compressedFilePath;
    this.outputFilePath = outputFilePath;
    this.multiBar = multiBar;
    this.roughSize = roughSize || 0;
  }

  getContentLengthFromHeaders(res: Response): number {
    return Number(res.headers.get("content-length") ?? 0);
  }

  onWriteStart: OnFetchStart = async (res) => {
    const contentLength =
      this.getContentLengthFromHeaders(res) || this.roughSize;

    this.pb = await createPbHandler(
      extractFileName(this.compressedFilePath || this.outputFilePath),
      contentLength,
      this.multiBar,
    );
  };

  onChunk: OnFetchChunk = (chunk) => {
    this.downloaded += chunk.length;
    this.pb?.update(
      this.roughSize
        ? Math.min(this.downloaded, this.roughSize)
        : this.downloaded,
    );
  };

  onFinish = () => {
    if (this.roughSize) this.pb?.update(this.roughSize);
    this.pb?.success?.();
  };

  onError = async () => {
    await safeDeletion(this.outputFilePath, false);
    this.pb?.error();
  };

  onEnd = () => {
    this.pb?.stop();
  };

  methodsToOpts(): FetchAssetOptions {
    return {
      onStart: this.onWriteStart,
      onChunk: this.onChunk,
      onFinish: this.onFinish,
      onError: this.onError,
      onEnd: this.onEnd,
    };
  }
}
