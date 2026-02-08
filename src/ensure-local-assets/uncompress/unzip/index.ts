import type { Entry } from "yauzl";
import type { AsyncNoThrow, Manifest } from "../../constants.js";
import type { MultiBar } from "../../progress/index.js";
import Unzip from "./unzip.js";

export default async function unzip(
  outputPath: string,
  inputPath: string,
  manifest: Manifest,
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

  const inputName = `${manifest.name}.zip`;
  const [errPbCreate, pb] = multiBar.create(
    inputName,
    "uncompress",
    uncompressedSize,
  );

  if (errPbCreate) {
    /* handle */ console.log(errPbCreate);
  }

  let unzipped = 0;

  unzip.onTransform = (chunk: Buffer, entry: Entry) => {
    unzipped += chunk.length;
    pb?.update(unzipped, { fileName: entry.fileName });
  };

  const applyDefaultName = () => pb?.update(unzipped, { name: inputName });

  unzip.onError = () => {
    applyDefaultName();
    pb?.error();
  };
  unzip.onSuccess = () => {
    applyDefaultName();
    pb?.success();
  };

  return unzip.uncompressEntries();
}
