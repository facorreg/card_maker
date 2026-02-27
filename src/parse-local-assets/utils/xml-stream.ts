// import fs from "node:fs/promises"
import { createReadStream } from "node:fs";
import { XMLParser } from "fast-xml-parser";
import { ResultAsync } from "neverthrow";

interface XmlStreamOpts<T> {
  alwaysArray?: string[];
  onEntry: (entry: T) => void;
}

export default function xmlStream<T>(
  path: string,
  delimiter: string,
  opts?: XmlStreamOpts<T>,
): ResultAsync<void, Error> {
  const rs = createReadStream(path, { encoding: "utf8" });

  let chunks: string = "";

  const startDelimiter = `<${delimiter}>`;
  const endDelimiter = `</${delimiter}>`;

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    isArray: (name) => {
      return opts?.alwaysArray?.includes(name) || false;
    },
  });

  let entryStartIndex = -1;
  let entryEndIndex = -1;

  return ResultAsync.fromPromise(
    (async () => {
      for await (const chunk of rs) {
        chunks += chunk as string;

        while (true) {
          entryStartIndex =
            entryStartIndex === -1
              ? chunks.indexOf(startDelimiter)
              : entryStartIndex;
          entryEndIndex =
            entryStartIndex !== -1 && entryEndIndex === -1
              ? chunks.indexOf(endDelimiter)
              : entryEndIndex;

          if (entryEndIndex === -1) break;

          const entryStr = chunks
            .slice(0, entryEndIndex + endDelimiter.length)
            .slice(entryStartIndex);

          const entryXML = parser.parse(entryStr) as T;
          opts?.onEntry(entryXML);

          chunks = chunks.slice(entryEndIndex + endDelimiter.length);

          entryStartIndex = -1;
          entryEndIndex = -1;
        }
      }
    })(),
    (e) => e as Error,
  );
}
