import dictionariesManifest from "../../dictionaries.manifest.json" with {
  type: "json",
};
import type { Manifest } from "./constants.js";
import { STEPS } from "./constants.js";
import getSteps, { type Step } from "./get-steps.js";
import { MultiBar } from "./progress/index.js";

async function runSteps(manifest: Manifest, multiBar: MultiBar) {
  const steps: Step[] = getSteps(manifest, multiBar);

  let stepName: STEPS = STEPS.NOT_STARTED;

  for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
    const step = steps[stepIndex];

    if (!step) break; // should not happen
    if (stepName !== step.name) continue;
    const [err, data] = await step.run();

    if (err) {
      // reporter.errorCleanup();
      let index = steps.findIndex(({ name }) => stepName === name);
      while (index >= 0) {
        await steps[index]?.cleanup?.();
        index--;
      }
      // reporter.error(manifest, err);

      return [err];
    }

    const dataIsStep = Object.values(STEPS).some((step) => step === data);
    stepName = dataIsStep ? (data as STEPS) : (step.next ?? STEPS.NO_ACTION);
  }
}

export default async function ensureLocalAssets(): Promise<void> {
  const multiBar = new MultiBar();
  multiBar.start();

  await Promise.all(
    dictionariesManifest.map((manifest) =>
      runSteps(manifest as Manifest, multiBar),
    ),
  );

  multiBar.multiBar.stop();
}
