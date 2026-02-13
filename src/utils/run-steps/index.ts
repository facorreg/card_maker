import type { Step } from "#utils/run-steps/types.js";
import type { RunStepsOpts } from "./types.js";

export default async function runSteps<C>(
  steps: Step<C>[],
  noAction: C,
  dataIsStepCode: (x: unknown) => x is C,
  opts: RunStepsOpts<C>,
) {
  // !steps.length would not work with steps[0].name
  if (!steps[0]) {
    await opts?.onNoSteps?.();
    return;
  }

  let stepName = steps[0].name;

  for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
    const step = steps[stepIndex];

    if (!step) break; // should not happen
    if (stepName !== step.name) continue;

    const [err, data] = await step.run();

    if (err !== null) {
      await opts?.onError(step, stepName, err);
      return;
    }

    await opts?.onSuccess?.(step);

    const dataIsStep = dataIsStepCode(data);

    stepName = dataIsStep ? data : (step.next ?? noAction);
  }
}
