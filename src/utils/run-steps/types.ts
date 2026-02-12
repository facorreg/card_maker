import type { AsyncNoThrow } from "#utils/no-throw.js";

export interface Step<C> {
  name: C;
  run: () => AsyncNoThrow<C> | AsyncNoThrow<void>;
  cleanup?: () => AsyncNoThrow<void>;
  next?: C;
}

export interface RunStepsOpts<C> {
  onNoSteps: () => Promise<void> | void;
  onSuccess: (step: Step<C>) => Promise<void> | void;
  onError: (step: Step<C>, stepName: C, err: Error) => Promise<void> | void;
}
