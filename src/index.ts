import "dotenv/config";
import { LOG_OUTPUT } from "./ensure-local-assets/constants.js";
import ensureLocalAssets from "./ensure-local-assets/index.js";
import log from "./utils/logger/console.js";
import safeDeletion from "./utils/safe-deletion.js";

/*
@TODO
- try to make utility functions and classes the least project dependant,
  so they could be reusable if need be.

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
