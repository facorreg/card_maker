import { errAsync, okAsync, type ResultAsync } from "neverthrow";
import { ELA_ErrorCodes, ELA_HttpError } from "#ELA/types.js";
import { safeFetch } from "#utils/neverthrow/promises/http.js";
// import type { AsyncNoThrow } from "#utils/no-throw.js";
// import type { FetchAssetOptions } from "./types.js";
// import writeAsset from "./write-asset.js";

export default function fetchAsset(
  url: string,
  // outputPath: string,
  // opts: FetchAssetOptions,
): ResultAsync<Response, Error> {
  return safeFetch(url, {
    signal: AbortSignal.timeout(
      parseInt(process.env.FETCH_TIMEOUT || "", 10) || 60_000,
    ),
  })
    .mapErr((e) => new ELA_HttpError(ELA_ErrorCodes.FETCH_ERROR, url, e))
    .andThen((res) => {
      if (!res?.ok)
        return errAsync(
          new ELA_HttpError(
            res
              ? ELA_ErrorCodes.HTTP_INVALID_STATUS
              : ELA_ErrorCodes.FETCH_ERROR,
            url,
            null,
          ),
        );

      return okAsync(res);
    });
}
