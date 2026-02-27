import { okAsync, type ResultAsync } from "neverthrow";
import getSteps from "#ELA/get-steps.js";
import { ELA_StepsCodes } from "#ELA/types.js";
import logger from "#logger/console.js";
import reporter from "#logger/reporter.js";
import type { PLA_STATUS_STATES } from "#src/parse-local-assets/constants.js";
import type { Manifest } from "#src/types.js";
import type { MultiBar } from "#utils/progress.js";
import type { RunStepsOpts, Step } from "#utils/run-steps/types.js";

export default class ELA_RunStepHandler {
  multiBar: MultiBar<typeof PLA_STATUS_STATES>;
  fileName!: string;
  steps!: Step<ELA_StepsCodes>[];

  constructor(multiBar: MultiBar<typeof PLA_STATUS_STATES>) {
    this.multiBar = multiBar;
  }

  init = (manifest: Manifest) => {
    this.steps = getSteps(manifest, this.multiBar);
    this.fileName = `${manifest.name}.${manifest.compressedType}`;
  };

  onNoSteps = () => {
    logger.error("ELA: No state machine step found");
  };

  onSuccess = (step: Step<ELA_StepsCodes>): ResultAsync<void, Error> => {
    if (
      step.name !== ELA_StepsCodes.NOT_STARTED &&
      step.name !== ELA_StepsCodes.NO_ACTION
    ) {
      return reporter({
        successCode: step.name,
        file: this.fileName,
      });
    }

    return okAsync();
  };

  onError(
    step: Step<ELA_StepsCodes>,
    stepName: ELA_StepsCodes,
    // error: Error,
  ): ResultAsync<void, Error> {
    const onCleanupError = (cleanupError: Error) => {
      return reporter({
        error: cleanupError,
        file: this.fileName,
      })
        .mapErr(() => undefined)
        .orElse(() => okAsync(undefined));
    };

    switch (process.env.ELA_ERROR_CLEANUP) {
      case "none":
        break;
      case "clean_step":
        if (!step?.cleanup) break;
        return step.cleanup().orElse(onCleanupError);
      case "clean_all": {
        let index = this.steps.findIndex(({ name }) => stepName === name);
        let chain: ResultAsync<void, Error> = okAsync(undefined);

        while (index >= 0) {
          const step = this.steps[index];
          if (step?.cleanup) {
            const cleanup = step.cleanup;
            chain = chain.andThen(() => cleanup().orElse(onCleanupError));
          }

          index--;
        }

        return chain;
      }
      default:
        break;
    }

    return okAsync();
  }

  methodsToOpts = (): RunStepsOpts<ELA_StepsCodes> => ({
    onNoSteps: this.onNoSteps,
    onSuccess: this.onSuccess,
    onError: this.onError,
  });
}
