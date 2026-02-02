import logger from "../utils/logger/index.js";
import type { UnlinkError } from "../utils/safe-unlink.js";
import type { Manifest } from "./constants.js";
import type { AssetError } from "./errors.js";

export default class StepsReporter {
  manifest!: Manifest;

  constructor(manifest: Manifest) {
    this.manifest = manifest;
  }

  fetchSuccess() {
    const fileName = `${this.manifest.name}.${this.manifest.compressType}`;
    logger.success(`Downloaded: ${fileName}`);
  }

  decompressStart() {
    logger.info("Decompressing file");
  }

  decompressEnd() {
    logger.success("File decompressed");
  }

  errorCleanup() {
    logger.info("Cleaning up faulty files");
  }

  error(manifest: Manifest, err: NodeJS.ErrnoException | AssetError) {
    logger.warn(
      `${manifest.name}.${manifest.fileType} could not be properly downloaded or extracted`,
    );
    logger.warn(`${err.code}: ${err.message}`);
    logger.warn(`Cause: ${err.cause ?? "No other cause specified"}`);
  }

  unlinkError(err: UnlinkError) {
    if (err.state === "not_found") {
      logger.warn(`File deletion: ${err.path} not found`);
    } else {
      logger.warn(`File ${err.path} may not have been properly deleted.`);
      logger.warn(
        `${err.cause?.code ?? "no error code"}: ${err.cause?.message || "no error message"}`,
      );
    }
  }
}
