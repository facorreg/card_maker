import { once } from "node:events";
import fs from "node:fs";
import type { AsyncNoThrow } from "../../utils/no-throw.js";
import asyncNoThrow from "../../utils/no-throw.js";
import type { Manifest } from "../constants.js";
import { AssetError, AssetErrorCodes } from "../errors.js";
import type { MultiBar, SingleBar } from "../progress/index.js";

const errorReporter = {
  fetchError: new AssetError(AssetErrorCodes.FETCH_ERROR),
  invalidStatus: new AssetError(AssetErrorCodes.HTTP_INVALID_STATUS),
  noBody: new AssetError(AssetErrorCodes.HTTP_MISSING_BODY),
};

async function iterateChunks(
  res: Response,
  file: fs.WriteStream,
  progress?: SingleBar,
) {
  if (res.body === null) return Promise.reject(errorReporter.noBody);

  let downloaded = 0;

  for await (const chunk of res.body) {
    downloaded += chunk.length;
    progress?.update(downloaded);

    if (!file.write(chunk)) {
      await once(file, "drain");
    }
  }
}

async function writeAsset(
  res: Response,
  manifest: Manifest,
  filePath: string,
  multiBar: MultiBar,
): AsyncNoThrow<undefined> {
  const contentLength = Number(res.headers.get("content-length") ?? 0);
  const fileName = `${manifest.name}.${manifest.inputType}`;
  const file = fs.createWriteStream(filePath);

  const [error, progress] = await multiBar.create(
    fileName,
    "download",
    contentLength,
  );

  if (error) {
    /* @TODO error */
  }

  const ntIterateChunks = asyncNoThrow(
    iterateChunks,
    new AssetError(AssetErrorCodes.FETCH_W_STREAM_ERROR),
  );

  const [err] = await ntIterateChunks(res, file, progress);

  if (err === null) {
    file.end();
    await once(file, "finish");
    progress?.success();
    return [null];
  } else {
    file.destroy(err);
    progress?.error();
  }

  progress?.stop();
  return [err ?? null];
}

export default async function fetchAsset(
  manifest: Manifest,
  filePath: string,
  multiBar: MultiBar,
): AsyncNoThrow<undefined> {
  const ntFetch = asyncNoThrow(fetch, errorReporter.fetchError);

  const [fetchError, res] = await ntFetch(manifest.url, {
    signal: AbortSignal.timeout(60_000),
  });

  if (fetchError !== null || !res)
    return [fetchError ?? errorReporter.fetchError];
  if (!res.ok) return [errorReporter.invalidStatus];

  return writeAsset(res, manifest, filePath, multiBar);
}
