export interface Manifest {
  lang: string;
  name: string;
  protocol: string;
  url: string;
  compressType: string;
  fileType: string;
}

export enum STEPS {
  NOT_STARTED = "NOT_STARTED",
  DOWNLOAD = "DOWNLOAD",
  CHECK_COMPRESSED_ARCHIVE = "CHECK_COMPRESSED_ARCHIVE",
  DECOMPRESS = "DECOMPRESS",
  PARSE_FILE = "PARSE_FILE",
  CLEANUP = "CLEANUP",
}
