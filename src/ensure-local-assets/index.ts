import { once } from "node:events";
import fs from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import type { SingleBar } from "cli-progress";
import cliProgress from "cli-progress";
import dictionariesManifest from "../../dictionaries.manifest.json" with {
  type: "json",
};
import { STEPS } from "./constants.js";
import customAccess from "./custom-access.js";
import { AssetError, AssetErrorCodes } from "./errors.js";

interface Manifest {
  lang: string;
  name: string;
  protocol: string;
  url: string;
  compressType: string;
  fileType: string;
}

function initFormattedProgressBar(fileName: string): SingleBar {
  return new cliProgress.SingleBar(
    { format: `Downloading: ${fileName} | {bar} | {percentage}%` },
    cliProgress.Presets.shades_classic,
  );
}

async function fetchWithProgress(
  manifest: Manifest,
  filePath: string,
): Promise<void> {
  const res = await fetch(manifest.url, {
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok)
    return Promise.reject(
      new AssetError({
        code: AssetErrorCodes.HTTP_INVALID_STATUS,
        message: `HTTP ${res.status}`,
      }),
    );
  else if (!res.body)
    return Promise.reject(
      new AssetError({
        code: AssetErrorCodes.HTTP_MISSING_BODY,
        message: "Download: missing body",
      }),
    );

  let downloaded = 0;
  const contentLength = Number(res.headers.get("content-length") ?? 0);

  const fileName = `${manifest.name}.${manifest.compressType}`;
  const pb = initFormattedProgressBar(fileName);
  const file = fs.createWriteStream(filePath);

  pb.start(contentLength, 0);

  try {
    for await (const chunk of res.body) {
      downloaded += chunk.length;
      pb.update(downloaded);

      if (!file.write(chunk)) {
        await once(file, "drain");
      }
    }
    file.end();
    await once(file, "finish");
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    file.destroy(err);
    return Promise.reject(
      new AssetError({
        code: AssetErrorCodes.FILE_WRITING_ERROR,
        message: `Failed to write file`,
        cause: err,
      }),
    );
  } finally {
    pb.stop();
  }
  console.log(`Downloaded: ${fileName}`);
}

function getDictionariesDirPath(): string {
  return path.join(process.cwd(), "dictionaries");
}

function buildFilePath(name: string, extension: string): string {
  return path.join(getDictionariesDirPath(), `${name}.${extension}`);
}

function handleUnlinkFailure(error: NodeJS.ErrnoException, filePath: string) {
  if (error.code === "ENOENT") {
    console.warn(`Not found: ${filePath}`);
    return;
  }

  console.warn(
    `File ${filePath} may have not been properly deleted during cleanup.`,
  );
}

async function runSteps(manifest: Manifest): Promise<void> {
  const filePath = buildFilePath(manifest.name, manifest.fileType);
  const compressedFilePath = buildFilePath(
    manifest.name,
    manifest.compressType,
  );

  try {
    await mkdir(getDictionariesDirPath(), { recursive: true });

    let step: STEPS = await customAccess(filePath, manifest.fileType);

    if (step === STEPS.CHECK_COMPRESSED_ARCHIVE)
      step = await customAccess(compressedFilePath, manifest.compressType);

    if (step === STEPS.DOWNLOAD) {
      await fetchWithProgress(manifest, compressedFilePath);
      step = STEPS.DECOMPRESS;
    }

    if (step === STEPS.DECOMPRESS) {
      console.log("Decompressing file");
      await pipeline(
        fs.createReadStream(compressedFilePath),
        createGunzip(),
        fs.createWriteStream(filePath),
      );
      console.log("File successfully decompressed");

      step = STEPS.CLEANUP;
    }

    if (step === STEPS.CLEANUP) {
      await unlink(compressedFilePath).catch((err) =>
        handleUnlinkFailure(err, compressedFilePath),
      );
    }
  } catch (e) {
    const err = e as NodeJS.ErrnoException | AssetError;
    let unlinkStep = 0;

    await unlink(compressedFilePath)
      .then(() => {
        unlinkStep = 1;
        return unlink(filePath);
      })
      .catch((uE) => {
        console.log("Error cleanup failed.");
        if (unlinkStep === 0) {
          handleUnlinkFailure(uE, compressedFilePath);
        } else {
          handleUnlinkFailure(uE, filePath);
        }
      });
    console.warn(
      `${manifest.name}.${manifest.fileType} could not be properly downloaded or extracted`,
    );
    console.warn(`${err.code}: ${err.message}`);
    console.warn(`Cause: ${err.cause ?? "No other cause specified"}`);

    // non blocking
    return Promise.resolve();
  }
}

export default async function ensureLocalAssets(): Promise<void> {
  for (const manifest of dictionariesManifest as Manifest[]) {
    await runSteps(manifest);
  }
}
