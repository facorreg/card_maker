import { ResultAsync } from "neverthrow";
import ELA_RunStepHandler from "#ELA/handlers/run-step-handler.js";
import logSummary from "#ELA_Utils/log-summary.js";
import logger from "#logger/console.js";
import type { Manifest } from "#src/types.js";
import getDictionariesManifest from "#utils/get-dictionaries-manifest.js";
import { MultiBar } from "#utils/progress.js";
import runSteps from "#utils/run-steps/index.js";
import { ELA_STATUS_STATES } from "./constants.js";
import {
  ELA_Error,
  ELA_StepsCodes,
  InterfaceError,
  InterfaceErrorCodes,
} from "./types.js";

const dataIsStepCode = (x: unknown): x is ELA_StepsCodes =>
  Object.values(ELA_StepsCodes).some((step) => step === x);

const onManifests = (
  manifests: Manifest[],
  handlers: ELA_RunStepHandler,
): ResultAsync<void, Error> =>
  ResultAsync.combine(
    manifests.map((manifest) => {
      handlers.init(manifest as Manifest);

      return runSteps(
        handlers.steps,
        ELA_StepsCodes.NO_ACTION,
        dataIsStepCode,
        handlers.methodsToOpts(),
      );
    }),
  ).map(() => undefined);

export default function ensureLocalAssets() {
  logger.info("Ensuring local assets' availability.\n");
  const multiBar = new MultiBar(ELA_STATUS_STATES);
  multiBar.start();

  const handlers = new ELA_RunStepHandler(multiBar);

  const onFinally = () => {
    multiBar.stop();
    logSummary();
  };

  return getDictionariesManifest()
    .asyncAndThen((manifests) =>
      ResultAsync.fromPromise(onManifests(manifests, handlers), (e) =>
        e instanceof ELA_Error
          ? e
          : new InterfaceError(InterfaceErrorCodes.RAW_ERROR, e),
      ),
    )
    .andTee(onFinally)
    .orTee(onFinally);
}
