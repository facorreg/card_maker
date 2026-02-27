import type KanjidicXMLSchema from "#PLA_Parsers/kanjidic/types.js";

export const alwaysArray = [
  "cp_value",
  "rad_value",
  "stroke_count",
  "variant",
  "freq",
  "rad_name",
  "dic_ref",
  "q_code",
  "rmgroup",
  "nanori",
  "reading",
  "meaning",
];

let val = 0;

export default function parseKanji(entry: KanjidicXMLSchema) {
  console.log(entry);
  if (val > 2) process.exit(0);
  val++;
}
