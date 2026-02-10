import chalk, { type ChalkInstance } from "chalk";

type LogLevel = "log" | "info" | "warn" | "success" | "error";

type LogColor = {
  [K in LogLevel]: ChalkInstance;
};
const logColor: LogColor = {
  log: chalk.bold.white,
  info: chalk.bold.blue,
  success: chalk.bold.green,
  warn: chalk.bold.yellow,
  error: chalk.bold.red,
};

function logWrapper(logType: LogLevel) {
  return (...args: unknown[]) => {
    const coloredType = logColor[logType](`${logType.toLocaleUpperCase()}`);
    console[logType === "success" ? "info" : logType](
      `[${coloredType}]`,
      ...args,
    );
  };
}

const logger = {
  log: logWrapper("log"),
  info: logWrapper("info"),
  success: logWrapper("success"),
  warn: logWrapper("warn"),
  error: logWrapper("error"),
};

export default logger;
