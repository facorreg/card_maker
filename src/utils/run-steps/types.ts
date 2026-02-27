import type { ResultAsync } from "neverthrow";

export interface Step<C> {
  name: C;
  // biome-ignore lint/suspicious/noConfusingVoidType: <Pain in the ass, creates errors where void is perfectly fine>
  run: () => ResultAsync<C | void, Error>;
  cleanup?: () => ResultAsync<void, Error>;
  next?: C;
}

export interface RunStepsOpts<C> {
  onNoSteps: () => void;
  onSuccess: (step: Step<C>) => ResultAsync<void, Error>;
  onError: (step: Step<C>, stepName: C, err: Error) => ResultAsync<void, Error>;
}
