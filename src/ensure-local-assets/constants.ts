import path from "node:path";

export const LOG_OUTPUT = path.join(
  process.cwd(),
  process.env.LOGS_PATH || "logs/log_statuses.txt",
);

export const LOG_FOLDER_PATH = path.dirname(LOG_OUTPUT);

// MultiBar

type ELA_States = "download" | "decompress";
type ELA_Status = "start" | "success" | "error";

export type ELA_StatusStates = {
  [S in ELA_States]: {
    [C in ELA_Status]: string;
  };
};

export const ELA_STATUS_STATES: ELA_StatusStates = {
  download: {
    start: "DOWNLOADING",
    success: "DOWNLOADED",
    error: "DOWNLOAD FAILED",
  },
  decompress: {
    start: "DECOMPRESSING",
    success: "DECOMPRESSED",
    error: "DECOMPRESSION FAILED",
  },
};
