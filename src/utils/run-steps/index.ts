import { errAsync, okAsync, type ResultAsync } from "neverthrow";
import {
  ELA_ErrorHandled,
  InterfaceError,
  InterfaceErrorCodes,
} from "#ELA/types.js";
import type { Step } from "#utils/run-steps/types.js";
import type { RunStepsOpts } from "./types.js";

export default function runSteps<C>(
  steps: Step<C>[],
  noAction: C,
  dataIsStepCode: (x: unknown) => x is C,
  opts: RunStepsOpts<C>,
): ResultAsync<void, Error> {
  const [firstStep] = steps;
  // !steps.length would not work with firstStep.name
  if (!firstStep) {
    opts?.onNoSteps?.();
    return errAsync(
      new InterfaceError(InterfaceErrorCodes.EMPTY_MANIFEST, null),
    );
  }

  const runNext = (stepName: C): ResultAsync<void, Error> => {
    const step = steps.find((s) => s.name === stepName);
    if (!step) return okAsync(undefined);

    return step
      .run()
      .orElse((error) => {
        opts?.onError(step, stepName, error as Error);
        return errAsync(new ELA_ErrorHandled(error as Error));
      })
      .andThen((data) => {
        opts?.onSuccess(step);

        const nextStep = dataIsStepCode(data) ? data : (step.next ?? noAction);

        if (nextStep === noAction) {
          return okAsync(undefined);
        }

        return runNext(nextStep);
      });
  };

  return runNext(firstStep.name);
}
