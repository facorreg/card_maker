// interface WithText<T: string | number = string> {
//   "#text":
// }

interface WithText<T = string> {
  "#text": T;
}

interface CodePointValue extends WithText {
  cp_type: "jis208" | "jis212" | "jis213" | "ucs";
}

interface RadicalValue extends WithText<number> {
  rad_type: "classical" | "nelson_c";
}

interface Variant extends WithText {
  var_type:
    | "jis208"
    | "jis212"
    | "jis213"
    | "deroo"
    | "njecd"
    | "s_h"
    | "nelson_c"
    | "oneill"
    | "ucs";
}

interface DicRef extends WithText<number> {
  dr_type:
    | "nelson_c"
    | "nelson_n"
    | "halpern_njecd"
    | "halpern_kkd"
    | "halpern_kkld"
    | "halpern_kkld_2ed"
    | "heisig"
    | "heisig6"
    | "gakken"
    | "oneill_names"
    | "oneill_kk"
    | "moro"
    | "henshall"
    | "sh_kk"
    | "sh_kk2"
    | "sakade"
    | "jf_cards"
    | "henshall3"
    | "tutt_cards"
    | "kanji_in_context"
    | "kodansha_compact"
    | "maniette";
  m_vol?: number;
  m_page?: number;
}

interface QCode extends WithText<string | number> {
  qc_type:
    | "skip"
    | "skip_misclass"
    | "sh_desc"
    | "four_corner"
    | "deroo"
    | "misclass";
  skip_misclass?: "posn" | "stroke_count" | "stroke_and_posn" | "stroke_diff";
}

interface Reading extends WithText {
  r_type: "pinyin" | "korean_r" | "korean_h" | "ja_on" | "ja_kun";
}

interface Meaning extends WithText {
  m_lang?: string;
}

interface RmGroup {
  reading?: Reading[];
  // en as string
  meaning?: (string | Meaning)[];
}

interface Misc {
  grade?: number;
  stroke_count: number[];
  variant?: Variant[];
  freq?: number;
  rad_name?: string[];
  jlpt?: number;
}

export default interface KanjidicXMLSchema {
  literal: string;
  codepoint: { cp_value: CodePointValue[] };
  radical: { rad_value: RadicalValue[] };
  misc: Misc;
  dic_number?: {
    dic_ref: DicRef[];
  };
  query_code?: {
    q_code: QCode[];
  };
  reading_meaning?: {
    rm_group: RmGroup[];
    nanori?: WithText[];
  };
}
