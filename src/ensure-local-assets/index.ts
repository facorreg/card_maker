import dictionariesManifest from "../../dictionaries.manifest.json" with {
  type: "json",
};
import type { Manifest } from "./constants.js";
import { STEPS } from "./constants.js";
import type { AssetError } from "./errors.js";
import getSteps, { type Step } from "./get-steps.js";
import StepsReporter from "./reporter.js";

async function runSteps(manifest: Manifest): Promise<void> {
  const reporter = new StepsReporter(manifest);
  const steps: Step[] = getSteps(manifest, reporter);

  let stepName: STEPS = STEPS.NOT_STARTED;

  try {
    for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
      const step = steps[stepIndex];
      if (!step) break; // should not happen
      if (stepName !== step.name) continue;
      stepName = (await step.run()) ?? step.next ?? STEPS.NO_ACTION;
    }
  } catch (e) {
    const err = e as NodeJS.ErrnoException | AssetError;

    reporter.errorCleanup();
    let index = steps.findIndex(({ name }) => stepName === name);
    while (index >= 0) {
      await steps[index]?.cleanup?.();
      index--;
    }
    reporter.error(manifest, err);

    return;
  }
}

export default async function ensureLocalAssets(): Promise<void> {
  for (const manifest of dictionariesManifest as Manifest[]) {
    await runSteps(manifest);
  }
}
