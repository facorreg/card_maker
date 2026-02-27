import chalk from "chalk";

import cliProgress from "cli-progress";
import { err, ok, type Result } from "neverthrow";

function percentage(part: number, whole: number): number {
  if (whole === 0) return 0;

  return (part / whole) * 100;
}

type StatusStates = Record<string, Record<string, string>>;

function formatStatus(status?: string): string {
  return (status || "unknown").padEnd(13);
}
export class MultiBar<S extends StatusStates = StatusStates> {
  multiBar!: cliProgress.MultiBar;
  bars: cliProgress.SingleBar[] = [];
  statusStates!: S;

  constructor(statusStates: S) {
    this.statusStates = statusStates;
  }

  start = (): cliProgress.MultiBar => {
    this.multiBar = new cliProgress.MultiBar({
      format: `${"[{status}]"} | {bar} | {percentage}% | {fileName}`,
      barIncompleteChar: " ▁",
      barCompleteChar: "▂",
      hideCursor: true,
      autopadding: true,
    });

    return this.multiBar;
  };

  create = (
    fileName: string,
    state: string,
    contentLength?: number,
  ): Result<SingleBar, Error> => {
    if (!contentLength) return err(new Error("No content length"));

    const bar = this.multiBar.create(100, 0, {
      status: chalk.blue.bold(formatStatus(this.statusStates[state]?.start)),
      fileName,
    });

    this.bars.push(bar);

    return ok(
      new SingleBar(bar, this.statusStates[state] || {}, contentLength),
    );
  };

  stop = () => {
    this.multiBar.stop();
    console.log(""); //\n
  };
}

export class SingleBar {
  pb!: cliProgress.SingleBar;
  state: Record<string, string>;
  contentLength: number = 0;

  constructor(
    cb: cliProgress.SingleBar,
    state: Record<string, string>,
    contentLength: number,
  ) {
    this.pb = cb;
    this.state = state;
    this.contentLength = contentLength;
  }

  update = (downloaded: number, obj?: object): void => {
    this.pb?.update(percentage(downloaded, this.contentLength), obj);
  };

  success = (): void => {
    this.pb?.update({
      status: chalk.bold.green(formatStatus(this.state.success)),
    });
  };

  error = (): void => {
    this.pb?.update({
      status: chalk.bold.red(formatStatus(this.state.error)),
    });
  };

  stop = (): void => {
    this.pb?.stop();
  };
}
