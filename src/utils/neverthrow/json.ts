import { Result } from "neverthrow";

export const safeJsonParse = Result.fromThrowable(
  (str: string) => JSON.parse(str),
  (e) => e as Error,
);
export default safeJsonParse;
