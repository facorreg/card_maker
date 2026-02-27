import "dotenv/config";
import { errAsync, okAsync } from "neverthrow";
import { LOG_OUTPUT } from "#ELA/constants.js";
import ensureLocalAssets from "#ELA/index.js";
import logger from "#logger/console.js";
import parseLocalAssets from "#PLA/index.js";
import { safeUnlink } from "#utils/neverthrow/promises/fs.js";

// import safeDeletion from "#utils/safe-deletion.js";

/*
@TODO
- Actual parsing
  - kanjidic first
  - jmdic

- Anki deck card creation
*/

(() => {
  safeUnlink(LOG_OUTPUT)
    .orElse((error: NodeJS.ErrnoException) =>
      error.code === "ENOENT" ? okAsync() : errAsync(),
    )
    .andThen(ensureLocalAssets)
    .andThen(parseLocalAssets)
    .orTee((error) => {
      logger.error(error);
    });

  // if (result.isErr()) return;
  // await parseLocalAssets();
  // } catch (err) {
  //   log.error("Uncaught error");
  //   log.error(JSON.stringify(err, null, 2));
  // }
})();
