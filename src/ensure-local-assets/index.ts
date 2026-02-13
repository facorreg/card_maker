import ELA_RunStepHandler from "#ELA/handlers/run-step-handler.js";
import logSummary from "#ELA_Utils/log-summary.js";
import logger from "#logger/console.js";
import type { Manifest } from "#src/types.js";
import getDictionariesManifest from "#utils/get-dictionaries-manifest.js";
import { MultiBar } from "#utils/progress.js";
import runSteps from "#utils/run-steps/index.js";
import { ELA_STATUS_STATES } from "./constants.js";
import { ELA_StepsCodes } from "./types.js";

const dataIsStepCode = (x: unknown): x is ELA_StepsCodes =>
  Object.values(ELA_StepsCodes).some((step) => step === x);

export default async function ensureLocalAssets(): Promise<void> {
  logger.info("Ensuring local assets' availability.\n");
  const dictionariesManifest = getDictionariesManifest();
  if (dictionariesManifest === null) {
    logger.error("No dictionary manifest found");
    return;
  }

  const multiBar = new MultiBar(ELA_STATUS_STATES);
  multiBar.start();

  const handlers = new ELA_RunStepHandler(multiBar);

  await Promise.all(
    dictionariesManifest.map((manifest) => {
      handlers.init(manifest as Manifest);

      return runSteps(
        handlers.steps,
        ELA_StepsCodes.NO_ACTION,
        dataIsStepCode,
        handlers.methodsToOpts(),
      );
    }),
  );

  multiBar.stop();
  await logSummary();
}
