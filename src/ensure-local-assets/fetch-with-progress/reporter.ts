import { AssetError, AssetErrorCodes } from "../errors.js";

export default class ErrorReporter {
  invalidStatus(status: number) {
    return new AssetError({
      code: AssetErrorCodes.HTTP_INVALID_STATUS,
      message: `HTTP ${status}`,
    });
  }
  noBody() {
    return new AssetError({
      code: AssetErrorCodes.HTTP_MISSING_BODY,
      message: "Download: missing body",
    });
  }

  error(err: NodeJS.ErrnoException) {
    return new AssetError({
      code: AssetErrorCodes.FILE_WRITING_ERROR,
      message: `Failed to write file`,
      cause: err,
    });
  }
}
