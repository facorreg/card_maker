import type { Entry } from "yauzl";
import type { AsyncNoThrow } from "../../../utils/no-throw.js";
import type { MultiBar } from "../../progress/index.js";
import Unzip from "./unzip.js";

export default async function unzip(
  outputPath: string,
  inputPath: string,
  inputFileName: string,
  multiBar: MultiBar,
): AsyncNoThrow<string> {
  const unzip = new Unzip({
    extractPath: outputPath,
    zipPath: inputPath,
  });

  const [errGDS, uncompressedSize] = await unzip.getUncompressedSize();

  if (errGDS) {
    /* handle */ console.log(errGDS);
  }

  const [errPbCreate, pb] = multiBar.create(
    inputFileName,
    "uncompress",
    uncompressedSize,
  );

  if (errPbCreate) {
    /* handle */ console.log(errPbCreate);
  }

  let uncompressed = 0;

  unzip.onTransform = (chunk: Buffer, entry: Entry) => {
    uncompressed += chunk.length;
    pb?.update(uncompressed, { fileName: entry.fileName });
  };

  const resetFileName = () => {
    pb?.update(uncompressed, { fileName: inputFileName });
  };

  unzip.onError = () => {
    resetFileName();
    pb?.error();
  };
  unzip.onSuccess = () => {
    resetFileName();
    pb?.success();
  };

  return unzip.uncompressEntries();
}
