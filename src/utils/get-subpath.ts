export default function (filePath: string): string {
  const regexp = RegExp(/.*(\/)/g);

  const [zipFolderSubpath = ""] = regexp.exec(filePath) || [];

  return zipFolderSubpath;
}
