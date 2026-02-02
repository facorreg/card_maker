export type DecompressedTypes = "xml" | "folder";
export type CompressionTypes = "zip" | "gz";
export type DataTypes = DecompressedTypes | CompressionTypes;

export interface Manifest {
  lang: string;
  name: string;
  url: string;
  compressType: CompressionTypes;
  type: DecompressedTypes;
}

export enum STEPS {
  NOT_STARTED = "NOT_STARTED",
  DOWNLOAD = "DOWNLOAD",
  CHECK_COMPRESSED_ARCHIVE = "CHECK_COMPRESSED_ARCHIVE",
  GUNZIP = "GUNZIP",
  UNZIP = "UNZIP",
  PARSE_FILE = "PARSE_FILE",
  NO_ACTION = "NO_ACTION",
  CLEANUP = "CLEANUP",
}
