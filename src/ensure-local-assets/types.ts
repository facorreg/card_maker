export const ELA_StepsCodes = {
  NOT_STARTED: "NOT_STARTED",
  DOWNLOAD: "DOWNLOAD",
  CHECK_COMPRESSED_ARCHIVE: "CHECK_COMPRESSED_ARCHIVE",
  DECOMPRESS: "DECOMPRESS",
  DECOMPRESS_INNER_FILE: "DECOMPRESS_INNER_FILE", // only called within decompress/gunzip
  PARSE_FILE: "PARSE_FILE",
  NO_ACTION: "NO_ACTION",
  CLEANUP: "CLEANUP",
} as const;

export type ELA_StepsCodes =
  (typeof ELA_StepsCodes)[keyof typeof ELA_StepsCodes];

export enum InterfaceErrorCodes {
  REPORT_HANDLED = "REPORT_HANDLED",
  BAD_JSON = "BAD_JSON",
  RAW_ERROR = "RAW_ERROR",
  EMPTY_MANIFEST = "EMPTY_MANIFEST",
}

export enum ELA_ErrorCodes {
  MANIFEST_UNREADABLE = "MANIFEST_UNREADABLE",
  MANIFEST_BAD_FORMAT = "MANIFEST_BAD_FORMAT",

  FILE_STATE_MISSING = "FILE_STATE_MISSING",
  FILE_R_ERROR = "FILE_R_ERROR",

  FETCH_ERROR = "FETCH_ERROR",
  HTTP_INVALID_STATUS = "HTTP_INVALID_STATUS",
  HTTP_MISSING_BODY = "HTTP_MISSING_BODY",
  STREAM_W_ERROR = "STREAM_W_ERROR",
  STREAM_W_FINISH_ERROR = "STREAM_W_FINISH_ERROR",

  NO_ERRCODE_SPECIFIED = "NO_ERRCODE_SPECIFIED",

  MKDIR_ERROR = "MKDIR_ERROR",
  FILE_W_ERROR = "FILE_W_ERROR",

  UNZIP_ERROR = "UNZIP_ERROR",
  UNZIP_DECOMPRESSED_SIZE_ERROR = "UNZIP_DECOMPRESSED_SIZE_ERROR",
  UNZIP_OPEN_ERROR = "UNZIP_OPEN_ERROR",
  UNZIP_FILE_ERROR = "UNZIP_FILE_ERROR",

  GZIP_INVALID_FORMAT = "GZIP_INVALID_FORMAT",
  GZIP_ERROR = "GZIP_ERROR",

  SINGLEBAR_CREATE_ERROR = "SINGLEBAR_CREATE_ERROR",

  DELETION_FILE_NOT_FOUND = "DELETION_FILE_NOT_FOUND",
  DELETION_FAILED = "DELETION_FAILED",

  LOG_R_STREAM_ERROR = "LOG_R_STREAM_ERROR",
}

export type AssetState = ELA_StepsCodes | ELA_ErrorCodes;
export class ELA_Error extends Error {
  constructor(
    public readonly code: ELA_ErrorCodes | InterfaceErrorCodes,
    public override readonly message: string,
    public override readonly cause: unknown,
  ) {
    super(`${[code]}: ${message}`);
  }
}

export class ELA_ErrorHandled extends ELA_Error {
  constructor(cause: unknown) {
    super(InterfaceErrorCodes.REPORT_HANDLED, "", cause);
  }
}

type InterfaceErrorTypes =
  | InterfaceErrorCodes.BAD_JSON
  | InterfaceErrorCodes.RAW_ERROR
  | InterfaceErrorCodes.EMPTY_MANIFEST;
export class InterfaceError extends ELA_Error {
  constructor(code: InterfaceErrorTypes, cause: unknown) {
    const messages: Record<InterfaceErrorTypes, string> = {
      BAD_JSON: "Invalid JSON format",
      RAW_ERROR: "Untracked error",
      EMPTY_MANIFEST: "Manifests array is empty",
    };

    super(code, `${messages[code]}`, cause);
  }
}

type IoErrorTypes =
  | ELA_ErrorCodes.MKDIR_ERROR
  | ELA_ErrorCodes.FILE_STATE_MISSING
  | ELA_ErrorCodes.FILE_R_ERROR
  | ELA_ErrorCodes.MANIFEST_UNREADABLE
  | ELA_ErrorCodes.FILE_W_ERROR
  | ELA_ErrorCodes.STREAM_W_ERROR
  | ELA_ErrorCodes.STREAM_W_FINISH_ERROR
  | ELA_ErrorCodes.GZIP_INVALID_FORMAT
  | ELA_ErrorCodes.GZIP_ERROR
  | ELA_ErrorCodes.UNZIP_OPEN_ERROR
  | ELA_ErrorCodes.UNZIP_ERROR;
export class ELA_IoError extends ELA_Error {
  constructor(code: IoErrorTypes, path: string, cause: unknown) {
    const messages: Record<IoErrorTypes, string> = {
      MKDIR_ERROR: "Failed to create directory",
      FILE_STATE_MISSING: "Access failed: not found",
      MANIFEST_UNREADABLE: "Failed to read manifest",
      FILE_R_ERROR: "Access failed: unreachable",
      FILE_W_ERROR: "Failed to write data to file",
      STREAM_W_ERROR: "Failed to write data from stream",
      STREAM_W_FINISH_ERROR:
        "WriteStream finish event failed, making the target file potential incomplete",
      GZIP_INVALID_FORMAT: "Gzip failed: invalid format",
      GZIP_ERROR: "Gzip failed",
      UNZIP_OPEN_ERROR: "Unzip Error: failed to open file",
      UNZIP_ERROR: "Unzip Error",
    };

    super(code, `${messages[code]} at ${path}`, cause);
  }
}

type HttpErrorTypes =
  | ELA_ErrorCodes.HTTP_INVALID_STATUS
  | ELA_ErrorCodes.FETCH_ERROR
  | ELA_ErrorCodes.HTTP_MISSING_BODY;

export class ELA_HttpError extends ELA_Error {
  constructor(type: HttpErrorTypes, url: string, cause: unknown) {
    const messages: Record<HttpErrorTypes, string> = {
      FETCH_ERROR: "Failed to fetch data",
      HTTP_INVALID_STATUS: "Failed to fetch data : invalid status",
      HTTP_MISSING_BODY: "Expected response to have a body",
    };

    super(type, `${messages[type]} at ${url}`, cause);
  }
}
