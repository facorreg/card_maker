import { once } from "node:events";
import fs from "node:fs";
import { finished } from "node:stream/promises";
import { okAsync, ResultAsync } from "neverthrow";
import {
  ELA_Error,
  ELA_ErrorCodes,
  ELA_HttpError,
  ELA_IoError,
  InterfaceError,
  InterfaceErrorCodes,
} from "#ELA/types.js";
import logger from "#utils/logger/console.js";
import reporter from "#utils/logger/reporter.js";
import { safeUnlink } from "#utils/neverthrow/promises/fs.js";
import type { FetchAssetOptions, OnFetchChunk } from "./types.js";

const errorPromise = (ws: fs.WriteStream) =>
  once(ws, "error").then(([err]) => {
    throw err;
  });

function iterateChunks(
  res: Response,
  ws: fs.WriteStream,
  onChunk?: OnFetchChunk,
): ResultAsync<void, Error> {
  const body = res.body;

  if (body === null) {
    return ResultAsync.fromPromise(
      Promise.reject(
        new ELA_HttpError(ELA_ErrorCodes.HTTP_MISSING_BODY, res.url, null),
      ),
      (e) => e as Error,
    );
  }

  return ResultAsync.fromPromise(
    (async () => {
      for await (const chunk of body) {
        onChunk?.(chunk);

        if (!ws.write(chunk)) {
          await Promise.race([once(ws, "drain"), errorPromise(ws)]);
        }
      }
    })(),
    (e) =>
      e instanceof ELA_Error
        ? e
        : new InterfaceError(InterfaceErrorCodes.RAW_ERROR, e),
  );
}

export default function writeAsset(
  res: Response,
  outputPath: string,
  opts?: FetchAssetOptions,
): ResultAsync<void, Error> {
  const { onStart, onError, onEnd, onFinish } = opts || {};

  let chain: ResultAsync<void, Error> = onStart ? onStart(res) : okAsync();
  chain = chain.orElse((error) => reporter({ error }));

  const ws = fs.createWriteStream(outputPath);

  chain = chain
    .andThen(() => iterateChunks(res, ws, opts?.onChunk))
    .mapErr((error) => {
      ws.destroy(error);
      onError?.();

      const streamWError = new ELA_IoError(
        ELA_ErrorCodes.STREAM_W_ERROR,
        outputPath,
        error,
      );

      safeUnlink(outputPath).match(
        () => {},
        (ulErr) => logger.warn(JSON.stringify(ulErr)),
      );

      return streamWError;
    })
    .andThen(() => {
      ws.end();

      let finishChain = ResultAsync.fromPromise(
        finished(ws),
        (e) =>
          new ELA_IoError(ELA_ErrorCodes.STREAM_W_FINISH_ERROR, outputPath, e),
      );

      if (onFinish) finishChain = finishChain.andTee(onFinish);

      return finishChain.map(() => undefined);
    });

  if (onEnd) chain = chain.andTee(onEnd).orTee(onEnd);

  return chain;
}
