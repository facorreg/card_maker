import type { ResultAsync } from "neverthrow";

export type OnFetchStart = (res: Response) => ResultAsync<void, Error>;
export type OnFetchChunk = (chunk: Uint8Array<ArrayBuffer>) => void;
export type DefaultFetchCB = () => void;

export interface FetchAssetOptions {
  onStart?: OnFetchStart;
  onChunk?: OnFetchChunk;
  onFinish?: DefaultFetchCB;
  onError?: DefaultFetchCB;
  onEnd?: DefaultFetchCB;
}
