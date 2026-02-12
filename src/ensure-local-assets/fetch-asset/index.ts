import { AssetErrorCodes } from "#ELA/types.js";
import type { AsyncNoThrow } from "#utils/no-throw.js";
import asyncNoThrow from "#utils/no-throw.js";
import type { FetchAssetOptions } from "./types.js";
import writeAsset from "./write-asset.js";

export default async function fetchAsset(
  url: string,
  outputPath: string,
  opts: FetchAssetOptions,
): AsyncNoThrow<void> {
  const ntFetch = asyncNoThrow(fetch, new Error(AssetErrorCodes.FETCH_ERROR));

  const [fetchError, res] = await ntFetch(url, {
    signal: AbortSignal.timeout(
      parseInt(process.env.FETCH_TIMEOUT || "", 10) || 60_000,
    ),
  });

  if (fetchError !== null || !res)
    return [new Error(AssetErrorCodes.FETCH_ERROR)];
  if (!res.ok) return [new Error(AssetErrorCodes.HTTP_INVALID_STATUS)];

  return writeAsset(res, outputPath, opts);
}
