import type { Database } from "better-sqlite3";

const kanjiDDL = `CREATE TABLE IF NOT EXISTS kanji(
  kanji_id INTEGER PRIMARY KEY AUTOINCREMENT,
  literal TEXT NOT NULL
);`;

const codepointDDL = `CREATE TABLE IF NOT EXISTS k_codepoint(
  cp_id INTEGER PRIMARY KEY AUTOINCREMENT,
  cp_value TEXT NOT NULL,
  cp_type TEXT NOT NULL,
  kanji_id INTEGER NOT NULL,
  FOREIGN KEY(kanji_id) REFERENCES kanji(kanji_id)
);`;

const radicalDDL = `CREATE TABLE IF NOT EXISTS k_radical(
  rad_id INTEGER PRIMARY KEY AUTOINCREMENT,
  rad_value INTEGER NOT NULL,
  rad_type TEXT NOT NULL,
  kanji_id INTEGER NOT NULL,
  FOREIGN KEY(kanji_id) REFERENCES kanji(kanji_id)
);`;

const dicRefDDL = `CREATE TABLE IF NOT EXISTS k_dic_ref(
  dr_id INTEGER PRIMARY KEY AUTOINCREMENT,
  dr_ref INTEGER NOT NULL,
  dr_type TEXT NOT NULL,
  m_vol INTEGER,
  m_page INTEGER,
  kanji_id INTEGER NOT NULL,
  FOREIGN KEY(kanji_id) REFERENCES kanji(kanji_id)
);`;

const queryCodeDDL = `CREATE TABLE IF NOT EXISTS k_query_code(
  q_id INTEGER PRIMARY KEY AUTOINCREMENT,
  q_code TEXT NOT NULL,
  q_type TEXT NOT NULL,
  skip_missclass TEXT,
  kanji_id INTEGER NOT NULL,
  FOREIGN KEY(kanji_id) REFERENCES kanji(kanji_id)
);`;

/* misc */

const miscDDL = `CREATE TABLE IF NOT EXISTS k_misc(
  misc_id INTEGER PRIMARY KEY AUTOINCREMENT,
  grade INTEGER,
  stroke_count TEXT NOT NULL,
  freq INTEGER,
  rad_name TEXT,
  jlpt INTEGER,
  kanji_id INTEGER NOT NULL,
  FOREIGN KEY(kanji_id) REFERENCES kanji(kanji_id)
);`;

const miscVariantDDL = `CREATE TABLE IF NOT EXISTS k_misc_variant(
  var_id INTEGER PRIMARY KEY AUTOINCREMENT,
  var_value TEXT NOT NULL,
  var_type TEXT NOT NULL,
  misc_id INTEGER,
  FOREIGN KEY(misc_id) REFERENCES k_misc(misc_id)
);`;

/* reading_meaning */

const readingMeaningDDL = `CREATE TABLE IF NOT EXISTS reading_meaning (
  rm_id INTEGER PRIMARY KEY AUTOINCREMENT,
  kanji_id INTEGER NOT NULL,
  FOREIGN KEY(kanji_id) REFERENCES kanji(kanji_id)
);`;

/* reading_meaning.rm_group */

const rmGroupDDL = `CREATE TABLE IF NOT EXISTS k_rm_group(
  rm_grp_id INTEGER PRIMARY KEY AUTOINCREMENT,
  nanori TEXT,
  rm_id INTEGER NOT NULL,
  FOREIGN KEY(rm_id) REFERENCES reading_meaning(rm_id)
);`;

const rmGroupReadingDDL = `CREATE TABLE IF NOT EXISTS k_rm_group_reading(
  r_id INTEGER PRIMARY KEY AUTOINCREMENT,
  r_value TEXT NOT NULL,
  r_type TEXT NOT NULL,
  rm_grp_id INTEGER NOT NULL,
  FOREIGN KEY(rm_grp_id) REFERENCES k_rm_group(rm_grp_id)
);`;

export default function setup(db: Database) {
  db.transaction(() => {
    db.exec(kanjiDDL);
    db.exec(codepointDDL);
    db.exec(radicalDDL);
    db.exec(dicRefDDL);
    db.exec(queryCodeDDL);
    /* misc */
    db.exec(miscDDL);
    db.exec(miscVariantDDL);
    /* reading_meaning */
    db.exec(readingMeaningDDL);
    db.exec(rmGroupDDL);
    db.exec(rmGroupReadingDDL);
  });
}
