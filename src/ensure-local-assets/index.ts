import fs from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import extract from "extract-zip";
import dictionariesManifest from "../../dictionaries.manifest.json" with {
  type: "json",
};
import sd from "../utils/safe-deletion.js";
import type { DataTypes, Manifest } from "./constants.js";
import { STEPS } from "./constants.js";
import customAccess from "./custom-access.js";
import type { AssetError } from "./errors.js";
import fetchWithProgress from "./fetch-with-progress/index.js";
import StepsReporter from "./reporter.js";

function getDictionariesDirPath(): string {
  return path.join(process.cwd(), "dictionaries");
}

function buildPath(name: string, type: DataTypes): string {
  const endPath = type !== "folder" ? `${name}.${type}` : name;
  return path.join(getDictionariesDirPath(), endPath);
}

async function runSteps(manifest: Manifest): Promise<void> {
  const path = buildPath(manifest.name, manifest.type);
  const compressedPath = buildPath(manifest.name, manifest.compressType);

  let step: STEPS = STEPS.NOT_STARTED;
  const cleanup: Set<STEPS> = new Set();

  const reporter = new StepsReporter(manifest);
  const safeDeletion = (path: string, isDir: boolean) =>
    sd(path, isDir).catch(reporter.unlinkError);

  try {
    await mkdir(getDictionariesDirPath(), { recursive: true });

    step = await customAccess(path, manifest.type);

    if (step === STEPS.CHECK_COMPRESSED_ARCHIVE)
      step = await customAccess(compressedPath, manifest.compressType);

    /* starting at STEPS.DOWNLOAD, a corrupted downloaded/compressed file could
      be the cause of an error and therefore require to be cleaned up. */

    cleanup.add(STEPS.DOWNLOAD);

    if (step === STEPS.DOWNLOAD) {
      await fetchWithProgress(manifest, compressedPath);
      step = STEPS.UNZIP;
    }

    cleanup.add(STEPS.UNZIP);

    if (step === STEPS.UNZIP) {
      reporter.decompressStart();

      if (manifest.compressType === "gz") {
        await pipeline(
          fs.createReadStream(compressedPath),
          createGunzip(),
          fs.createWriteStream(path),
        );
      } else {
        await extract(compressedPath, { dir: path });
      }

      reporter.decompressEnd();
      step = STEPS.CLEANUP;
    }

    if (step === STEPS.CLEANUP) {
      await safeDeletion(compressedPath, false);
    }

    if (step === STEPS.NO_ACTION) {
      return;
    }
  } catch (e) {
    const err = e as NodeJS.ErrnoException | AssetError;

    if (cleanup.has(STEPS.DOWNLOAD)) {
      reporter.errorCleanup();
      await safeDeletion(compressedPath, false);
    }
    if (cleanup.has(STEPS.GUNZIP)) {
      await safeDeletion(path, manifest.type === "folder");
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
