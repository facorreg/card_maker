export type NoThrow<T, E extends Error = NodeJS.ErrnoException> = [
  E | null,
  T?,
];
export type AsyncNoThrow<T, E extends Error = NodeJS.ErrnoException> = Promise<
  NoThrow<T, E>
>;

export default function asyncNoThrow<
  // biome-ignore lint/suspicious/noExplicitAny: <needed to make it generic>
  F extends (...args: any[]) => any,
  E extends Error,
>(
  ft: F,
  err?: E,
): (...args: Parameters<F>) => AsyncNoThrow<Awaited<ReturnType<F>>> {
  return async (...args) => {
    try {
      const data = await ft(...args);
      return [null, data];
    } catch (e) {
      if (err) {
        err.cause = err.cause ?? e;
        return [err];
      }
      return [e as NodeJS.ErrnoException];
    }
  };
}
