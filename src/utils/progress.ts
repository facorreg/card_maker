import chalk from "chalk";

import cliProgress from "cli-progress";
import type { NoThrow } from "#utils/no-throw.js";

type Status = "start" | "success" | "error";
type States = "download" | "uncompress";

type StatusStates = {
  [K in States]: {
    [C in Status]: string;
  };
};

const statusStates: StatusStates = {
  download: {
    start: "DOWNLOADING",
    success: "DOWNLOADED",
    error: "DOWNLOAD FAILED",
  },
  uncompress: {
    start: "UNCOMPRESSING",
    success: "UNCOMPRESSED",
    error: "DECOMPRESSION FAILED",
  },
};

function getStatusState(state: States, status: Status) {
  const string = statusStates[state][status].padEnd(13);

  return string;
}

function percentage(part: number, whole: number): number {
  if (whole === 0) return 0;

  return (part / whole) * 100;
}

export class MultiBar {
  multiBar!: cliProgress.MultiBar;
  bars: cliProgress.SingleBar[] = [];

  start(): cliProgress.MultiBar {
    this.multiBar = new cliProgress.MultiBar({
      format: `${"[{status}]"} | {bar} | {percentage}% | {fileName}`,
      barIncompleteChar: " ▁",
      barCompleteChar: "▂",
      hideCursor: true,
      autopadding: true,
    });

    return this.multiBar;
  }

  create(
    fileName: string,
    state: States,
    contentLength?: number,
  ): NoThrow<SingleBar> {
    if (!contentLength) return [new Error("No content length")];

    const bar = this.multiBar.create(100, 0, {
      status: chalk.blue.bold(getStatusState(state, "start")),
      fileName,
    });

    this.bars.push(bar);

    return [null, new SingleBar(bar, state, contentLength)];
  }

  stop() {
    this.multiBar.stop();
    console.log(""); //\n
  }
}

export class SingleBar {
  pb!: cliProgress.SingleBar;
  state!: States;
  contentLength: number = 0;

  constructor(cb: cliProgress.SingleBar, state: States, contentLength: number) {
    this.pb = cb;
    this.state = state;
    this.contentLength = contentLength;
  }

  update(downloaded: number, obj?: object): void {
    this.pb?.update(percentage(downloaded, this.contentLength), obj);
  }

  success(): void {
    this.pb?.update({
      status: chalk.bold.green(getStatusState(this.state, "success")),
    });
  }

  error(): void {
    this.pb?.update({
      status: chalk.bold.red(getStatusState(this.state, "error")),
    });
  }

  stop(): void {
    this.pb?.stop();
  }
}
