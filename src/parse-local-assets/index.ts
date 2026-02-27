import Database from "better-sqlite3";
import { errAsync, ResultAsync } from "neverthrow";
import { InterfaceError, InterfaceErrorCodes } from "#ELA/types.js";
import logger from "#logger/console.js";
import getParser from "#PLA_Parsers/index.js";
import getDictionariesManifest from "#utils/get-dictionaries-manifest.js";

export default function parseLocalAssets(): ResultAsync<void, Error> {
  const db = new Database("japanese_dictionaries.db", {});
  db.pragma("journal_mode = WAL");

  logger.info("Parsing local assets.\n");

  return getDictionariesManifest()
    .asyncAndThen((manifests) =>
      ResultAsync.fromPromise(
        (async () => {
          for await (const manifest of manifests) {
            const parser = getParser(manifest, db)[manifest.name];
            if (!parser) continue;

            await parser().orElse((error) => errAsync(error));
          }
        })(),
        (error) => new InterfaceError(InterfaceErrorCodes.RAW_ERROR, error),
      ),
    )
    .andThrough(() =>
      ResultAsync.fromPromise(Promise.resolve(db.close()), (e) =>
        e instanceof Error
          ? e
          : new InterfaceError(InterfaceErrorCodes.RAW_ERROR, e),
      ),
    );
}
