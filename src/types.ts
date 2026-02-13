export type OutputTypes = "xml" | "tsv" | "txt" | "folder";
export type CompressedTypes = "zip" | "gz";
export type DataTypes = OutputTypes | CompressedTypes;

export type ParseType = "KANJIDIC" | "JMDICT" | "BCCWJ";
export interface Manifest {
  lang: string;
  name: string;
  url: string;
  roughSize?: number;
  compressedType?: CompressedTypes;
  outputType: OutputTypes;
  parseType?: ParseType;
}
