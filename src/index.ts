import "dotenv/config";
import { LOG_OUTPUT } from "#ELA/constants.js";
import ensureLocalAssets from "#ELA/index.js";
import log from "#logger/console.js";
import safeDeletion from "#utils/safe-deletion.js";

/*
@TODO
- Actual parsing
  - kanjidic first
  - jmdic

- Anki deck card creation
*/

(async () => {
  try {
    await safeDeletion(LOG_OUTPUT, false);
    await ensureLocalAssets();
  } catch (err) {
    log.error("Uncaught error");
    log.error(JSON.stringify(err, null, 2));
  }
})();
