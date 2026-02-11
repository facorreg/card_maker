import path from "node:path";
import fileLogger from "../../utils/logger/file.js";
import safeDeletion from "../../utils/safe-deletion.js";
import type {
  FetchAssetOpts,
  OnFetchChunk,
  OnFetchStart,
} from "../fetch-asset/types.js";
import type { MultiBar, SingleBar } from "../progress.js";
import { AssetErrorCodes } from "../types.js";

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
    await fileLogger({
      errCode: AssetErrorCodes.SINGLEBAR_CREATE_ERROR,
      file: fileName,
      error,
    });
  }

  return progress;
}

export default class FetchHandlers {
  pb: SingleBar | undefined;
  downloaded = 0;
  outputPath!: string;
  multiBar!: MultiBar;

  constructor(outputPath: string, multiBar: MultiBar) {
    this.outputPath = outputPath;
    this.multiBar = multiBar;
  }

  onWriteStart: OnFetchStart = async (res) => {
    const contentLength = Number(res.headers.get("content-length") ?? 0);
    this.pb = await createPbHandler(
      path.basename(this.outputPath),
      contentLength,
      this.multiBar,
    );
  };

  onChunk: OnFetchChunk = (chunk) => {
    this.downloaded += chunk.length;
    this.pb?.update(this.downloaded);
  };

  onFinish = () => {
    this.pb?.success?.();
  };

  onError = async () => {
    await safeDeletion(this.outputPath, false);
    this.pb?.error();
  };

  onEnd = () => {
    this.pb?.stop();
  };

  methodsToOpts(): FetchAssetOpts {
    return {
      onStart: this.onWriteStart,
      onChunk: this.onChunk,
      onFinish: this.onFinish,
      onError: this.onError,
      onEnd: this.onEnd,
    };
  }
}
