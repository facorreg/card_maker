import dictionariesManifest from "../../dictionaries.manifest.json" with {
  type: "json",
};
import logger from "../utils/logger/console.js";
import runSteps from "../utils/run-steps/index.js";
import ELA_RunStepHandler from "./handlers/run-steps-handler.js";
import logSummary from "./log-summary.js";
import { MultiBar } from "./progress.js";
import type { Manifest } from "./types.js";
import { ELA_StepsCodes } from "./types.js";

const dataIsStep = (x: unknown): x is ELA_StepsCodes =>
  Object.values(ELA_StepsCodes).some((step) => step === x);

export default async function ensureLocalAssets(): Promise<void> {
  logger.info("Ensuring local assets' availability.\n");

  const multiBar = new MultiBar();
  multiBar.start();

  const handlers = new ELA_RunStepHandler(multiBar);

  await Promise.all(
    dictionariesManifest.map((manifest) => {
      handlers.init(manifest as Manifest);

      return runSteps(
        handlers.steps,
        ELA_StepsCodes.NO_ACTION,
        dataIsStep,
        handlers.methodsToOpts(),
      );
    }),
  );

  multiBar.stop();
  await logSummary();
}
