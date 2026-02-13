export type DecompressedTypes = "xml" | "folder";
export type CompressionTypes = "zip" | "gz";
export type DataTypes = DecompressedTypes | CompressionTypes;

export type ParseType = "KANJIDIC" | "JMDICT" | "BCCWJ";
export interface Manifest {
  lang: string;
  name: string;
  url: string;
  roughSize?: number;
  inputType: CompressionTypes;
  outputType: DecompressedTypes;
  parseType?: ParseType;
}
