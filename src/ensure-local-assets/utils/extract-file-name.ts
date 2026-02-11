import path from "node:path";

export default function extractFileName(filePath: string): string {
  const { name, ext } = path.parse(filePath);

  return `${name}${ext}`;
}
