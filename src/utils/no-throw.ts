export type NoThrow<T, E extends Error = Error> = [E | null, T?];
export type AsyncNoThrow<T, E extends Error = Error> = Promise<NoThrow<T, E>>;

export default function asyncNoThrow<
  E extends Error = Error,
  // biome-ignore lint/suspicious/noExplicitAny: <needed to make it generic>
  F extends (...args: any[]) => any = (...args: any[]) => any,
>(
  ft: F,
  err?: E,
): (...args: Parameters<F>) => AsyncNoThrow<Awaited<ReturnType<F>>, E> {
  return async (...args) => {
    try {
      const data = await ft(...args);
      return [null, data];
    } catch (e) {
      if (err) {
        err.cause = err.cause ?? e;
        return [err as E];
      }
      return [e as E];
    }
  };
}
