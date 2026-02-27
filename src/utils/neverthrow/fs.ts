import { readFileSync } from "fs";

import { Result } from "neverthrow";

export const readUtf8File = Result.fromThrowable(
  (path: string) => readFileSync(path, "utf8"),
  (e) => e as Error,
);
