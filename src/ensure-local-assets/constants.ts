import path from "node:path";
import getSubpath from "../utils/get-subpath.js";

export const LOG_OUTPUT = path.join(
  process.cwd(),
  process.env.LOGS_PATH || "logs/log_statuses.txt",
);

export const LOG_FOLDER_PATH = getSubpath(LOG_OUTPUT);
