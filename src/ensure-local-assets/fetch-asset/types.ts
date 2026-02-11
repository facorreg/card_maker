export type OnFetchStart = (res: Response) => Promise<void> | void;
export type OnFetchChunk = (
  chunk: Uint8Array<ArrayBuffer>,
) => Promise<void> | void;
export type DefaultFetchCB = () => Promise<void> | void;

export interface FetchAssetOptions {
  onStart?: OnFetchStart;
  onChunk?: OnFetchChunk;
  onFinish?: DefaultFetchCB;
  onError?: DefaultFetchCB;
  onEnd?: DefaultFetchCB;
  method?: "GET" | "HEAD";
}
