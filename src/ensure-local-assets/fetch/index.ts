import { once } from "node:events";
import fs from "node:fs";
import type { AsyncNoThrow, Manifest } from "../constants.js";
import type { MultiBar } from "../progress/index.js";
import ErrorReporter from "./reporter.js";

export default async function fetchWithProgress(
  manifest: Manifest,
  filePath: string,
  multiBar: MultiBar,
): AsyncNoThrow<undefined> {
  const errorReporter = new ErrorReporter();

  const res = await fetch(manifest.url, {
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) return [errorReporter.invalidStatus(res.status)];
  else if (!res.body) return [errorReporter.noBody()];

  let downloaded = 0;
  const contentLength = Number(res.headers.get("content-length") ?? 0);
  const fileName = `${manifest.name}.${manifest.inputType}`;
  const file = fs.createWriteStream(filePath);

  const [error, progress] = await multiBar.create(
    fileName,
    "download",
    contentLength,
  );
  if (error) {
    /* handle */
  }

  try {
    for await (const chunk of res.body) {
      downloaded += chunk.length;
      progress?.update(downloaded);

      if (!file.write(chunk)) {
        await once(file, "drain");
      }
    }

    file.end();
    await once(file, "finish");

    progress?.success();
    return [null];
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    file.destroy(err);

    progress?.error();

    return [errorReporter.error(err)];
  } finally {
    progress?.stop();
  }
}
