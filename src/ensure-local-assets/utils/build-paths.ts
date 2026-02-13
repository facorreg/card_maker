import path from "node:path";
import type { DataTypes } from "#src/types.js";

export function getDictionariesDirPath(): string {
  return path.join(process.cwd(), "dictionaries");
}

export function buildPath(name: string, type: DataTypes): string {
  const endPath = type !== "folder" ? `${name}.${type}` : name;
  return path.join(getDictionariesDirPath(), endPath);
}
