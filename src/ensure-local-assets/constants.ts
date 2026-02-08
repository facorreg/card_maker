export type DecompressedTypes = "xml" | "folder";
export type CompressionTypes = "zip" | "gz";
export type DataTypes = DecompressedTypes | CompressionTypes;

export type NoThrow<T, E extends Error = NodeJS.ErrnoException> = [
  E | null,
  T?,
];
export type AsyncNoThrow<T, E extends Error = NodeJS.ErrnoException> = Promise<
  NoThrow<T, E>
>;
export interface Manifest {
  lang: string;
  name: string;
  url: string;
  inputType: CompressionTypes;
  outputType: DecompressedTypes;
}

export enum STEPS {
  NOT_STARTED = "NOT_STARTED",
  DOWNLOAD = "DOWNLOAD",
  CHECK_COMPRESSED_ARCHIVE = "CHECK_COMPRESSED_ARCHIVE",
  UNCOMPRESS = "UNCOMPRESS",
  PARSE_FILE = "PARSE_FILE",
  NO_ACTION = "NO_ACTION",
  CLEANUP = "CLEANUP",
}
