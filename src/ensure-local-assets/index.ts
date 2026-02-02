import fs from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import dictionariesManifest from "../../dictionaries.manifest.json" with {
  type: "json",
};
import su from "../utils/safe-unlink.js";
import type { Manifest } from "./constants.js";
import { STEPS } from "./constants.js";
import customAccess from "./custom-access.js";
import type { AssetError } from "./errors.js";
import fetchWithProgress from "./fetch-with-progress/index.js";
import StepsReporter from "./reporter.js";

function getDictionariesDirPath(): string {
  return path.join(process.cwd(), "dictionaries");
}

function buildFilePath(name: string, extension: string): string {
  return path.join(getDictionariesDirPath(), `${name}.${extension}`);
}

async function runSteps(manifest: Manifest): Promise<void> {
  const filePath = buildFilePath(manifest.name, manifest.fileType);
  const compressedFilePath = buildFilePath(
    manifest.name,
    manifest.compressType,
  );

  let step: STEPS = STEPS.NOT_STARTED;
  const cleanup: Set<STEPS> = new Set();

  const reporter = new StepsReporter(manifest);
  const safeUnlink = (path: string) => su(path).catch(reporter.unlinkError);

  try {
    await mkdir(getDictionariesDirPath(), { recursive: true });

    step = await customAccess(filePath, manifest.fileType);

    if (step === STEPS.CHECK_COMPRESSED_ARCHIVE)
      step = await customAccess(compressedFilePath, manifest.compressType);

    /* starting at STEPS.DOWNLOAD, a corrupted downloaded/compressed file could
      be the cause of an error and therefore require to be cleaned up. */

    cleanup.add(STEPS.DOWNLOAD);

    if (step === STEPS.DOWNLOAD) {
      await fetchWithProgress(manifest, compressedFilePath);
      step = STEPS.DECOMPRESS;
    }

    cleanup.add(STEPS.DECOMPRESS);

    if (step === STEPS.DECOMPRESS) {
      reporter.decompressStart();

      await pipeline(
        fs.createReadStream(compressedFilePath),
        createGunzip(),
        fs.createWriteStream(filePath),
      );

      reporter.decompressEnd();
      step = STEPS.CLEANUP;
    }

    if (step === STEPS.CLEANUP) {
      await safeUnlink(compressedFilePath);
    }
  } catch (e) {
    const err = e as NodeJS.ErrnoException | AssetError;

    if (cleanup.has(STEPS.DOWNLOAD)) {
      reporter.errorCleanup();
      await safeUnlink(compressedFilePath);
    }
    if (cleanup.has(STEPS.DECOMPRESS)) {
      await safeUnlink(filePath);
    }

    reporter.error(manifest, err);

    return;
  }
}

export default async function ensureLocalAssets(): Promise<void> {
  for (const manifest of dictionariesManifest as Manifest[]) {
    await runSteps(manifest);
  }
}
