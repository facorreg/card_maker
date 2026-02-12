import path from "node:path";

export const LOG_OUTPUT = path.join(
  process.cwd(),
  process.env.LOGS_PATH || "logs/log_statuses.txt",
);

export const LOG_FOLDER_PATH = path.dirname(LOG_OUTPUT);
