import ensureLocalAssets from "./ensure-local-assets/index.js";

(async () => {
  try {
    await ensureLocalAssets();
  } catch (e) {
    console.log(`Uncaught error: ${e}`);
  }
})();
