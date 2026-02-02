import chalk from "chalk";
import cliProgress from "cli-progress";

type DLStateForColoring = "start" | "success" | "error";
type DlStateColored = {
  [K in DLStateForColoring]: string;
};

const dlStateColored: DlStateColored = {
  start: chalk.bold.blue("DOWNLOADING"),
  success: chalk.bold.green("DOWNLOADED"),
  error: chalk.bold.red("DOWNLOAD ERROR"),
};

export default class Progress {
  pb: cliProgress.SingleBar | undefined;

  start(fileName: string, contentLength: number) {
    if (!contentLength) return;

    this.pb = new cliProgress.SingleBar(
      {
        format: "[{status}]: {fileName} | {bar} | {percentage}%",
      },
      cliProgress.Presets.shades_classic,
    );

    this.pb.start(contentLength, 0, {
      status: dlStateColored.start,
      fileName,
    });
  }

  update(downloaded: number) {
    this.pb?.update(downloaded);
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
