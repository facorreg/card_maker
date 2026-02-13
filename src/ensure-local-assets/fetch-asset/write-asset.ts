import { once } from "node:events";
import fs from "node:fs";
import type { EventEmitter } from "node:stream";
import { AssetErrorCodes } from "#ELA/types.js";
import type { AsyncNoThrow } from "#utils/no-throw.js";
import asyncNoThrow from "#utils/no-throw.js";
import safeDeletion from "#utils/safe-deletion.js";
import type { FetchAssetOptions, OnFetchChunk } from "./types.js";

const onceEmitter = (emitter: EventEmitter, event: string | symbol) =>
  once(emitter, event);

const ntOnce = asyncNoThrow(onceEmitter);

async function iterateChunks(
  res: Response,
  file: fs.WriteStream,
  onChunk?: OnFetchChunk,
): AsyncNoThrow<void> {
  if (res.body === null) return [new Error(AssetErrorCodes.HTTP_MISSING_BODY)];

  for await (const chunk of res.body) {
    await onChunk?.(chunk);
    if (!file.write(chunk)) {
      await ntOnce(file, "drain");
    }
  }
  return [null];
}

export default async function writeAsset(
  res: Response,
  outputPath: string,
  opts?: FetchAssetOptions,
): AsyncNoThrow<void> {
  await opts?.onStart?.(res);
  const file = fs.createWriteStream(outputPath);

  const ntIterateChunks = asyncNoThrow<NodeJS.ErrnoException>(iterateChunks);

  const [err] = await ntIterateChunks(res, file, opts?.onChunk);

  if (err === null) {
    file.end();
    await ntOnce(file, "finish");
    await opts?.onFinish?.();
  } else {
    file.destroy(err);
    await safeDeletion(outputPath, false);
    await opts?.onError?.();
  }

  await opts?.onEnd?.();

  return [
    err === null
      ? null
      : new Error(AssetErrorCodes.FETCH_W_STREAM_ERROR, { cause: err }),
  ];
}
