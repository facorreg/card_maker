import chalk from "chalk";
import cliProgress, { MultiBar } from "cli-progress";

type DLStateForColoring = "start" | "success" | "error";
type DlStateColored = {
  [K in DLStateForColoring]: string;
};

/*
  @TODO
  -> implement yauzl and a transform for gunzip

  make dlStateColored an argument so that the content of the strings can
    be changed for ohter cases (eg: unzip)
*/

const dlStateColored: DlStateColored = {
  start: chalk.bold.blue("DOWNLOADING"),
  success: chalk.bold.green("DOWNLOADED"),
  error: chalk.bold.red("DOWNLOAD ERROR"),
};

function percentage(part: number, whole: number): number {
  if (whole === 0) return 0;

  return (part / whole) * 100;
}

export function initMultiBar(): MultiBar {
  return new MultiBar(
    {
      format: "[{status}]: {fileName} | {bar} | {percentage}%",
    },
    cliProgress.Presets.shades_classic,
  );
}

export default class SingleBar {
  multiBar!: MultiBar;
  pb: cliProgress.SingleBar | undefined;
  contentLength: number = 0;

  constructor(multiBar: MultiBar) {
    this.multiBar = multiBar;
  }

  start(fileName: string, contentLength: number) {
    if (!contentLength) return;
    this.contentLength = contentLength;

    this.pb = this.multiBar.create(100, 0, {
      status: dlStateColored.start,
      fileName,
    });
  }

  update(downloaded: number) {
    this.pb?.update(percentage(downloaded, this.contentLength));
  }

  success() {
    this.pb?.update({
      status: dlStateColored.success,
    });
  }

  error() {
    this.pb?.update({
      status: dlStateColored.error,
    });
  }

  stop() {
    this.pb?.stop();
  }
}
