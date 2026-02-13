import getSteps from "#ELA/get-steps.js";
import { ELA_StepsCodes } from "#ELA/types.js";
import logger from "#logger/console.js";
import reporter from "#logger/reporter.js";
import type { Manifest } from "#src/types.js";
import type { MultiBar } from "#utils/progress.js";
import type { RunStepsOpts, Step } from "#utils/run-steps/types.js";
export default class ELA_RunStepHandler {
  multiBar: MultiBar;
  fileName!: string;
  steps!: Step<ELA_StepsCodes>[];

  constructor(multiBar: MultiBar) {
    this.multiBar = multiBar;
  }

  async init(manifest: Manifest) {
    this.steps = getSteps(manifest, this.multiBar);
    this.fileName = `${manifest.name}.${manifest.inputType}`;
  }

  onNoSteps() {
    logger.error("ELA: No state machine step found");
  }

  async onSuccess(step: Step<ELA_StepsCodes>): Promise<void> {
    if (
      step.name !== ELA_StepsCodes.NOT_STARTED &&
      step.name !== ELA_StepsCodes.NO_ACTION
    ) {
      await reporter({
        code: step.name,
        file: this.fileName,
      });
    }
  }

  async onError(
    step: Step<ELA_StepsCodes>,
    stepName: ELA_StepsCodes,
    err: Error,
  ): Promise<void> {
    await reporter({
      errCode: err.message,
      file: this.fileName,
      error: err,
    });

    switch (process.env.ELA_ERROR_CLEANUP) {
      case "none":
        return;
      case "clean_step":
        await step?.cleanup?.();
        break;
      case "clean_all": {
        let index = this.steps.findIndex(({ name }) => stepName === name);
        while (index >= 0) {
          await this.steps[index]?.cleanup?.();
          index--;
        }
        break;
      }
      default:
        return;
    }
  }

  methodsToOpts = (): RunStepsOpts<ELA_StepsCodes> => ({
    onNoSteps: this.onNoSteps,
    onSuccess: this.onSuccess,
    onError: this.onError,
  });
}
