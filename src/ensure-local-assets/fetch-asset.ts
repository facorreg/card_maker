import { once } from "node:events";
import fs from "node:fs";
import fileLogger from "../utils/logger/file.js";
import type { AsyncNoThrow } from "../utils/no-throw.js";
import asyncNoThrow from "../utils/no-throw.js";
import safeDeletion from "../utils/safe-deletion.js";
import type { MultiBar, SingleBar } from "./progress.js";
import type { Manifest } from "./types.js";
import { AssetErrorCodes } from "./types.js";

async function iterateChunks(
  res: Response,
  file: fs.WriteStream,
  progress?: SingleBar,
): AsyncNoThrow<undefined> {
  if (res.body === null) return [new Error(AssetErrorCodes.HTTP_MISSING_BODY)];

  let downloaded = 0;

  for await (const chunk of res.body) {
    downloaded += chunk.length;
    progress?.update(downloaded);

    if (!file.write(chunk)) {
      await once(file, "drain");
    }
  }
  return [null];
}

async function writeAsset(
  res: Response,
  manifest: Manifest,
  outputPath: string,
  multiBar: MultiBar,
): AsyncNoThrow<undefined> {
  const contentLength = Number(res.headers.get("content-length") ?? 0);
  const fileName = `${manifest.name}.${manifest.inputType}`;

  const [error, progress] = await multiBar.create(
    fileName,
    "download",
    contentLength,
  );

  if (error) {
    await fileLogger({
      errCode: AssetErrorCodes.SINGLEBAR_CREATE_ERROR,
      file: manifest.name,
    });
  }

  const file = fs.createWriteStream(outputPath);

  const ntIterateChunks = asyncNoThrow(
    iterateChunks,
    new Error(AssetErrorCodes.FETCH_W_STREAM_ERROR),
  );

  const [err] = await ntIterateChunks(res, file, progress);

  if (err === null) {
    file.end();
    await once(file, "finish");
    progress?.success();
    return [null];
  } else {
    file.destroy(err);
    await safeDeletion(outputPath, false);
    progress?.error();
  }

  progress?.stop();
  return [
    err?.code
      ? ((err as Error) ?? null)
      : new Error(AssetErrorCodes.FETCH_W_STREAM_ERROR, { cause: err }),
  ];
}

export default async function fetchAsset(
  manifest: Manifest,
  outputPath: string,
  multiBar: MultiBar,
): AsyncNoThrow<undefined> {
  const ntFetch = asyncNoThrow(fetch, new Error(AssetErrorCodes.FETCH_ERROR));

  const [fetchError, res] = await ntFetch(manifest.url, {
    signal: AbortSignal.timeout(60_000),
  });

  if (fetchError !== null || !res)
    return [new Error(AssetErrorCodes.FETCH_ERROR)];
  if (!res.ok) return [new Error(AssetErrorCodes.HTTP_INVALID_STATUS)];

  return writeAsset(res, manifest, outputPath, multiBar);
}
