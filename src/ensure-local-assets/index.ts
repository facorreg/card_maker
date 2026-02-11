import dictionariesManifest from "../../dictionaries.manifest.json" with {
  type: "json",
};
import logger from "../utils/logger/console.js";
import fileLogger from "../utils/logger/file.js";
import getSteps, { type Step } from "./get-steps.js";
import logSummary from "./log-summary.js";
import { MultiBar } from "./progress.js";
import type { Manifest } from "./types.js";
import { STEPS } from "./types.js";

async function runSteps(manifest: Manifest, multiBar: MultiBar) {
  const steps: Step[] = getSteps(manifest, multiBar);
  let stepName: STEPS = STEPS.NOT_STARTED;

  for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
    const step = steps[stepIndex];

    if (!step) break; // should not happen
    if (stepName !== step.name) continue;

    if (step.name !== STEPS.NOT_STARTED && step.name !== STEPS.NO_ACTION) {
      await fileLogger({
        code: step.name,
        file: manifest.name,
      });
    }

    const [err, data] = await step.run();

    if (err) {
      let index = steps.findIndex(({ name }) => stepName === name);
      while (index >= 0) {
        await steps[index]?.cleanup?.();
        index--;
      }
      await fileLogger({
        errCode: err.message,
        file: manifest.name,
        error: err,
      });
    }

    const dataIsStep = Object.values(STEPS).some((step) => step === data);
    stepName = dataIsStep ? (data as STEPS) : (step.next ?? STEPS.NO_ACTION);
  }
}

export default async function ensureLocalAssets(): Promise<void> {
  logger.info("Ensuring local assets' availability.\n");

  const multiBar = new MultiBar();
  multiBar.start();

  await Promise.all(
    dictionariesManifest.map((manifest) =>
      runSteps(manifest as Manifest, multiBar),
    ),
  );

  multiBar.stop();
  await logSummary();
}
