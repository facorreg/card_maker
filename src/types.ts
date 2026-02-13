export type DecompressedTypes = "xml" | "folder";
export type CompressionTypes = "zip" | "gz";
export type DataTypes = DecompressedTypes | CompressionTypes;

export interface Manifest {
  lang: string;
  name: string;
  url: string;
  roughSize?: number;
  inputType: CompressionTypes;
  outputType: DecompressedTypes;
}
