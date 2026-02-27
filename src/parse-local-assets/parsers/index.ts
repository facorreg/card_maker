// import Database from "better-sqlite3";
import type { Database } from "better-sqlite3";
import type { ResultAsync } from "neverthrow";
import { buildPath } from "#ELA/utils/build-paths.js";
import setupKanjiDDL from "#PLA/ddl/kanji/index.js";
import type KanjidicXMLSchema from "#PLA_Parsers/kanjidic/types.js";
import xmlStream from "#PLA_Utils/xml-stream.js";
import type { Manifest } from "#src/types.js";
import parseKanji, { alwaysArray as AAKanjidic } from "./kanjidic/index.js";

export default function getParser(
  manifest: Manifest,
  db: Database,
): Record<string, () => ResultAsync<void, Error>> {
  const path = buildPath(manifest.name, manifest.outputType);

  return {
    kanjidic: () => {
      setupKanjiDDL(db);

      return xmlStream<KanjidicXMLSchema>(path, "character", {
        onEntry: parseKanji,
        alwaysArray: AAKanjidic,
      });
    },
  };
}
