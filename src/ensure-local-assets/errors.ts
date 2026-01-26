export enum AssetErrorCodes {
  FILE_STATE_MISSING = "FILE_STATE_MISSING",
  FILE_STATE_UNREACHABLE = "FILE_STATE_UNREACHABLE",
  HTTP_INVALID_STATUS = "HTTP_INVALID_STATUS",
  HTTP_MISSING_BODY = "HTTP_MISSING_BODY",
  FILE_WRITING_ERROR = "FILE_WRITING_ERROR",
}

interface AssetErrorOptions {
  code?: string;
  message?: string;
  cause?: NodeJS.ErrnoException;
}

export class AssetError extends Error {
  code!: string;
  // Set the error name to your custom error class name

  constructor(options: AssetErrorOptions) {
    super(options.message || "", { cause: options.cause });
    this.code = options.code ?? "NO_ERRCODE_SPECIFIED";
  }
}
