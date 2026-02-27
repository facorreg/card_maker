import { ResultAsync } from "neverthrow";

const asyncResultWrapper =
  <
    // biome-ignore lint/suspicious/noExplicitAny: <any needed>
    F extends (...args: any[]) => Promise<any>,
  >(
    ft: F,
  ) =>
  (...args: Parameters<F>): ResultAsync<Awaited<ReturnType<F>>, Error> =>
    ResultAsync.fromPromise(ft(...args), (e) =>
      e instanceof Error ? e : new Error(String(e)),
    );

export default asyncResultWrapper;
