export enum AssetErrorCodes {
  FILE_STATE_MISSING = "FILE_STATE_MISSING",
  FILE_STATE_UNREACHABLE = "FILE_STATE_UNREACHABLE",

  FETCH_ERROR = "FETCH_ERROR",
  HTTP_INVALID_STATUS = "HTTP_INVALID_STATUS",
  HTTP_MISSING_BODY = "HTTP_MISSING_BODY",
  FETCH_W_STREAM_ERROR = "FETCH_W_STREAM_ERROR",

  NO_ERRCODE_SPECIFIED = "NO_ERRCODE_SPECIFIED",

  MKDIR_ERROR = "MKDIR_ERROR",
  FILE_WRITING_ERROR = "FILE_WRITING_ERROR",

  DELETION_FILE_NOT_FOUND = "DELETION_FILE_NOT_FOUND",
  DELETION_FAILED = "DELETION_FAILED",
}

interface AssetErrorOptions {
  // code?: AssetErrorCodes;
  message?: string;
  cause?: NodeJS.ErrnoException;
}

export class AssetError extends Error {
  code!: AssetErrorCodes;
  // Set the error name to your custom error class name

  constructor(code: AssetErrorCodes, options?: AssetErrorOptions) {
    super(options?.message, { cause: options?.cause });
    this.code = code;
  }
}
