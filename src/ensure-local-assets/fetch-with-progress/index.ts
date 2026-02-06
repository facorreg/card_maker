import { once } from "node:events";
import fs from "node:fs";
import type { Manifest } from "../constants.js";
import type SingleBar from "../fetch-with-progress/progress.js";
import ErrorReporter from "./reporter.js";

export default async function fetchWithProgress(
  manifest: Manifest,
  filePath: string,
  progress: SingleBar,
): Promise<void> {
  const errorReporter = new ErrorReporter();

  const res = await fetch(manifest.url, {
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) return Promise.reject(errorReporter.invalidStatus(res.status));
  else if (!res.body) return Promise.reject(errorReporter.noBody());

  let downloaded = 0;
  const contentLength = Number(res.headers.get("content-length") ?? 0);
  const fileName = `${manifest.name}.${manifest.compressType}`;
  const file = fs.createWriteStream(filePath);

  progress.start(fileName, contentLength);

  try {
    for await (const chunk of res.body) {
      downloaded += chunk.length;
      progress.update(downloaded);

      if (!file.write(chunk)) {
        await once(file, "drain");
      }
    }

    file.end();
    await once(file, "finish");

    progress.success();
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    file.destroy(err);

    progress.error();

    return Promise.reject(errorReporter.error(err));
  } finally {
    progress.stop();
  }
}
