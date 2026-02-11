import { once } from "node:events";
import fs from "node:fs";
import type { AsyncNoThrow } from "../../utils/no-throw.js";
import asyncNoThrow from "../../utils/no-throw.js";
import safeDeletion from "../../utils/safe-deletion.js";
import { AssetErrorCodes } from "../types.js";
import type { FetchAssetOpts, OnFetchChunk } from "./types.js";

async function iterateChunks(
  res: Response,
  file: fs.WriteStream,
  onChunk?: OnFetchChunk,
): AsyncNoThrow<void> {
  if (res.body === null) return [new Error(AssetErrorCodes.HTTP_MISSING_BODY)];

  for await (const chunk of res.body) {
    await onChunk?.(chunk);
    if (!file.write(chunk)) {
      await once(file, "drain");
    }
  }
  return [null];
}

export default async function writeAsset(
  res: Response,
  outputPath: string,
  opts?: FetchAssetOpts,
): AsyncNoThrow<void> {
  await opts?.onStart?.(res);
  const file = fs.createWriteStream(outputPath);

  const ntIterateChunks = asyncNoThrow<NodeJS.ErrnoException>(
    iterateChunks,
    new Error(AssetErrorCodes.FETCH_W_STREAM_ERROR),
  );

  const [err] = await ntIterateChunks(res, file, opts?.onChunk);

  if (err === null) {
    file.end();
    await once(file, "finish");
    await opts?.onFinish?.();
    return [null];
  } else {
    file.destroy(err);
    await safeDeletion(outputPath, false);
    await opts?.onError?.();
  }

  await opts?.onEnd?.();

  return [
    err?.code
      ? (err ?? null)
      : new Error(AssetErrorCodes.FETCH_W_STREAM_ERROR, { cause: err }),
  ];
}
